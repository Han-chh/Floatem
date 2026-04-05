import { expect, test, type Locator, type Page } from "@playwright/test";

const VIEWPORTS = [
  { width: 300, height: 560, label: "compact" },
  { width: 360, height: 560, label: "regular" },
  { width: 420, height: 640, label: "wide" },
  { width: 560, height: 760, label: "expanded" },
] as const;

const LONG_NOTE = "Supercalifragilisticexpialidocious-note-title-".repeat(4);
const LONG_TODO = "Follow up with the product team about the responsive layout edge cases ".repeat(3).trim();

async function bootPreview(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

async function expectWithinViewport(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();

  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    const panel = document.querySelector<HTMLElement>("[data-testid='panel-scroll-region']");

    return {
      page: doc.scrollWidth > doc.clientWidth + 1,
      panel: panel ? panel.scrollWidth > panel.clientWidth + 1 : false,
    };
  });

  expect(overflow.page).toBeFalsy();
  expect(overflow.panel).toBeFalsy();
}

async function expectNoSelfOverflow(locator: Locator) {
  const hasOverflow = await locator.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  expect(hasOverflow).toBeFalsy();
}

for (const viewport of VIEWPORTS) {
  test.describe(`responsive layout @ ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("notes layout keeps controls and title visible", async ({ page }) => {
      await bootPreview(page);

      await page.getByRole("button", { name: "Add note" }).click();
      const title = page.getByLabel("Note title");
      await title.fill(LONG_NOTE);

      await expectWithinViewport(page, title);
      await expectWithinViewport(page, page.getByTestId("note-card").first());
      await expectWithinViewport(page, page.getByRole("button", { name: "Collapse note" }));
      await expectWithinViewport(page, page.getByRole("button", { name: "Delete note" }));
      await expectNoSelfOverflow(title);
      await expectNoHorizontalOverflow(page);
    });

    test("todos layout keeps text, reminder control, and actions visible", async ({ page }) => {
      await bootPreview(page);

      await page.getByRole("tab", { name: "Todos" }).click();
      const draft = page.getByLabel("Quick add");
      await draft.fill(LONG_TODO);
      await draft.press("Meta+Enter");

      const todoCard = page.getByTestId("todo-item").first();
      await expect(todoCard).toBeVisible();

      await expectWithinViewport(page, page.getByRole("button", { name: "Complete task" }));
      await expectWithinViewport(page, page.getByRole("button", { name: "Delete todo" }));
      await expectWithinViewport(page, page.getByRole("button", { name: "Set reminder" }));
      await expectNoSelfOverflow(draft);
      await expectNoHorizontalOverflow(page);
    });

    test("settings view stays readable without horizontal overflow", async ({ page }) => {
      await bootPreview(page);

      await page.getByRole("button", { name: "Settings" }).click();
      const panel = page.getByTestId("settings-panel");
      const scrollRegion = page.getByTestId("settings-scroll-region");
      const closeButton = panel.getByRole("button", { name: "Close", exact: true });
      await expect(panel).toBeVisible();

      await expectWithinViewport(page, closeButton);
      await expectWithinViewport(page, panel.getByRole("button", { name: "Change" }));
      await expectWithinViewport(page, panel.getByText(/Unset|x \d+\s+y \d+/));
      await panel.getByRole("button", { name: "Change" }).click();
      const dialog = panel.getByRole("dialog", { name: "Change global shortcut" });
      await expectWithinViewport(page, dialog);
      await expectWithinViewport(page, panel.getByText("Waiting for input..."));
      await panel.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      await scrollRegion.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expectWithinViewport(page, closeButton);
      await expectWithinViewport(page, panel.getByRole("button", { name: "Restore defaults" }));
      await expectNoHorizontalOverflow(page);
    });
  });
}
