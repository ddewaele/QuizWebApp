import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(percentage: number) {
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 50) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBgColor(percentage: number) {
  if (percentage >= 80) return "bg-green-50 border-green-200";
  if (percentage >= 50) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}
