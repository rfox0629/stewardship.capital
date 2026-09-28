"use client";

import { useActionState, useEffect, useRef } from "react";

import { sendInquiry, type Draft, type InquiryState } from "./actions";

const MESSAGES: Record<"limited" | "unavailable", string> = {
  limited: "We've received several messages from here recently. Please try again in an hour.",
  unavailable: "Your message couldn't be sent just now. Please try again in a few minutes.",
};

const EMPTY: Draft = { name: "", email: "", phone: "", message: "" };

type Field = keyof Draft;

/** In the order they appear, so focus can go to the first that needs help. */
const ORDER: Field[] = ["name", "email", "phone", "message"];

/**
 * The form on tentmaiker.com/contact.
 *
 * It posts to a server action, which validates, limits and sends through
 * Resend; the page only says thank you when Resend accepted the email. What
 * was typed is handed back on any refusal, so nothing is ever lost.
 */
export function InquiryForm({ home }: { home: string }) {
  const form = useRef<HTMLFormElement>(null);
  const thanks = useRef<HTMLHeadingElement>(null);
  const opened = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, { status: "idle" });

  /* When the form was first shown. A person takes a few seconds to write; a
     script posting the instant the page loads is refused on the server. A
     hidden input's value is its default, so a form reset keeps it. */
  useEffect(() => {
    if (opened.current) opened.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state.status === "sent") thanks.current?.focus();
    if (state.status === "invalid") {
      const first = ORDER.find((field) => state.errors[field]);
      if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  }, [state]);

  if (state.status === "sent") {
    return (
      <div className="tm-sent" role="status">
        <h2 ref={thanks} tabIndex={-1}>
          Thank you<span className="tm-dot">.</span>
        </h2>
        <p>Your message is on its way. We&rsquo;ll be in touch soon.</p>
        <a className="tm-back" href={home}>
          Back to the front page
        </a>
      </div>
    );
  }

  const errors = state.status === "invalid" ? state.errors : {};
  const draft = "draft" in state ? state.draft : EMPTY;
  const describe = (name: Field) => (errors[name] ? `tm-error-${name}` : undefined);
  const error = (name: Field) => (errors[name] ? <em id={`tm-error-${name}`}>{errors[name]}</em> : null);

  return (
    <form ref={form} action={action} className="tm-form" noValidate aria-labelledby="tm-contact-title">
      <label className="tm-field">
        <span>Name</span>
        <input
          name="name"
          autoComplete="name"
          maxLength={100}
          required
          defaultValue={draft.name}
          aria-invalid={!!errors.name}
          aria-describedby={describe("name")}
        />
        {error("name")}
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
          aria-describedby={describe("email")}
        />
        {error("email")}
      </label>

      <label className="tm-field">
        <span>
          Phone <small>(optional)</small>
        </span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          defaultValue={draft.phone}
          aria-invalid={!!errors.phone}
          aria-describedby={describe("phone")}
        />
        {error("phone")}
      </label>

      <label className="tm-field">
        <span>What do you need help with?</span>
        <textarea
          name="message"
          rows={5}
          maxLength={2000}
          required
          defaultValue={draft.message}
          aria-invalid={!!errors.message}
          aria-describedby={describe("message")}
        />
        {error("message")}
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
        {pending ? "Sending" : "Start a conversation"}
      </button>
    </form>
  );
}
