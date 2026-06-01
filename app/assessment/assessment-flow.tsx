"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { assessmentQuestions } from "../../lib/assessment/questions";

type Answers = Record<string, string>;

const storageKey = "stewardship-capital-assessment-v1";

export function AssessmentFlow() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [isReady, setIsReady] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Draft ready");
  const [resumeMessage, setResumeMessage] = useState("");

  const currentQuestion = assessmentQuestions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];
  const answeredCount = useMemo(
    () =>
      assessmentQuestions.filter((question) => Boolean(answers[question.id]))
        .length,
    [answers],
  );
  const progress = Math.round(
    ((currentIndex + 1) / assessmentQuestions.length) * 100,
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedDraft = window.localStorage.getItem(storageKey);

      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft) as {
            answers?: Answers;
            currentIndex?: number;
          };

          setAnswers(draft.answers ?? {});
          setCurrentIndex(
            typeof draft.currentIndex === "number" &&
              draft.currentIndex >= 0 &&
              draft.currentIndex < assessmentQuestions.length
              ? draft.currentIndex
              : 0,
          );
          setSaveLabel("Draft restored");
        } catch {
          setSaveLabel("Draft ready");
        }
      }

      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          currentIndex,
          updatedAt: new Date().toISOString(),
        }),
      );
      setSaveLabel("Saved just now");
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [answers, currentIndex, isReady]);

  function selectAnswer(value: string) {
    setResumeMessage("");
    setSaveLabel("Saving...");
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentQuestion.id]: value,
    }));
  }

  function goBack() {
    setResumeMessage("");
    setSaveLabel("Saving...");
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    setResumeMessage("");
    setSaveLabel("Saving...");

    if (currentIndex === assessmentQuestions.length - 1) {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          completedAt: new Date().toISOString(),
        }),
      );
      router.push("/dashboard");
      return;
    }

    setCurrentIndex((index) =>
      Math.min(assessmentQuestions.length - 1, index + 1),
    );
  }

  function saveForLater() {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        answers,
        currentIndex,
        updatedAt: new Date().toISOString(),
      }),
    );
    setSaveLabel("Saved for later");
    setResumeMessage(
      "Your draft is saved on this device. Account-based resume will connect after the data layer is added.",
    );
  }

  return (
    <section className="assessment-shell" aria-labelledby="assessment-title">
      <div className="assessment-sticky">
        <div>
          <p className="assessment-save-label">{saveLabel}</p>
          <p className="assessment-save-copy">Auto-save is on</p>
        </div>
        <button
          className="assessment-resume-button"
          onClick={saveForLater}
          type="button"
        >
          Resume later
        </button>
      </div>

      <div className="assessment-progress" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="assessment-card">
        <div className="assessment-meta">
          <span>
            Question {currentIndex + 1} of {assessmentQuestions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>

        <p className="eyebrow">{currentQuestion.pillar}</p>
        <h1 id="assessment-title">{currentQuestion.prompt}</h1>
        <p className="assessment-helper">{currentQuestion.helper}</p>

        <fieldset className="assessment-options">
          <legend className="sr-only">{currentQuestion.prompt}</legend>
          {currentQuestion.options.map((option) => (
            <label
              className="assessment-option"
              data-selected={selectedAnswer === option.value}
              key={option.value}
            >
              <input
                checked={selectedAnswer === option.value}
                name={currentQuestion.id}
                onChange={() => selectAnswer(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        {resumeMessage ? (
          <p className="assessment-resume-message">{resumeMessage}</p>
        ) : null}

        <div className="assessment-actions">
          <button
            className="button button-secondary"
            disabled={currentIndex === 0}
            onClick={goBack}
            type="button"
          >
            Back
          </button>
          <button
            className="button button-primary"
            disabled={!selectedAnswer}
            onClick={goNext}
            type="button"
          >
            {currentIndex === assessmentQuestions.length - 1
              ? "Create Dashboard"
              : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
