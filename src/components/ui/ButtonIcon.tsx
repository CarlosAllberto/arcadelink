export function ButtonIcon({ label }: { label: "A" | "B" | "X" | "Y" | "L" | "R" }) {
  return (
    <span className="button-icon" aria-hidden="true">
      {label}
    </span>
  );
}
