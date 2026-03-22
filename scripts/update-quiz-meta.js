#!/usr/bin/env node
/**
 * Analyzes quiz questions and updates meta.title based on actual content topics.
 * Uses simple keyword extraction from question texts.
 */

import { readFileSync, writeFileSync } from "fs";

const topicKeywords = {
  "AI Fundamentals & Responsible AI": [
    "responsible ai", "ai principle", "fairness", "transparency", "accountability",
    "inclusiveness", "privacy and security", "reliability and safety",
    "artificial intelligence", "ai-900", "passing score", "resource group",
    "azure resource", "subscription",
  ],
  "Machine Learning": [
    "machine learning", "supervised learning", "unsupervised learning",
    "regression", "classification", "clustering", "training", "inferencing",
    "feature", "label", "r-squared", "confusion matrix", "recall", "precision",
    "accuracy", "f1", "overfitting", "underfitting", "automated ml", "azure machine learning",
  ],
  "Deep Learning & Neural Networks": [
    "neural network", "deep learning", "cnn", "convolutional",
    "transformer", "attention mechanism", "embeddings", "tokenization",
    "backpropagation", "activation function",
  ],
  "Natural Language Processing": [
    "nlp", "natural language", "sentiment analysis", "entity recognition",
    "text analytics", "language understanding", "summarization",
    "conversational ai", "question answering", "azure ai language",
    "text classification", "key phrase",
  ],
  "Computer Vision": [
    "computer vision", "image", "object detection", "ocr",
    "optical character recognition", "face detection", "face recognition",
    "custom vision", "pixel", "bounding box", "image classification",
    "spatial analysis",
  ],
  "Generative AI": [
    "generative ai", "large language model", "llm", "gpt",
    "foundation model", "prompt", "few-shot", "zero-shot",
    "copilot", "azure openai", "content generation", "grounding",
    "rag", "retrieval augmented",
  ],
  "Azure AI Services": [
    "azure ai", "ai foundry", "ai search", "cognitive services",
    "document intelligence", "form recognizer", "bot service",
    "knowledge mining",
  ],
};

const files = process.argv.slice(2);

for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const quiz = JSON.parse(raw);

  if (!quiz.meta || !quiz.questions) {
    console.log(`SKIP: ${file}`);
    continue;
  }

  // Combine all question texts
  const allText = quiz.questions
    .map((q) => q.question_text)
    .join(" ")
    .toLowerCase();

  // Score each topic
  const scores = {};
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    scores[topic] = keywords.filter((kw) => allText.includes(kw)).length;
  }

  // Get top 2 topics with score > 0
  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  let title;
  if (sorted.length === 0) {
    title = quiz.meta.title; // keep original
  } else if (sorted.length === 1 || sorted[0][1] > sorted[1][1] * 2) {
    title = `AI-900: ${sorted[0][0]}`;
  } else {
    title = `AI-900: ${sorted[0][0]} & ${sorted[1][0]}`;
  }

  // Extract number from filename for uniqueness
  const match = file.match(/(\d+)\.json$/);
  const num = match ? ` (${parseInt(match[1])})` : "";

  quiz.meta.title = title + num;

  writeFileSync(file, JSON.stringify(quiz, null, 2) + "\n");
  console.log(`${file}: ${quiz.meta.title}`);
  console.log(`  Topics: ${sorted.slice(0, 3).map(([t, s]) => `${t}(${s})`).join(", ")}`);
}
