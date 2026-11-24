import type { ReactNode } from "react";

type StatusMessageProps = {
  tone: "loading" | "empty" | "error";
  title: string;
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
};

export function StatusMessage({ tone, title, children, action }: StatusMessageProps) {
  const role = tone === "error" ? "alert" : "status";
  return (
    <div className={`status status--${tone}`} role={role} aria-live="polite">
      <p className="status__title">{title}</p>
      {children ? <p className="status__body">{children}</p> : null}
      {action ? (
        <button type="button" className="button button--secondary" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
