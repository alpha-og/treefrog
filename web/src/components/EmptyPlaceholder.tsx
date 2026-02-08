import { Settings } from "lucide-react";

export default function EmptyPlaceholder() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "16px",
        color: "var(--ink-secondary)",
      }}
    >
      <Settings size={48} style={{ opacity: 0.3 }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
          All panes hidden
        </div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>
          Use the panel icons in the toolbar to show panes
        </div>
      </div>
    </div>
  );
}
