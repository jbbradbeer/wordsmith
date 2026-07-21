import { FREE_SEARCH_LIMIT } from "@/lib/constants";

interface UsageBarProps {
  searchCount: number;
  isPaid: boolean;
  onUpgrade: () => void;
}

export default function UsageBar({
  searchCount,
  isPaid,
  onUpgrade,
}: UsageBarProps) {
  if (isPaid) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          background: "#8B691410",
          borderRadius: "8px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#8B6914",
          }}
        >
          &#9733; Pro
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            color: "#8A8478",
          }}
        >
          Unlimited searches
        </span>
      </div>
    );
  }

  const remaining = Math.max(0, FREE_SEARCH_LIMIT - searchCount);
  const pct = (searchCount / FREE_SEARCH_LIMIT) * 100;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "6px 0",
      }}
    >
      <div
        role="progressbar"
        aria-valuenow={searchCount}
        aria-valuemin={0}
        aria-valuemax={FREE_SEARCH_LIMIT}
        aria-label={`${remaining} of ${FREE_SEARCH_LIMIT} daily free searches remaining`}
        style={{
          flex: 1,
          maxWidth: "120px",
          height: "4px",
          background: "#E8E2D8",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            background:
              remaining === 0
                ? "#C0392B"
                : remaining === 1
                ? "#D4A017"
                : "#8B6914",
            borderRadius: "2px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          color: remaining === 0 ? "#C0392B" : "#8A8478",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {remaining === 0 ? (
          <button
            onClick={onUpgrade}
            aria-label="You've used all of today's free searches. Upgrade to Pro for unlimited access."
            style={{
              background: "none",
              border: "none",
              color: "#8B6914",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              padding: 0,
            }}
          >
            0 left — Upgrade
          </button>
        ) : (
          `${remaining} of ${FREE_SEARCH_LIMIT} free searches left today`
        )}
      </span>
    </div>
  );
}
