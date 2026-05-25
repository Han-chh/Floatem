import { describe, expect, it } from "vitest";
import { getPlatformFeatures, platformFeatures } from "../../src/lib/platformFeatures";

describe("platformFeatures", () => {
  it("enables floating notes and todos on macOS", () => {
    expect(getPlatformFeatures("macos")).toEqual({
      floatingNotes: true,
      floatingTodos: true,
    });
  });

  it("disables floating notes and todos on Windows for v0.5.0", () => {
    expect(platformFeatures.windows).toEqual({
      floatingNotes: false,
      floatingTodos: false,
    });
  });
});
