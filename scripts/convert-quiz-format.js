#!/usr/bin/env node
/**
 * Converts old-format quiz files (flat JSON array, correct_answer as string)
 * to the new format (meta + questions wrapper, correct_answer as string[]).
 *
 * Usage: node scripts/convert-quiz-format.js quizes/ai-900/*.json
 */

import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error("Usage: node scripts/convert-quiz-format.js <file1.json> [file2.json ...]");
  process.exit(1);
}

for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const parsed = JSON.parse(raw);

  // Already in new format
  if (parsed.meta && parsed.questions) {
    console.log(`SKIP (already new format): ${file}`);
    continue;
  }

  // Must be an array (old format)
  if (!Array.isArray(parsed)) {
    console.error(`SKIP (unknown format): ${file}`);
    continue;
  }

  // Derive title from filename
  const name = basename(file, ".json")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const questions = parsed.map((q) => ({
    ...q,
    correct_answer: Array.isArray(q.correct_answer)
      ? q.correct_answer
      : [q.correct_answer],
  }));

  const converted = {
    meta: {
      title: name,
      subject: "AI-900",
      version: "1.0.0",
    },
    questions,
  };

  writeFileSync(file, JSON.stringify(converted, null, 2) + "\n");
  console.log(`CONVERTED: ${file} (${questions.length} questions)`);
}
