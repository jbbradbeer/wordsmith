import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const config = { runtime: "edge" };

const BANDS: Record<string, { color: string; label: string }> = {
  clean: { color: "#1A7A6D", label: "CLEAN" },
  murky: { color: "#D4A017", label: "MURKY" },
  slop: { color: "#C0392B", label: "SLOP" },
};

export default function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const score = Math.max(0, Math.min(100, parseInt(searchParams.get("v") || "0", 10) || 0));
  const band = BANDS[searchParams.get("b") || ""] || BANDS.murky;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f2ede2", fontFamily: "Georgia" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#8A8478" }}>SLOP SCORE</div>
        <div style={{ fontSize: 220, fontWeight: 800, color: band.color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: band.color, letterSpacing: 4 }}>{band.label}</div>
        <div style={{ fontSize: 24, color: "#8A8478", marginTop: 24 }}>trywordsmith.com — de-slop your writing</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
