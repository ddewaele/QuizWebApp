import { useState, useRef } from "react";

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

export interface SelectedFile {
  fileName: string;
  content: string;
  metaTitle: string | null;
  metaSubject: string | null;
  error: string | null;
}

interface QuizUploaderProps {
  onUpload: (files: SelectedFile[]) => void;
  isUploading: boolean;
}

export function QuizUploader({ onUpload, isUploading }: QuizUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: SelectedFile[] = [];

    let remaining = fileList.length;
    const onComplete = () => {
      remaining--;
      if (remaining === 0) {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    };

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (!file.name.endsWith(".json")) {
        newFiles.push({
          fileName: file.name,
          content: "",
          metaTitle: null,
          metaSubject: null,
          error: "Only .json files are accepted",
        });
        onComplete();
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        newFiles.push({
          fileName: file.name,
          content: "",
          metaTitle: null,
          metaSubject: null,
          error: "File is too large (max 5MB)",
        });
        onComplete();
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        try {
          const parsed = JSON.parse(text);
          newFiles.push({
            fileName: file.name,
            content: text,
            metaTitle: parsed?.meta?.title ?? null,
            metaSubject: parsed?.meta?.subject ?? null,
            error: null,
          });
        } catch {
          newFiles.push({
            fileName: file.name,
            content: "",
            metaTitle: null,
            metaSubject: null,
            error: "File does not contain valid JSON",
          });
        }
        onComplete();
      };
      reader.readAsText(file);
    }

    // Reset input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validFiles = selectedFiles.filter((f) => !f.error);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validFiles.length === 0) return;
    onUpload(validFiles);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quiz JSON Files
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <div>
            <p className="text-sm text-gray-600">
              Click to select one or more .json files
            </p>
            <p className="text-xs text-gray-400 mt-1">Max 5MB per file</p>
          </div>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
            {validFiles.length < selectedFiles.length && (
              <span className="text-red-600 ml-1">
                ({selectedFiles.length - validFiles.length} with errors)
              </span>
            )}
          </p>
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {selectedFiles.map((file, index) => (
              <li
                key={index}
                className={`flex items-center justify-between px-4 py-3 text-sm ${
                  file.error ? "bg-red-50" : "bg-white"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {file.fileName}
                  </p>
                  {file.error ? (
                    <p className="text-xs text-red-600 mt-0.5">{file.error}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {file.metaTitle && (
                        <span className="text-blue-700">{file.metaTitle}</span>
                      )}
                      {file.metaTitle && file.metaSubject && " — "}
                      {file.metaSubject && (
                        <span className="text-blue-600">{file.metaSubject}</span>
                      )}
                      {!file.metaTitle && !file.metaSubject && (
                        <span className="text-green-600">Valid JSON</span>
                      )}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${file.fileName}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isUploading || validFiles.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isUploading
            ? "Uploading..."
            : `Upload ${validFiles.length} Quiz${validFiles.length !== 1 ? "zes" : ""}`}
        </button>
        {selectedFiles.length > 0 && !isUploading && (
          <button
            type="button"
            onClick={() => setSelectedFiles([])}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </form>
  );
}
