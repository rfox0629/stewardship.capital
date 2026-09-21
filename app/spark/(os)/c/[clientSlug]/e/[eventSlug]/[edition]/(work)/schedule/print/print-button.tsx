"use client";

/** The one control on the print preview. Everything else is the paper. */
export function PrintButton() {
  return (
    <button type="button" className="ev-submit" onClick={() => window.print()}>
      Print
    </button>
  );
}
