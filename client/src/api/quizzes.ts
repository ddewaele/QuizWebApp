import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Quiz } from "../types";

export function useQuizzes() {
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: () => api.get<{ quizzes: Quiz[] }>("/quizzes"),
  });
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ["quizzes", id],
    queryFn: () => api.get<{ quiz: Quiz }>(`/quizzes/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; questions: unknown[] }) =>
      api.post<{ quiz: Quiz }>("/quizzes", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string | null; questions?: unknown[] }) =>
      api.put<{ quiz: Quiz }>(`/quizzes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["quizzes", variables.id] });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/quizzes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useSuggestChips() {
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      api.post<{ chips: string[] }>("/quizzes/suggest-chips", data),
  });
}

export async function streamGenerateQuiz(
  data: { title: string; description?: string; prompt: string },
  onStatus: (message: string) => void,
  onDone: (questions: unknown[]) => void,
  onError: (message: string) => void,
) {
  const response = await fetch("/api/quizzes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok || !response.body) {
    onError("Failed to connect to the generation service.");
    return;
  }

  const reader = response.body.getReader();
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
      try {
        const event = JSON.parse(line.slice(6)) as {
          type: "status" | "done" | "error";
          message?: string;
          questions?: unknown[];
        };
        if (event.type === "status" && event.message) onStatus(event.message);
        else if (event.type === "done" && event.questions) onDone(event.questions);
        else if (event.type === "error" && event.message) onError(event.message);
      } catch {
        // malformed event — skip
      }
    }
  }
}

export function useImportQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string }) =>
      api.post<{ quiz: Quiz }>("/quizzes/import", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export interface BatchImportResult {
  fileName: string;
  success: boolean;
  quiz?: { id: string; title: string; _count: { questions: number } };
  error?: string;
  details?: { errors?: { path: string; message: string }[] };
}

export function useImportQuizBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { files: { content: string; fileName: string }[] }) =>
      api.post<{ results: BatchImportResult[] }>("/quizzes/import/batch", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}
