import { Fragment } from "react";

/** Renders **emphasis** markers from message strings as <strong>. */
export function RichText({ text, strongClassName }: { text: string; strongClassName?: string }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className={strongClassName}>
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
