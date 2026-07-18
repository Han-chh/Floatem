import { expect, test, type Locator, type Page } from "@playwright/test";

const VIEWPORTS = [
  { width: 300, height: 560, label: "compact" },
  { width: 360, height: 560, label: "regular" },
  { width: 420, height: 640, label: "wide" },
  { width: 560, height: 760, label: "expanded" },
] as const;

const LONG_NOTE = "Supercalifragilisticexpialidocious-note-title-".repeat(4);
const LONG_TODO = "Follow up with the product team about the responsive layout edge cases ".repeat(3).trim();
const GROUP_COLORS = ["#2F6BFF", "#1FA87A", "#F4B942", "#7B5CFA", "#FF7A59", "#3F9CA8"];

function createDenseGroupFixture(groupCount = 18) {
  const now = Date.now();
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const id = `Group ${index + 1}`;

    return {
      id,
      name: id,
      color: GROUP_COLORS[index % GROUP_COLORS.length] ?? GROUP_COLORS[0],
      createdAt: now + index,
      updatedAt: now + index,
    };
  });

  const cards = groups.map((group, index) => ({
    id: `note-${index + 1}`,
    title: `${group.name} note`,
    dotColor: group.color,
    groupId: group.id,
    collapsed: false,
    content: [{ type: "paragraph", children: [{ text: `${group.name} details` }] }],
    createdAt: now + index,
    updatedAt: now + index,
  }));

  return { cards, groups };
}

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

