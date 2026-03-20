import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { QuizAttempt } from "../types";

export function useAttempts() {
  return useQuery({
    queryKey: ["attempts"],
    queryFn: () => api.get<{ attempts: QuizAttempt[] }>("/attempts"),
  });
}

export function useAttempt(id: string) {
  return useQuery({
    queryKey: ["attempts", id],
    queryFn: () => api.get<{ attempt: QuizAttempt }>(`/attempts/${id}`),
    enabled: !!id,
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      answers,
    }: {
      quizId: string;
      answers: Record<string, string[]>;
    }) => api.post<{ attempt: QuizAttempt }>(`/quizzes/${quizId}/attempts`, { answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attempts"] });
    },
  });
}
