import { describe, expect, it } from "vitest";
import { detectSystemLanguage } from "../../src/lib/nativeBridge";

describe("detectSystemLanguage", () => {
  it.each(["zh", "zh-CN", "zh-Hans-CN", "zh_Hant_TW"])("classifies %s as Chinese", (language) => {
    expect(detectSystemLanguage([language])).toBe("zh-CN");
  });

  it.each(["en-US", "fr-FR", "ja-JP", ""])("classifies %s as non-Chinese", (language) => {
    expect(detectSystemLanguage([language])).toBe("en");
  });
});
