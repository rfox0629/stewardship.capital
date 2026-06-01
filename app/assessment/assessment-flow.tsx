"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { assessmentQuestions } from "../../lib/assessment/questions";
import type {
  AssessmentCompleteResponse,
  AssessmentDraftState,
  AssessmentPersistenceMode,
  AssessmentSaveResponse,
} from "../../lib/assessment/persistence-types";
import type { AssessmentAnswers } from "../../lib/scoring/stewardship-scoring";

const storageKey = "stewardship-capital-assessment-v1";

type AssessmentFlowProps = {
  initialDraft: AssessmentDraftState;
};

function saveLocalDraft(answers: AssessmentAnswers, currentIndex: number) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      answers,
      currentIndex,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function AssessmentFlow({ initialDraft }: AssessmentFlowProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialDraft.currentIndex);
  const [answers, setAnswers] = useState<AssessmentAnswers>(
    initialDraft.answers,
  );
  const [assessmentId, setAssessmentId] = useState(initialDraft.assessmentId);
  const [persistenceMode, setPersistenceMode] =
    useState<AssessmentPersistenceMode>(initialDraft.mode);
  const [isReady, setIsReady] = useState(false);
  const [saveLabel, setSaveLabel] = useState(
    initialDraft.mode === "supabase" ? "Saved just now" : "Draft ready",
  );
  const [resumeMessage, setResumeMessage] = useState(initialDraft.message ?? "");

  const currentQuestion = assessmentQuestions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];
  const answeredCount = useMemo(
    () =>
      assessmentQuestions.filter((question) => Boolean(answers[question.id]))
        .length,
    [answers],
  );
  const progress = Math.round((answeredCount / assessmentQuestions.length) * 100);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (initialDraft.mode === "local") {
        const savedDraft = window.localStorage.getItem(storageKey);

        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft) as {
              answers?: AssessmentAnswers;
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
      }

      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialDraft.mode]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      saveLocalDraft(answers, currentIndex);

      if (persistenceMode !== "supabase") {
        setSaveLabel("Saved just now");
        return;
      }

      try {
        const response = await fetch("/api/assessment/draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assessmentId,
            answers,
            currentIndex,
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to save assessment draft.");
        }

        const result = (await response.json()) as AssessmentSaveResponse;

        if (result.mode === "supabase") {
          setAssessmentId(result.assessmentId);
          setSaveLabel("Saved just now");
          return;
        }

        setPersistenceMode("local");
        setSaveLabel("Saved locally if offline or failed");
      } catch {
        setSaveLabel("Reconnecting...");
        window.setTimeout(() => {
          setPersistenceMode("local");
          setSaveLabel("Saved locally if offline or failed");
        }, 650);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [answers, assessmentId, currentIndex, isReady, persistenceMode]);

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

  async function goNext() {
    setResumeMessage("");
    setSaveLabel("Saving...");

    if (currentIndex === assessmentQuestions.length - 1) {
      saveLocalDraft(answers, currentIndex);

      if (persistenceMode === "supabase") {
        try {
          const response = await fetch("/api/assessment/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              assessmentId,
              answers,
              currentIndex,
            }),
          });

          if (!response.ok) {
            throw new Error("Unable to complete assessment.");
          }

          const result = (await response.json()) as AssessmentCompleteResponse;

          if (result.mode === "supabase" && result.completed) {
            window.localStorage.removeItem(storageKey);
            router.push("/dashboard");
            return;
          }
        } catch {
          setSaveLabel("Reconnecting...");
        }
      }

      setSaveLabel("Saved locally if offline or failed");
      router.push("/dashboard");
      return;
    }

    setCurrentIndex((index) =>
      Math.min(assessmentQuestions.length - 1, index + 1),
    );
  }

  function saveForLater() {
    saveLocalDraft(answers, currentIndex);
    setSaveLabel(
      persistenceMode === "supabase"
        ? "Saved just now"
        : "Saved locally if offline or failed",
    );
    setResumeMessage(
      persistenceMode === "supabase"
        ? "Your progress is saved to your account. Return to the assessment to resume here."
        : "Your draft is saved on this device. Sign in and apply the schema migration to enable account-based resume.",
    );
  }

  return (
    <section className="assessment-shell" aria-labelledby="assessment-title">
      <div className="assessment-sticky">
        <div>
          <p className="assessment-save-label">{saveLabel}</p>
          <p className="assessment-save-copy">
            {persistenceMode === "supabase"
              ? "Auto-save is on for your account"
              : "Auto-save is on for this device"}
          </p>
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
