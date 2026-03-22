import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { QuizShare, SharedQuiz } from "../types";

export function useQuizShares(quizId: string) {
  return useQuery({
    queryKey: ["quizShares", quizId],
    queryFn: () => api.get<{ shares: QuizShare[] }>(`/quizzes/${quizId}/shares`),
    enabled: !!quizId,
  });
}

export function useShareQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      email,
      accessLevel,
    }: {
      quizId: string;
      email: string;
      accessLevel: "TAKER" | "VIEWER";
    }) => api.post<{ share: QuizShare }>(`/quizzes/${quizId}/shares`, { email, accessLevel }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizShares", variables.quizId] });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, shareId }: { quizId: string; shareId: string }) =>
      api.patch<{ share: QuizShare }>(`/quizzes/${quizId}/shares/${shareId}`, {
        status: "REVOKED",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizShares", variables.quizId] });
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, shareId }: { quizId: string; shareId: string }) =>
      api.delete(`/quizzes/${quizId}/shares/${shareId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizShares", variables.quizId] });
    },
  });
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: ["sharedWithMe"],
    queryFn: () => api.get<{ sharedQuizzes: SharedQuiz[] }>("/shared"),
  });
}

export function useAcceptShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      api.post<{ share: QuizShare; quizId: string }>(`/shares/accept?token=${token}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharedWithMe"] });
    },
  });
}
