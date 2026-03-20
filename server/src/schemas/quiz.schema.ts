import { z } from "zod";

const optionInputSchema = z.object({
  text: z.string().min(1),
  is_true: z.boolean(),
  explanation: z.string().min(1),
});

const questionInputSchema = z.object({
  questionId: z.number().int().positive(),
  questionText: z.string().min(1),
  questionType: z.enum(["single_select", "multiple_select"]).default("single_select"),
  options: z.record(z.string().regex(/^[a-z]$/), optionInputSchema).refine(
    (opts) => Object.keys(opts).length >= 2,
    { message: "At least 2 options required" },
  ),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
});

export const createQuizSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  questions: z.array(questionInputSchema).min(1),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  questions: z.array(questionInputSchema).min(1).optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
