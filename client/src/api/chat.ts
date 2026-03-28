import type { QuizQuestion } from "../types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildContext(question: QuizQuestion) {
  return {
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
  };
}

export async function fetchSuggestions(question: QuizQuestion): Promise<string[]> {
  const res = await fetch("/api/chat/suggestions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildContext(question)),
  });
  if (!res.ok) return [];
  const data = await res.json() as { suggestions?: string[] };
  return data.suggestions ?? [];
}

export async function streamChatReply(
  question: QuizQuestion,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat/question", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: buildContext(question), messages }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? "Chat request failed");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;

      let event: { text?: string; done?: boolean; error?: string };
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      if (event.error) throw new Error(event.error);
      if (event.text) onChunk(event.text);
      if (event.done) return;
    }
  }
}
