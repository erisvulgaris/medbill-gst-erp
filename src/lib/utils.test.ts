import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn — class merge utility", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-1", "text-sm")).toBe("px-2 py-1 text-sm");
  });

  it("deduplicates conflicting Tailwind classes (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles arrays via clsx", () => {
    expect(cn(["px-2", "py-1"], "text-sm")).toBe("px-2 py-1 text-sm");
  });
});
