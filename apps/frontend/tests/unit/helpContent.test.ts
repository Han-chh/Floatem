import { describe, expect, it } from "vitest";
import {
  buildHelpDialogContent,
  type HelpContentContext,
  type HelpDialogContent,
} from "../../src/content/helpContent";

function buildContext(
  language: HelpContentContext["language"],
  platform: HelpContentContext["platform"] = "macos",
): HelpContentContext {
  return {
    appName: "Floatem",
    defaultSectionLabel: language === "zh-CN" ? "打开上次工作区" : "Open the last workspace",
    hotkey: "Option+Shift+Space",
    isNativeHost: platform !== "web",
    language,
    motionLabel: language === "zh-CN" ? "上浮 · 适中" : "Lift · Medium",
    platform,
    reminderSoundLabel: language === "zh-CN" ? "提醒声音已开启" : "Reminder sound on",
    timeFormatLabel: language === "zh-CN" ? "24 小时制" : "24-hour time",
    timeZoneLabel: "Asia/Shanghai",
  };
}

function contentShape(content: HelpDialogContent) {
  return content.sections.map((section) => ({
    id: section.id,
    articles: section.articles.map((article) => ({
      id: article.id,
      groups: article.groups.map((group) => ({ id: group.id, itemCount: group.items.length })),
    })),
  }));
}

function serializedContent(language: HelpContentContext["language"], platform: HelpContentContext["platform"]) {
  return JSON.stringify(buildHelpDialogContent(buildContext(language, platform)));
}

describe("helpContent", () => {
  it.each(["macos", "windows", "web"] as const)(
    "keeps the English and Chinese information architecture aligned on %s",
    (platform) => {
      const english = buildHelpDialogContent(buildContext("en", platform));
      const chinese = buildHelpDialogContent(buildContext("zh-CN", platform));

      expect(contentShape(chinese)).toEqual(contentShape(english));
      expect(english.sections.map((section) => section.id)).toEqual([
        "overview",
        "notes",
        "todos",
        "floating",
        "settings",
        "shortcuts",
      ]);
    },
  );

  it.each(["macos", "windows", "web"] as const)(
    "does not embed release numbers or version labels in %s instructions",
    (platform) => {
      const english = serializedContent("en", platform);
      const chinese = serializedContent("zh-CN", platform);

      expect(english).not.toMatch(/\bv?\d+\.\d+(?:\.\d+)?\b/i);
      expect(english).not.toMatch(/\bversion\b/i);
      expect(chinese).not.toMatch(/\bv?\d+\.\d+(?:\.\d+)?\b/i);
      expect(chinese).not.toContain("版本");
    },
  );

  it("documents the current macOS access and recovery paths in both languages", () => {
    const english = serializedContent("en", "macos");
    const chinese = serializedContent("zh-CN", "macos");

    expect(english).toContain("without a Dock icon");
    expect(english).toContain("Reload Interface");
    expect(english).toContain("right-click");
    expect(chinese).toContain("不会显示在 Dock 中");
    expect(chinese).toContain("重新加载界面");
    expect(chinese).toContain("右键");
  });

  it("describes rich-text clipboard behavior and the complete note toolbar", () => {
    const english = serializedContent("en", "macos");
    const chinese = serializedContent("zh-CN", "macos");

    expect(english).toContain("clear formatting");
    expect(english).toContain("Copy preserves supported rich-text styles");
    expect(english).toContain("instead of applying the toolbar’s currently selected style");
    expect(chinese).toContain("清除格式");
    expect(chinese).toContain("复制会保留受支持的富文本样式");
    expect(chinese).toContain("不会套用工具栏当前选中的样式");
  });

  it("uses timeless platform availability wording", () => {
    const english = serializedContent("en", "windows");
    const chinese = serializedContent("zh-CN", "windows");

    expect(english).toContain("Notes and todos remain in the main Floatem window on Windows");
    expect(chinese).toContain("在 Windows 上，notes 和 todos 会保留在 Floatem 主窗口中");
  });
});
