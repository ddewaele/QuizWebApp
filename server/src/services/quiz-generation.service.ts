import Anthropic from "@anthropic-ai/sdk";
import type { CreateQuizInput } from "../schemas/quiz.schema.js";

type QuestionData = CreateQuizInput["questions"][number];

const SYSTEM_PROMPT = `You are a quiz question generator. Given a quiz title, optional description, and user instructions, generate well-crafted quiz questions.

Output ONLY a valid JSON array of question objects. No markdown fences, no explanation text — just the raw JSON array.

Each question object must follow this exact structure:
{
  "questionId": <integer starting at 1>,
  "questionText": "<the question text>",
  "options": {
    "a": { "text": "<option text>", "is_true": <boolean>, "explanation": "<why this option is correct or incorrect>" },
    "b": { "text": "<option text>", "is_true": <boolean>, "explanation": "<why this option is correct or incorrect>" },
    "c": { "text": "<option text>", "is_true": <boolean>, "explanation": "<why this option is correct or incorrect>" },
    "d": { "text": "<option text>", "is_true": <boolean>, "explanation": "<why this option is correct or incorrect>" }
  },
  "correctAnswer": ["<key of correct option>"]
}

Rules:
- correctAnswer is always a string array, e.g. ["b"] for single-select or ["a","c"] for multiple-select
- is_true on each option must exactly match the correctAnswer array (true only if the key appears in correctAnswer)
- Every option must have a non-empty explanation
- Use exactly 4 options (a, b, c, d) unless the question type naturally suits fewer
- For multiple-select questions, correctAnswer may contain 2 or more keys
- Generate exactly the number of questions the user requested, defaulting to 5 if not specified
- Never include trailing commas or comments in the JSON`;

const SUGGEST_CHIPS_PROMPT = `You are helping a user craft a prompt for an AI quiz generator. Given a quiz title and optional description, generate 8–10 short, specific prompt additions tailored to that topic.

Output ONLY a valid JSON array of strings. No markdown, no explanation — just the array.

Each string must be a short phrase (4–8 words) that can be appended to a quiz generation prompt to make it more specific and useful.

Rules:
- Make every suggestion specific to the topic — never generic phrases like "make it interesting" or "good questions"
- Cover a variety of angles: specific subtopics, common misconceptions, real-world scenarios, edge cases, terminology, best practices
- Keep each phrase concise and actionable
- Do not include quantity or difficulty suggestions (those are handled separately)`;

export interface GenerateQuizInput {
  title: string;
  description?: string;
  prompt: string;
}

export interface SuggestChipsInput {
  title: string;
  description?: string;
}

function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers the model sometimes adds
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

export class QuizGenerationService {
  private client: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async suggestChips(input: SuggestChipsInput): Promise<string[]> {
    const userMessage = [
      `Quiz title: ${input.title}`,
      input.description ? `Quiz description: ${input.description}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SUGGEST_CHIPS_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripMarkdownFences(text));
    } catch {
      throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not a JSON array");
    }

    return parsed as string[];
  }

  private buildUserMessage(input: GenerateQuizInput): string {
    return [
      `Quiz title: ${input.title}`,
      input.description ? `Quiz description: ${input.description}` : null,
      ``,
      `Instructions: ${input.prompt}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private parseQuestions(text: string): QuestionData[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripMarkdownFences(text));
    } catch {
      throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not a JSON array");
    }
    return parsed as QuestionData[];
  }

  async *generateStream(input: GenerateQuizInput): AsyncGenerator<
    | { type: "status"; message: string }
    | { type: "done"; questions: QuestionData[] }
    | { type: "error"; message: string }
  > {
    yield { type: "status", message: "Analyzing your quiz topic…" };

    const userMessage = this.buildUserMessage(input);
    let fullText = "";
    let lastQuestionCount = 0;

    const stream = this.client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        const count = (fullText.match(/"questionId"/g) ?? []).length;
        if (count > lastQuestionCount) {
          lastQuestionCount = count;
          yield { type: "status", message: `Writing question ${count}…` };
        }
      }
    }

    yield { type: "status", message: "Validating questions…" };
    const questions = this.parseQuestions(fullText);
    yield { type: "done", questions };
  }
}
