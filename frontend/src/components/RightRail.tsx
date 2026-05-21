import { v1 } from "../tokens";
import type { ContextItem, ChatSession } from "../types/api";

interface RightRailProps {
  contextItems: ContextItem[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  hoveredCitation: number | null;
  onCitationHover: (n: number | null) => void;
}

function formatSessionTime(updatedAt: number): string {
  const d = new Date(updatedAt);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function RightRail({
  contextItems,
  sessions,
  activeSessionId,
  onSelectSession,
  hoveredCitation,
  onCitationHover,
}: RightRailProps) {
  return (
    <div
      style={{
        width: 340,
        borderLeft: `1px solid ${v1.border}`,
        background: v1.panel,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Context header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: `1px solid ${v1.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              color: v1.textMute,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Context Used
          </span>
          {contextItems.length > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 4,
                background: v1.surface,
                color: v1.accent,
                fontWeight: 600,
              }}
            >
              {contextItems.length}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: v1.textMute }}>
          {contextItems.length > 0
            ? "Hover a citation to highlight its source ↓"
            : "Sources will appear here after a search"}
        </div>
      </div>

      {/* Source cards — flex 1 so they fill the space above history */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 12px 4px",
          minHeight: 0,
        }}
      >
        {contextItems.map((item, idx) => {
          const n = idx + 1;
          const isHighlighted = hoveredCitation === n;

          return (
            <div
              key={`${item.title}-${idx}`}
              onMouseEnter={() => onCitationHover(n)}
              onMouseLeave={() => onCitationHover(null)}
              style={{
                padding: "11px 12px",
                borderRadius: 9,
                marginBottom: 8,
                background: isHighlighted ? v1.accentSoft : v1.surface,
                border: `1px solid ${isHighlighted ? v1.accentBorder : v1.border}`,
                transition: "background 0.15s, border-color 0.15s",
                cursor: "pointer",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                {/* Citation number badge */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: v1.accentSoft,
                    color: v1.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 10,
                    border: `1px solid ${v1.accentBorder}`,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {n}
                </div>

                {/* Title + path */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: v1.text,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{ fontSize: 11, color: v1.textMute, marginTop: 2 }}
                  >
                    {item.path}
                    {item.page != null ? ` · p. ${item.page}` : ""}
                  </div>
                </div>

                {/* Type badge */}
                <div
                  style={{
                    fontSize: 10,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: v1.panel,
                    color: v1.textDim,
                    border: `1px solid ${v1.border}`,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}
                >
                  {item.type}
                </div>
              </div>

              {/* Snippet preview — expands on hover */}
              {item.text && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: v1.textDim,
                    lineHeight: 1.5,
                    padding: "8px 10px",
                    background: v1.snippetBg,
                    borderRadius: 6,
                    border: `1px solid ${v1.border}`,
                    fontFamily: "'Source Serif 4', serif",
                    maxHeight: isHighlighted ? 200 : 56,
                    overflow: "hidden",
                    position: "relative",
                    transition: "max-height 0.2s ease",
                  }}
                >
                  {item.text}
                  {!isHighlighted && (
                    <div
                      style={{
                        position: "absolute",
                        inset: "auto 0 0 0",
                        height: 24,
                        background: `linear-gradient(to bottom, transparent, ${v1.snippetBg})`,
                      }}
                    />
                  )}
                </div>
              )}

              {/* Footer: relevance + actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    color: v1.textMute,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {item.relevance != null
                    ? `relevance ${item.relevance.toFixed(2)}`
                    : "retrieved"}
                </div>
                <button
                  style={{
                    fontSize: 10.5,
                    padding: "3px 8px",
                    borderRadius: 5,
                    background: "transparent",
                    border: `1px solid ${v1.border}`,
                    color: v1.textDim,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open ↗
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* History section */}
      <div
        style={{
          borderTop: `1px solid ${v1.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: v1.textMute }}>Chat history</span>
          <span style={{ fontSize: 11, color: v1.textMute }}>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ padding: "2px 10px 12px", maxHeight: 190, overflow: "auto" }}>
          {sessions.slice(0, 6).map((session) => {
            const isActive = session.id === activeSessionId;
            const time = formatSessionTime(session.updatedAt);

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isActive ? v1.accentSoft : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      v1.surfaceHi;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: v1.textMute,
                    fontFamily: "'JetBrains Mono', monospace",
                    width: 44,
                    flexShrink: 0,
                  }}
                >
                  {time}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: isActive ? v1.text : v1.textDim,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {session.title}
                </span>
                <span style={{ fontSize: 10, color: v1.textMute, flexShrink: 0 }}>
                  {session.messages.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
