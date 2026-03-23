import { Link } from "react-router-dom";
import { useImportQuizBatch, type BatchImportResult } from "../api/quizzes";
import { QuizUploader, type SelectedFile } from "../components/quiz/QuizUploader";
import { ApiError } from "../api/client";
import { useState } from "react";

export function QuizUploadPage() {
  const importBatch = useImportQuizBatch();
  const [results, setResults] = useState<BatchImportResult[] | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleUpload = (files: SelectedFile[]) => {
    setResults(null);
    setGlobalError(null);
    importBatch.mutate(
      {
        files: files.map((f) => ({
          content: f.content,
          fileName: f.fileName,
        })),
      },
      {
        onSuccess: (data) => setResults(data.results),
        onError: (err: unknown) => {
          const apiErr = err as ApiError;
          setGlobalError(
            apiErr.message || "Upload failed. Check your file format.",
          );
        },
      },
    );
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

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

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Quizzes</h1>
      <p className="text-gray-600 mb-6">
        Upload one or more quiz JSON files in the standard format:{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
          {"{ meta: { title, version }, questions: [...] }"}
        </code>
        . The quiz title and subject are read from each file's{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">meta</code> block.{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">version</code> is required
        and must be a semantic version (e.g.{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">1.0.0</code>).
      </p>

      {globalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <p className="font-medium">{globalError}</p>
        </div>
      )}

      {results && (
        <div className="mb-6">
          <div
            className={`p-4 rounded-lg border text-sm ${
              failCount === 0
                ? "bg-green-50 border-green-200 text-green-800"
                : successCount === 0
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
            }`}
          >
            <p className="font-medium mb-2">
              {failCount === 0
                ? `All ${successCount} quiz${successCount !== 1 ? "zes" : ""} uploaded successfully!`
                : successCount === 0
                  ? `All ${failCount} file${failCount !== 1 ? "s" : ""} failed to upload`
                  : `${successCount} uploaded, ${failCount} failed`}
            </p>
          </div>

          <ul className="mt-3 divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {results.map((result, index) => (
              <li
                key={index}
                className={`px-4 py-3 text-sm ${
                  result.success ? "bg-white" : "bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <span className="text-green-600 font-medium">&#10003;</span>
                      ) : (
                        <span className="text-red-600 font-medium">&#10007;</span>
                      )}
                      <span className="font-medium text-gray-900 truncate">
                        {result.fileName}
                      </span>
                    </div>
                    {result.success && result.quiz && (
                      <p className="text-xs text-gray-500 mt-0.5 ml-6">
                        {result.quiz.title} — {result.quiz._count.questions} questions
                      </p>
                    )}
                    {!result.success && result.error && (
                      <p className="text-xs text-red-600 mt-0.5 ml-6">
                        {result.error}
                      </p>
                    )}
                  </div>
                  {result.success && result.quiz && (
                    <Link
                      to={`/quizzes/${result.quiz.id}`}
                      className="ml-3 text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                    >
                      View quiz &rarr;
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setResults(null)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            Upload more files
          </button>
        </div>
      )}

      {!results && (
        <div className="max-w-xl">
          <QuizUploader
            onUpload={handleUpload}
            isUploading={importBatch.isPending}
          />
        </div>
      )}
    </div>
  );
}
