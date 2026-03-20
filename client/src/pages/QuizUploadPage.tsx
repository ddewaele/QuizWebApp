import { useNavigate, Link } from "react-router-dom";
import { useImportQuiz } from "../api/quizzes";
import {
  QuizUploader,
  type ValidationErrorDetail,
} from "../components/quiz/QuizUploader";
import { ApiError } from "../api/client";
import { useState } from "react";

export function QuizUploadPage() {
  const navigate = useNavigate();
  const importQuiz = useImportQuiz();
  const [serverError, setServerError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    ValidationErrorDetail[]
  >([]);

  const handleUpload = (title: string, content: string) => {
    setServerError(null);
    setValidationErrors([]);
    importQuiz.mutate(
      { title, content },
      {
        onSuccess: (data) => navigate(`/quizzes/${data.quiz.id}`),
        onError: (err) => {
          setServerError(
            err.message || "Upload failed. Check your file format.",
          );
          if (err instanceof ApiError && err.details) {
            const details = err.details as { errors?: ValidationErrorDetail[] };
            if (details.errors && Array.isArray(details.errors)) {
              setValidationErrors(details.errors);
            }
          }
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/quizzes"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          &larr; Back to quizzes
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Quiz</h1>
      <p className="text-gray-600 mb-6">
        Upload a quiz JSON file. The file must be a JSON array of question
        objects with question_id, question_text, options, and correct_answer
        fields.
      </p>

      <div className="max-w-xl">
        <QuizUploader
          onUpload={handleUpload}
          isUploading={importQuiz.isPending}
          error={serverError}
          validationErrors={validationErrors}
        />
      </div>
    </div>
  );
}
