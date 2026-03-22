import { useState, useRef } from "react";

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

interface QuizUploaderProps {
  onUpload: (content: string) => void;
  isUploading: boolean;
  error?: string | null;
  validationErrors?: ValidationErrorDetail[];
}

export function QuizUploader({ onUpload, isUploading, error, validationErrors }: QuizUploaderProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState<string | null>(null);
  const [metaSubject, setMetaSubject] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileName(file.name);
    setMetaTitle(null);
    setMetaSubject(null);

    if (!file.name.endsWith(".json")) {
      setFileError("Only .json files are accepted");
      setFileContent(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError("File is too large (max 5MB)");
      setFileContent(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const parsed = JSON.parse(text);
        setFileContent(text);
        if (parsed?.meta?.title) {
          setMetaTitle(parsed.meta.title);
        }
        if (parsed?.meta?.subject) {
          setMetaSubject(parsed.meta.subject);
        }
      } catch {
        setFileError("File does not contain valid JSON");
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileContent) {
      setFileError("Please select a file");
      return;
    }
    onUpload(fileContent);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <p className="font-medium">{error}</p>
          {validationErrors && validationErrors.length > 0 && (
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {validationErrors.map((e, i) => (
                <li key={i}>
                  <span className="font-mono text-xs bg-red-100 px-1 py-0.5 rounded">
                    {e.path}
                  </span>{" "}
                  {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quiz JSON File
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          {fileName ? (
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              {fileContent && (
                <p className="text-xs text-green-600 mt-1">Valid JSON file</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600">Click to select a .json file</p>
              <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
            </div>
          )}
        </div>
        {fileError && (
          <p className="text-sm text-red-600 mt-1">{fileError}</p>
        )}
      </div>

      {(metaTitle || metaSubject) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
          {metaTitle && (
            <p className="text-blue-900">
              <span className="font-medium">Title:</span> {metaTitle}
            </p>
          )}
          {metaSubject && (
            <p className="text-blue-700">
              <span className="font-medium">Subject:</span> {metaSubject}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading || !fileContent}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isUploading ? "Uploading..." : "Upload Quiz"}
      </button>
    </form>
  );
}
