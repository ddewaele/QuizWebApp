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

  const handleUpload = (content: string) => {
    setServerError(null);
    setValidationErrors([]);
    importQuiz.mutate(
      { content },
      {
        onSuccess: (data) => navigate(`/quizzes/${data.quiz.id}`),
        onError: (err: unknown) => {
          const apiErr = err as ApiError;
          setServerError(
            apiErr.message || "Upload failed. Check your file format.",
          );
          const details = apiErr.details as
            | { errors?: ValidationErrorDetail[] }
            | undefined;
          if (details?.errors && Array.isArray(details.errors)) {
            setValidationErrors(details.errors);
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
        Upload a quiz JSON file in the standard format:{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
          {"{ meta: { title, version }, questions: [...] }"}
        </code>
        . The quiz title and subject are read from the file's{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">meta</code> block.{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">version</code> is required and must be a semantic version (e.g.{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">1.0.0</code>).
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
