import { expect, test, type Page } from "@playwright/test";

async function boot(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `,
  });
}

test("notes toolbar supports formatting, copy, paste, clear, and select all", async ({ page }) => {
  await boot(page);

  await page.getByRole("button", { name: "Add note" }).click();

  const firstNote = page.getByTestId("note-card").first();
  const editor = firstNote.getByRole("textbox").nth(1);
  const boldButton = firstNote.getByRole("button", { name: "Bold" });
  const italicButton = firstNote.getByRole("button", { name: "Italic" });
  const underlineButton = firstNote.getByRole("button", { name: "Underline" });
  const copyButton = firstNote.getByRole("button", { name: "Copy" });
  const pasteButton = firstNote.getByRole("button", { name: "Paste" });
  const clearButton = firstNote.getByRole("button", { name: "Clear format" });

  await boldButton.hover();
  await expect(page.getByText("Cmd+B")).toBeVisible();
  await italicButton.hover();
  await expect(page.getByText("Cmd+I")).toBeVisible();
  await underlineButton.hover();
  await expect(page.getByText("Cmd+U")).toBeVisible();
  await copyButton.hover();
  await expect(page.getByText("Cmd+C")).toBeVisible();
  await pasteButton.hover();
  await expect(page.getByText("Cmd+V")).toBeVisible();

  await boldButton.click();
  await expect(boldButton).toHaveAttribute("aria-pressed", "true");
  await editor.click();
  await page.keyboard.type("Bold");
  await boldButton.click();
  await expect(boldButton).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.type(" plain");

  await page.keyboard.press("Meta+I");
  await expect(italicButton).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type(" Italic");
  await page.keyboard.press("Meta+I");
  await expect(italicButton).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Meta+U");
  await expect(underlineButton).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type(" Underline");
  await page.keyboard.press("Meta+U");
  await expect(underlineButton).toHaveAttribute("aria-pressed", "false");

  await copyButton.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("Bold plain Italic Underline");

  await page.keyboard.press("Meta+A");
  await clearButton.click();
  await expect(editor).toContainText("Bold plain Italic Underline");
  await expect(editor.locator("strong")).toHaveCount(0);
  await expect(editor.locator("em")).toHaveCount(0);
  await expect(editor.locator("u")).toHaveCount(0);

  await page.getByRole("button", { name: "Add note" }).click();
  const latestNote = page.getByTestId("note-card").first();
  const originalNote = page.getByTestId("note-card").nth(1);
  const originalEditor = originalNote.getByRole("textbox").nth(1);
  const secondEditor = latestNote.getByRole("textbox").nth(1);
  const secondPasteButton = latestNote.getByRole("button", { name: "Paste" });
  await secondEditor.click();
  await secondPasteButton.click();

  await expect(originalEditor).toContainText("Bold plain Italic Underline");
  await expect(secondEditor).toContainText("Bold plain Italic Underline");
  await expect(secondEditor.locator("strong")).toHaveCount(0);
  await expect(secondEditor.locator("em")).toHaveCount(0);
  await expect(secondEditor.locator("u")).toHaveCount(0);
});

test("todos draft supports Cmd+A, Cmd+C, and Cmd+V as plain-text shortcuts", async ({ page }) => {
  await boot(page);
  await page.getByRole("tab", { name: "Todos" }).click();

  const draft = page.getByLabel("Quick add");

  await draft.click();
  await page.keyboard.type("Ship docs");
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Meta+C");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("Ship docs");

  await page.keyboard.type("Replace me");
  await expect(draft).toHaveValue("Replace me");

  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Meta+V");
  await expect(draft).toHaveValue("Ship docs");
});
