"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { sendInquiry, type Draft, type InquiryState } from "./actions";

const MESSAGES: Record<"limited" | "unavailable", string> = {
  limited: "We've received several messages from here recently. Please try again in an hour.",
  unavailable: "Your message couldn't be sent just now. Please try again in a few minutes.",
};

const EMPTY: Draft = { firstName: "", lastName: "", phone: "", email: "", message: "" };

type Field = keyof Draft;

/** In the order they appear, so focus can go to the first that needs help. */
const ORDER: Field[] = ["firstName", "lastName", "phone", "email", "message"];

function Arrow() {
  return (
    <svg className="tm-arrow" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "Click here", beneath the verse on the front page.
 *
 * A native dialog, so focus, Escape and the backdrop behave the way the
 * platform does. It opens on the verse the name comes from, then asks who you
 * are and what you need. The form posts to a server action; the page only
 * says thank you when the server reports that Resend accepted the email.
 */
export function StartConversation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, { status: "idle" });
  const [opened, setOpened] = useState("");
  const [round, setRound] = useState(0);

  const open = () => {
    setOpened(String(Date.now()));
    dialog.current?.showModal();
  };

  useEffect(() => {
    if (state.status === "sent") dialog.current?.querySelector<HTMLButtonElement>(".tm-dialog-done")?.focus();
    if (state.status === "invalid") {
      const first = ORDER.find((field) => state.errors[field]);
      if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  }, [state]);

  const errors = state.status === "invalid" ? state.errors : {};
  const draft = "draft" in state ? state.draft : EMPTY;

  /* One field: its label, its input, and its message when it needs one. */
  const input = (name: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="tm-field">
      <span>{label}</span>
      <input
        name={name}
        required
        defaultValue={draft[name]}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `tm-error-${name}` : undefined}
        {...props}
      />
      {errors[name] ? <em id={`tm-error-${name}`}>{errors[name]}</em> : null}
    </label>
  );

  return (
    <>
      <button type="button" className="tm-cta" aria-haspopup="dialog" onClick={open}>
        <Arrow />
        Click here
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

          {/* Where the name comes from, at the top of the page it opens. */}
          <figure className="tm-verse">
            <blockquote id="tm-dialog-title">
              &ldquo;Because he practiced the same trade, he lived with them and worked, for by trade
              they were tentmakers.&rdquo;
            </blockquote>
            {/* The World English Bible (public domain), with "tentmakers" as one word. */}
            <figcaption>Acts 18:3</figcaption>
          </figure>

          {state.status === "sent" ? (
            <div className="tm-dialog-sent" role="status">
              <h2>
                Thank you<span className="tm-dot">.</span>
              </h2>
              <p>Your message is on its way. We&rsquo;ll be in touch soon.</p>
              <button type="button" className="tm-button tm-dialog-done" onClick={() => dialog.current?.close()}>
                Close
              </button>
            </div>
          ) : (
            <form ref={form} action={action} key={round} noValidate aria-label="Tell us what you need">
              <div className="tm-pair">
                {input("firstName", "First name", { autoComplete: "given-name", maxLength: 60 })}
                {input("lastName", "Last name", { autoComplete: "family-name", maxLength: 60 })}
              </div>
              <div className="tm-pair">
                {input("phone", "Phone", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 32 })}
                {input("email", "Email", { type: "email", autoComplete: "email", maxLength: 254 })}
              </div>

              <label className="tm-field">
                <span>Notes</span>
                <textarea
                  name="message"
                  rows={4}
                  maxLength={2000}
                  required
                  placeholder="What do you need help with?"
                  defaultValue={draft.message}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "tm-error-message" : undefined}
                />
                {errors.message ? <em id="tm-error-message">{errors.message}</em> : null}
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
