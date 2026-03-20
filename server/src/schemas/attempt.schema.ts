import { z } from "zod";

export const submitAttemptSchema = z.object({
  answers: z.record(
    z.string(), // questionId (cuid)
    z.array(z.string()), // selected option keys, e.g. ["a"] or ["a","c"]
  ),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
