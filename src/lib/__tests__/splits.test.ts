import { describe, it, expect } from "vitest";
import { splitEqually } from "@/lib/splits";

describe("splitEqually", () => {
  it("splits evenly when no remainder", () => {
    const result = splitEqually(300, ["a", "b", "c"]);
    expect(result.get("a")).toBe(100);
    expect(result.get("b")).toBe(100);
    expect(result.get("c")).toBe(100);
  });

  it("distributes remainder cents to first participants by sorted ID", () => {
    // 100 / 3 = 33 base, 1 cent remainder → first participant gets 34
    const result = splitEqually(100, ["c", "a", "b"]);
    expect(result.get("a")).toBe(34); // sorted first
    expect(result.get("b")).toBe(33);
    expect(result.get("c")).toBe(33);
    const total = [...result.values()].reduce((s, v) => s + v, 0);
    expect(total).toBe(100);
  });

  it("handles 2-cent remainder with 3 participants", () => {
    // 101 / 3 = 33 base, 2 cent remainder → first 2 get 34
    const result = splitEqually(101, ["a", "b", "c"]);
    expect(result.get("a")).toBe(34);
    expect(result.get("b")).toBe(34);
    expect(result.get("c")).toBe(33);
    const total = [...result.values()].reduce((s, v) => s + v, 0);
    expect(total).toBe(101);
  });

  it("returns empty map for empty participant list", () => {
    const result = splitEqually(500, []);
    expect(result.size).toBe(0);
  });
});
