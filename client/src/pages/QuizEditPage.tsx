import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuiz, useCreateQuiz, useUpdateQuiz } from "../api/quizzes";
import { QuizForm } from "../components/quiz/QuizForm";
import type { QuestionData } from "../components/quiz/QuestionEditor";
import type { QuizQuestion } from "../types";

function questionToFormData(q: QuizQuestion): QuestionData {
  return {
    questionId: q.questionId,
    questionText: q.questionText,
    questionType: q.questionType,
    options: q.options,
    correctAnswer: q.correctAnswer,
  };
}

export function QuizEditPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data, isLoading } = useQuiz(id ?? "");
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();

  if (isEdit && isLoading) {
    return <p className="text-gray-500">Loading quiz...</p>;
  }

  const quiz = data?.quiz;

  const handleSubmit = (formData: {
    title: string;
    description?: string;
    questions: QuestionData[];
  }) => {
    if (isEdit) {
      updateQuiz.mutate(
        { id, ...formData },
        { onSuccess: (data) => navigate(`/quizzes/${data.quiz?.id ?? id}`) },
      );
    } else {
      createQuiz.mutate(formData, {
        onSuccess: (data) => navigate(`/quizzes/${data.quiz.id}`),
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to={isEdit ? `/quizzes/${id}` : "/quizzes"}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          &larr; {isEdit ? "Back to quiz" : "Back to quizzes"}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? "Edit Quiz" : "Create Quiz"}
      </h1>

      {(createQuiz.error || updateQuiz.error) && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {(createQuiz.error || updateQuiz.error)?.message ||
            "Failed to save quiz"}
        </div>
      )}

      <QuizForm
        initialTitle={quiz?.title}
        initialDescription={quiz?.description ?? ""}
        initialQuestions={quiz?.questions.map(questionToFormData)}
        onSubmit={handleSubmit}
        isSubmitting={createQuiz.isPending || updateQuiz.isPending}
        submitLabel={isEdit ? "Update Quiz" : "Create Quiz"}
      />
    </div>
  );
}
