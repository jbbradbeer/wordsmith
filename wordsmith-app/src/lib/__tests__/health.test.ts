import { describe, it, expect } from "vitest";
import { overallStatus } from "../health";

describe("overallStatus", () => {
  it("ok when everything passes", () => {
    expect(overallStatus({ env: "ok", supabase: "ok", anthropic: "ok" })).toEqual({
      status: "ok",
      http: 200,
    });
  });

  it("down (503) when env is missing", () => {
    expect(overallStatus({ env: "fail", supabase: "ok", anthropic: "ok" }).status).toBe("down");
    expect(overallStatus({ env: "fail", supabase: "ok", anthropic: "ok" }).http).toBe(503);
  });

  it("down (503) when supabase is unreachable", () => {
    expect(overallStatus({ env: "ok", supabase: "fail", anthropic: "ok" }).status).toBe("down");
  });

  it("degraded (503) when only anthropic fails", () => {
    expect(overallStatus({ env: "ok", supabase: "ok", anthropic: "fail" })).toEqual({
      status: "degraded",
      http: 503,
    });
  });

  it("a skipped anthropic check does not fail the verdict", () => {
    expect(overallStatus({ env: "ok", supabase: "ok", anthropic: "skip" }).status).toBe("ok");
  });

  it("env failure outranks an anthropic failure", () => {
    expect(overallStatus({ env: "fail", supabase: "ok", anthropic: "fail" }).status).toBe("down");
  });
});
