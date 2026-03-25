export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface QuizOption {
  text: string;
  is_true: boolean;
  explanation: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionId: number;
  questionText: string;
  options: Record<string, QuizOption>;
  correctAnswer: string[];
  sortOrder: number;
}

export interface QuizAttemptSummary {
  percentage: number;
  completedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
  attempts?: QuizAttemptSummary[];
  _count?: {
    questions: number;
    attempts: number;
  };
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  createdAt: string;
  quiz?: { id: string; title: string };
  answers?: QuizAttemptAnswer[];
}

export interface QuizShare {
  id: string;
  quizId: string;
  email: string;
  accessLevel: "TAKER" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  token: string;
  sharedBy: string;
  sharedAt: string;
  acceptedAt: string | null;
}

export interface SharedQuiz {
  shareId: string;
  accessLevel: "TAKER" | "VIEWER";
  sharedAt: string;
  quiz: Quiz;
}

export interface QuizAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedKeys: string[];
  isCorrect: boolean;
  question: QuizQuestion;
}
