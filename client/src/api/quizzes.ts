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

export function useImportQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      api.post<{ quiz: Quiz }>("/quizzes/import", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}
