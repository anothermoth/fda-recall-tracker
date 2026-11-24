type ClassificationBadgeProps = {
  classification: string | null;
};

export function ClassificationBadge({ classification }: ClassificationBadgeProps) {
  const label = classification?.trim() || "Unclassified";
  const tone = toneFor(label);

  return <span className={`badge badge--${tone}`}>{label}</span>;
}

function toneFor(label: string): "i" | "ii" | "iii" | "neutral" {
  const normalized = label.replace(/\s+/g, " ").toLowerCase();
  if (normalized === "class i") return "i";
  if (normalized === "class ii") return "ii";
  if (normalized === "class iii") return "iii";
  return "neutral";
}
