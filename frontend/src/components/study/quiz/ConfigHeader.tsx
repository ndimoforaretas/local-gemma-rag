/**
 * Quiz config hero — big title + subtitle. Pulled out so QuizConfigPanel
 * stays focused on the form itself.
 */

export function ConfigHeader() {
  return (
    <div className="mb-7">
      <h1 className="text-2xl sm:text-3xl font-bold text-ink-strong mb-2">
        Set up your quiz
      </h1>
      <p className="text-base text-ink-muted">
        Choose what to study, how challenging it should be, and how many
        questions you want.
      </p>
    </div>
  );
}
