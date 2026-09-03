"use client";

import { useId, useRef, useState } from "react";

/**
 * One select for the whole product.
 *
 * A native select cannot be styled where it matters: the operating system
 * draws the open menu, so the list stays gray and foreign however carefully
 * the closed control is dressed. Rather than fight that with hacks, this is a
 * real listbox, and it is the only one, so every menu in Spark looks and
 * behaves the same.
 *
 * It keeps what the native control gives for free and would be careless to
 * lose: it is a labelled button that opens a listbox, arrow keys and Home and
 * End move the active option, typing jumps to an option, Enter and Space
 * choose, Escape closes and returns focus, and the active option is announced
 * through aria-activedescendant. It submits inside a form through a hidden
 * input, so callers read it from FormData exactly like a select.
 */

export type Option = { value: string; label: string };

export function Select({
  name,
  value,
  options,
  onChange,
  label,
  placeholder = "Choose",
  compact = false,
}: {
  name?: string;
  value: string;
  options: Option[];
  onChange?: (value: string) => void;
  label: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typed = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const id = useId();

  const chosen = options.find((option) => option.value === value);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange?.(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(options.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key.length === 1) {
      /* Typeahead, the one native behaviour people miss most. */
      const now = Date.now();
      typed.current = {
        text: now - typed.current.at > 700 ? event.key : typed.current.text + event.key,
        at: now,
      };
      const found = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(typed.current.text.toLowerCase()),
      );
      if (found >= 0) setActive(found);
    }
  };

  return (
    <div className={`sel ${compact ? "sel-compact" : ""}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={buttonRef}
        type="button"
        className="sel-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <span className={chosen ? "" : "sel-placeholder"}>{chosen?.label ?? placeholder}</span>
        <svg viewBox="0 0 10 6" aria-hidden="true" className="sel-chevron">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <ul className="sel-list" role="listbox" aria-label={label} tabIndex={-1}>
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`sel-option ${index === active ? "sel-active" : ""} ${
                option.value === value ? "sel-chosen" : ""
              }`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(index);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
