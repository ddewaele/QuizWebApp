import Anthropic from "@anthropic-ai/sdk";

export interface ChatOption {
  text: string;
  is_true: boolean;
  explanation: string;
}

export interface ChatQuestionContext {
  questionText: string;
  options: Record<string, ChatOption>;
  correctAnswer: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(ctx: ChatQuestionContext): string {
  const optionLines = Object.entries(ctx.options)
    .map(([key, opt]) => {
      const correct = ctx.correctAnswer.includes(key);
      return `  ${key.toUpperCase()}. ${opt.text}\n     Correct: ${correct ? "Yes" : "No"}\n     Explanation: ${opt.explanation}`;
    })
    .join("\n");

  const correctLabels = ctx.correctAnswer
    .map((k) => `${k.toUpperCase()}. ${ctx.options[k]?.text ?? k}`)
    .join(", ");

  return `You are a helpful study assistant. The user is working through a quiz question and wants to discuss it with you.

## Question
${ctx.questionText}

## Options
${optionLines}

## Correct Answer
${correctLabels}

Help the user understand the question deeply. You can:
- Explain why the correct answer is right
- Explain why the wrong answers are wrong
- Provide real-world context or analogies
- Answer follow-up questions about the topic
- Suggest related concepts to study

Be concise but thorough. Use markdown formatting where it aids clarity.`;
}

export class ChatService {
  private client: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async suggestQuestions(context: ChatQuestionContext): Promise<string[]> {
    const optionSummary = Object.entries(context.options)
      .map(([k, o]) => `${k.toUpperCase()}. ${o.text}`)
      .join("; ");

    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system:
        "You are a study assistant. Given a quiz question and its options, generate exactly 4 short follow-up questions a student might want to ask to better understand the topic. Output ONLY a JSON array of 4 strings. No markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Question: ${context.questionText}\nOptions: ${optionSummary}\nCorrect answer(s): ${context.correctAnswer.join(", ")}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "[]";
    try {
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim());
      return Array.isArray(parsed) ? (parsed as string[]).slice(0, 4) : [];
    } catch {
      return [];
    }
  }

  async *streamReply(
    context: ChatQuestionContext,
    messages: ChatMessage[],
  ): AsyncGenerator<string> {
    const stream = this.client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: buildSystemPrompt(context),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
