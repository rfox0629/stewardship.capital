"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { sendInquiry, type InquiryState } from "./actions";

const MESSAGES: Record<"limited" | "unavailable", string> = {
  limited: "We've received several messages from here recently. Please try again in an hour.",
  unavailable: "Your message couldn't be sent just now. Please try again in a few minutes.",
};

/**
 * "Start a conversation", tucked into the foot of the page.
 *
 * A native dialog, so focus, Escape and the backdrop behave the way the
 * platform does. The form posts to a server action; the page only says thank
 * you when the server reports that Resend accepted the email.
 */
export function StartConversation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, { status: "idle" });
  const [opened, setOpened] = useState("");
  const [round, setRound] = useState(0);

  const open = () => {
    setOpened(String(Date.now()));
    dialog.current?.showModal();
  };

  useEffect(() => {
    if (state.status === "sent") dialog.current?.querySelector<HTMLButtonElement>(".tm-dialog-done")?.focus();
  }, [state]);

  const errors = state.status === "invalid" ? state.errors : {};
  const draft = "draft" in state ? state.draft : { name: "", email: "", message: "" };

  return (
    <>
      <button type="button" className="tm-link" onClick={open}>
        Start a conversation
      </button>

      <dialog
        ref={dialog}
        className="tm-dialog"
        aria-labelledby="tm-dialog-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        onClose={() => {
          if (state.status === "sent") setRound((n) => n + 1);
        }}
      >
        <div className="tm-dialog-inner">
          <button
            type="button"
            className="tm-dialog-close"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          {state.status === "sent" ? (
            <div className="tm-dialog-sent" role="status">
              <h2 id="tm-dialog-title">
                Thank you<span className="tm-dot">.</span>
              </h2>
              <p>Your message is on its way. We&rsquo;ll reply to the email you gave us.</p>
              <button type="button" className="tm-button tm-dialog-done" onClick={() => dialog.current?.close()}>
                Close
              </button>
            </div>
          ) : (
            <form action={action} key={round} noValidate>
              <h2 id="tm-dialog-title">
                Start a conversation<span className="tm-dot">.</span>
              </h2>
              <p className="tm-dialog-lede">Tell us what you&rsquo;re building, or what&rsquo;s in the way.</p>

              <label className="tm-field">
                <span>Name</span>
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                  defaultValue={draft.name}
                  aria-invalid={!!errors.name}
                />
                {errors.name ? <em>{errors.name}</em> : null}
              </label>

              <label className="tm-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  defaultValue={draft.email}
                  aria-invalid={!!errors.email}
                />
                {errors.email ? <em>{errors.email}</em> : null}
              </label>

              <label className="tm-field">
                <span>Project</span>
                <textarea
                  name="message"
                  rows={4}
                  maxLength={2000}
                  required
                  defaultValue={draft.message}
                  aria-invalid={!!errors.message}
                />
                {errors.message ? <em>{errors.message}</em> : null}
              </label>

              {/* For scripts only: people never see or fill this. */}
              <div className="tm-trap" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <input type="hidden" name="opened" value={opened} />

              {state.status === "limited" || state.status === "unavailable" ? (
                <p className="tm-dialog-error" role="alert">
                  {MESSAGES[state.status]}
                </p>
              ) : null}

              <button type="submit" className="tm-button" disabled={pending}>
                {pending ? "Sending" : "Send"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
