"use client";

import { useActionState, useEffect, useRef } from "react";

import { sendInquiry, type InquiryState } from "./actions";

const MESSAGES: Record<"limited" | "unavailable", string> = {
  limited: "We've received several messages from here recently. Please try again in an hour.",
  unavailable: "Your message couldn't be sent just now. Please try again in a few minutes.",
};

const FIELDS = ["name", "email", "message"] as const;

/**
 * The inquiry form, set into the contact page beneath the invitation.
 *
 * It posts to a server action, which validates, limits and sends; this page
 * only says thank you when the server reports that Resend accepted the email.
 * What was typed is handed back on any refusal, so nothing is ever lost.
 */
export function InquiryForm({ home }: { home: string }) {
  const form = useRef<HTMLFormElement>(null);
  const thanks = useRef<HTMLHeadingElement>(null);
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, { status: "idle" });
  /* When the form was first shown. A person takes a few seconds to write; a
     script posting the instant the page loads is refused on the server. */
  const opened = useRef<HTMLInputElement>(null);

  useEffect(() => {
    /* A hidden input's value is its default, so a form reset keeps it. */
    if (opened.current) opened.current.value = String(Date.now());
  }, []);

  /* After an answer, focus goes where the next thing to read is: the thank
     you, or the first field that needs attention. */
  useEffect(() => {
    if (state.status === "sent") thanks.current?.focus();
    if (state.status === "invalid") {
      const first = FIELDS.find((field) => state.errors[field]);
      if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  }, [state]);

  if (state.status === "sent") {
    return (
      <div className="tm-sent" role="status">
        <h3 ref={thanks} tabIndex={-1}>
          Thank you<span className="tm-dot">.</span>
        </h3>
        <p>Your message is on its way to us. We&rsquo;ll read it closely and reply to the email you gave us.</p>
        <p className="tm-sent-quiet">We&rsquo;re glad you wrote.</p>
        <a className="tm-link" href={home}>
          Back to the front page
        </a>
      </div>
    );
  }

  const errors = state.status === "invalid" ? state.errors : {};
  const draft = "draft" in state ? state.draft : { name: "", email: "", message: "" };
  const described = (field: (typeof FIELDS)[number]) => (errors[field] ? `tm-error-${field}` : undefined);

  return (
    <form ref={form} action={action} className="tm-form" noValidate aria-label="Start the conversation">
      <div className="tm-form-row">
        <label className="tm-field">
          <span>Name</span>
          <input
            name="name"
            autoComplete="name"
            maxLength={100}
            required
            defaultValue={draft.name}
            aria-invalid={!!errors.name}
            aria-describedby={described("name")}
          />
          {errors.name ? <em id="tm-error-name">{errors.name}</em> : null}
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
            aria-describedby={described("email")}
          />
          {errors.email ? <em id="tm-error-email">{errors.email}</em> : null}
        </label>
      </div>

      <label className="tm-field">
        <span>Project or assignment</span>
        <textarea
          name="message"
          rows={6}
          maxLength={2000}
          required
          defaultValue={draft.message}
          aria-invalid={!!errors.message}
          aria-describedby={described("message")}
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
      <input ref={opened} type="hidden" name="opened" defaultValue="" />

      {state.status === "limited" || state.status === "unavailable" ? (
        <p className="tm-form-error" role="alert">
          {MESSAGES[state.status]}
        </p>
      ) : null}

      <button type="submit" className="tm-button" disabled={pending}>
        {pending ? "Sending" : "Start the conversation"}
      </button>
    </form>
  );
}