async function seedNotes(page: Page, notes: unknown) {
  await page.addInitScript((seed) => {
    window.localStorage.setItem("stickit.notes", JSON.stringify(seed));
  }, notes);
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

async function expectFirstTodoCardHoverWithinScrollRegion(page: Page) {
  const scrollRegion = page.getByTestId("todo-card-scroll-region");
  const todoCard = scrollRegion.getByTestId("todo-item").first();
  await scrollRegion.evaluate((element) => {
    element.scrollTop = 0;
  });
  await todoCard.dispatchEvent("pointerover");
  const bounds = await scrollRegion.evaluate((element) => {
    const card = element.querySelector<HTMLElement>("[data-testid='todo-item']");
    if (!card) {
      return null;
    }

    let list = card.parentElement;
    while (list && list !== element && parseFloat(window.getComputedStyle(list).paddingTop) < 1) {
      list = list.parentElement;
    }
    const cardBox = card.getBoundingClientRect();
    const listBox = list?.getBoundingClientRect();
    const scrollBox = element.getBoundingClientRect();

    return {
      cardLeft: cardBox.left,
      cardRight: cardBox.right,
      cardTop: cardBox.top,
      listPaddingTop: list ? parseFloat(window.getComputedStyle(list).paddingTop) : 0,
      listTop: listBox?.top ?? cardBox.top,
      scrollLeft: scrollBox.left,
      scrollRight: scrollBox.right,
    };
  });

  expect(bounds).not.toBeNull();
  expect(bounds!.cardLeft).toBeGreaterThanOrEqual(bounds!.scrollLeft + 1);
  expect(bounds!.cardRight).toBeLessThanOrEqual(bounds!.scrollRight - 1);
  expect(bounds!.listPaddingTop).toBeGreaterThanOrEqual(7);
  expect(bounds!.cardTop).toBeGreaterThanOrEqual(bounds!.listTop + bounds!.listPaddingTop - 3);
}

async function expectFirstNoteCardHoverWithinScrollRegion(page: Page) {
  const scrollRegion = page.getByTestId("note-card-scroll-region");
  const noteCard = scrollRegion.getByTestId("note-card").first();
  await scrollRegion.evaluate((element) => {
    element.scrollTop = 0;
  });
  await noteCard.hover();
  const bounds = await scrollRegion.evaluate((element) => {
    const card = element.querySelector<HTMLElement>("[data-testid='note-card']");
    if (!card) {
      return null;
    }

    const list = card.parentElement;
    const cardBox = card.getBoundingClientRect();
    const listBox = list?.getBoundingClientRect();
    const scrollBox = element.getBoundingClientRect();

    return {
      cardLeft: cardBox.left,
      cardRight: cardBox.right,
      cardTop: cardBox.top,
      listPaddingTop: list ? parseFloat(window.getComputedStyle(list).paddingTop) : 0,
      listTop: listBox?.top ?? cardBox.top,
      scrollLeft: scrollBox.left,
      scrollRight: scrollBox.right,
    };
  });

  expect(bounds).not.toBeNull();
  expect(bounds!.cardLeft).toBeGreaterThanOrEqual(bounds!.scrollLeft + 1);
  expect(bounds!.cardRight).toBeLessThanOrEqual(bounds!.scrollRight - 1);
  expect(bounds!.listPaddingTop).toBeGreaterThanOrEqual(7);
  expect(bounds!.cardTop).toBeGreaterThanOrEqual(bounds!.listTop + bounds!.listPaddingTop - 3);
}

async function expectSettingsSecondaryHeaderLayout(panel: Locator) {
  const layout = await panel.evaluate((element) => {
    const scrollRegion = element.querySelector<HTMLElement>("[data-testid='settings-scroll-region']");
    const icon = element.querySelector<HTMLElement>("[data-testid='settings-category-toolbar-icon']");
    const titleFrame = element.querySelector<HTMLElement>("[data-testid='settings-category-title-frame']");
    const allSettingsButton = Array.from(element.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "All settings",
    );

    if (!scrollRegion || !icon || !titleFrame || !allSettingsButton) {
      return null;
    }

    const scrollStyles = window.getComputedStyle(scrollRegion);
    const scrollContentWidth =
      scrollRegion.clientWidth - parseFloat(scrollStyles.paddingLeft) - parseFloat(scrollStyles.paddingRight);
    const iconBox = icon.getBoundingClientRect();
    const buttonBox = allSettingsButton.getBoundingClientRect();
    const titleFrameBox = titleFrame.getBoundingClientRect();

    return {
      buttonLeft: buttonBox.left,
      buttonRight: buttonBox.right,
      iconLeft: iconBox.left,
      scrollContentWidth,
      titleFrameWidth: titleFrameBox.width,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.buttonLeft).toBeLessThan(layout!.iconLeft);
  expect(layout!.iconLeft).toBeGreaterThanOrEqual(layout!.buttonRight + 6);
  expect(layout!.titleFrameWidth).toBeGreaterThanOrEqual(layout!.scrollContentWidth - 2);
}

for (const viewport of VIEWPORTS) {
  test.describe(`responsive layout @ ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("notes layout keeps controls and title visible", async ({ page }) => {
      await bootPreview(page);

      await expectWithinViewport(page, page.getByRole("button", { name: "Filter groups" }));
      await page.getByRole("button", { name: "Add note" }).click();
      const title = page.getByLabel("Note title");
      await title.fill(LONG_NOTE);

      await expectWithinViewport(page, title);
      const noteCard = page.getByTestId("note-card").first();
      await expectWithinViewport(page, noteCard);
      await expectFirstNoteCardHoverWithinScrollRegion(page);
      await expectWithinViewport(page, page.getByRole("button", { name: "Collapse note" }));
      await expectWithinViewport(page, page.getByRole("button", { name: "Delete note" }));
      await page.getByRole("button", { name: "Filter groups" }).click();
      await expectWithinViewport(page, page.getByRole("dialog", { name: "Filter groups" }));
      await expectNoSelfOverflow(title);
      await expectNoHorizontalOverflow(page);
    });

    test("group filter dialog grows until two thirds of the window and then scrolls", async ({ page }) => {
      await seedNotes(page, createDenseGroupFixture());
      await bootPreview(page);

      await page.getByRole("button", { name: "Filter groups" }).click();

      const dialog = page.getByRole("dialog", { name: "Filter groups" });
      const scrollRegion = page.getByTestId("note-group-filter-scroll-region");
      await expectWithinViewport(page, dialog);
      await expect(scrollRegion).toBeVisible();

      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.height).toBeLessThanOrEqual(viewport.height * (2 / 3) + 2);

      const overflow = await scrollRegion.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);
      await expectNoHorizontalOverflow(page);
    });

    test("note group dialog stays fixed, matches reminder dialog height, and scroll hint buttons jump to bottom and top", async ({ page }) => {
      await seedNotes(page, createDenseGroupFixture());
      await bootPreview(page);

      await page.getByRole("button", { name: "Change note group" }).first().click();

      const dialog = page.getByRole("dialog", { name: "Manage groups" });
      const scrollRegion = page.getByTestId("note-group-dialog-scroll-region");
      const scrollIndicator = page.getByTestId("note-group-dialog-scroll-indicator");
      const scrollToBottomButton = page.getByRole("button", { name: "Scroll to bottom" });
      await expectWithinViewport(page, dialog);
      await expect(scrollRegion).toBeVisible();
      await expect(scrollIndicator).toBeVisible();
      await expect(scrollIndicator).toHaveAttribute("data-scroll-direction", "down");
      await expect(scrollToBottomButton).toBeVisible();

      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.height).toBeLessThanOrEqual(viewport.height - 30);

      const overflow = await scrollRegion.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);

      await scrollToBottomButton.click();
      await expect.poll(() =>
        scrollRegion.evaluate((element) => Math.round(element.scrollTop))
      ).toBeGreaterThan(0);
      await expect(scrollIndicator).toHaveAttribute("data-scroll-direction", "up");

      const scrollToTopButton = page.getByRole("button", { name: "Scroll to top" });
      await expect(scrollToTopButton).toBeVisible();
      await scrollToTopButton.click();
      await expect.poll(() =>
        scrollRegion.evaluate((element) => Math.round(element.scrollTop))
      ).toBe(0);
      await expect(scrollIndicator).toHaveAttribute("data-scroll-direction", "down");

      await expectNoHorizontalOverflow(page);
    });

    test("todos layout keeps text, reminder control, and actions visible", async ({ page }) => {
      await bootPreview(page);

      await page.getByRole("tab", { name: "Todos" }).click();
      const draft = page.getByLabel("Quick add");
      await draft.fill(LONG_TODO);
      await draft.press("Enter");

      const todoCard = page.getByTestId("todo-item").first();
      await expect(todoCard).toBeVisible();
      await expectFirstTodoCardHoverWithinScrollRegion(page);

      await expectWithinViewport(page, page.getByRole("button", { name: "Complete task" }));
      await expectWithinViewport(page, page.getByRole("button", { name: "Delete todo" }));
      await expectWithinViewport(page, page.getByRole("button", { name: "Set reminder" }));
      await page.getByRole("button", { name: "Set reminder" }).click();
      const dialog = page.getByRole("dialog", { name: "Set todo reminder" });
      await expectWithinViewport(page, dialog);
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.height).toBeLessThanOrEqual(viewport.height - 30);
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
      await expectWithinViewport(page, panel.getByRole("button", { name: "Shortcuts and launch" }));
      await expectWithinViewport(page, panel.getByRole("button", { name: /^About StickIt\b/ }));
      await panel.getByRole("button", { name: "Shortcuts and launch" }).click();
      await expectWithinViewport(page, panel.getByRole("heading", { name: "Shortcuts and launch" }));
      await expectWithinViewport(page, panel.getByTestId("settings-category-title-frame"));
      await expectSettingsSecondaryHeaderLayout(panel);
      await expectWithinViewport(page, panel.getByRole("button", { name: "Change" }));
      await panel.getByRole("button", { name: "Change" }).click();
      const dialog = panel.getByRole("dialog", { name: "Change global shortcut" });
      await expectWithinViewport(page, dialog);
      await expectWithinViewport(page, panel.getByText("Waiting for input..."));
      await panel.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      await panel.getByRole("button", { name: "All settings" }).click();
      await panel.getByRole("button", { name: /^About StickIt\b/ }).click();
      await expectWithinViewport(page, panel.getByRole("heading", { name: "About StickIt" }));
      await expectWithinViewport(page, panel.getByRole("heading", { name: "Data scope" }));
      await panel.getByRole("button", { name: "All settings" }).click();
      await expectWithinViewport(page, panel.getByRole("button", { name: "Restore defaults" }));
      await scrollRegion.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expectWithinViewport(page, panel.getByRole("button", { name: "Restore defaults" }));
      await expectNoHorizontalOverflow(page);
    });
  });
}
