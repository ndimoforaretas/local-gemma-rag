/**
 * Quiz config hero — big title + subtitle. Pulled out so QuizConfigPanel
 * stays focused on the form itself.
 */

export function ConfigHeader() {
  return (
    <div className="mb-7">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#191c1e] dark:text-[#e1e2ec] mb-2">
        Set up your quiz
      </h1>
      <p className="text-base text-[#424754] dark:text-[#c2c6d6]">
        Choose what to study, how challenging it should be, and how many
        questions you want.
      </p>
    </div>
  );
}
