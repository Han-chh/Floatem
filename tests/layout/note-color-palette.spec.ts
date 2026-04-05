import { expect, test, type Page } from "@playwright/test";

async function boot(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 420, height: 430 });
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

test("note text color palette stays fully visible in a compact window", async ({ page }) => {
  await boot(page);

  await page.getByRole("button", { name: "Add note" }).click();

  const note = page.getByTestId("note-card").first();
  const colorButton = note.getByRole("button", { name: "Color", exact: true });

  await colorButton.dispatchEvent("pointerdown");

  const palette = page.getByTestId("note-text-color-palette");
  await expect(palette).toBeVisible();

  const viewport = page.viewportSize();
  const colorButtonBox = await colorButton.boundingBox();
  const paletteBox = await palette.boundingBox();
  const moreColorsButton = palette.getByRole("button", { name: "More Colors" });
  const moreColorsButtonBox = await moreColorsButton.boundingBox();

  await moreColorsButton.click();

  const expandedPaletteBox = await palette.boundingBox();
  const showColorsButton = palette.getByRole("button", { name: "Show Colors" });
  const showColorsButtonBox = await showColorsButton.boundingBox();

  expect(viewport).not.toBeNull();
  expect(colorButtonBox).not.toBeNull();
  expect(paletteBox).not.toBeNull();
  expect(moreColorsButtonBox).not.toBeNull();
  expect(expandedPaletteBox).not.toBeNull();
  expect(showColorsButtonBox).not.toBeNull();

  expect(paletteBox!.x).toBeGreaterThanOrEqual(0);
  expect(paletteBox!.y).toBeGreaterThanOrEqual(0);
  expect(paletteBox!.x + paletteBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(paletteBox!.y + paletteBox!.height).toBeLessThanOrEqual(viewport!.height);
  expect(Math.abs(paletteBox!.x + paletteBox!.width / 2 - (colorButtonBox!.x + colorButtonBox!.width / 2))).toBeLessThan(96);
  expect(moreColorsButtonBox!.x).toBeGreaterThanOrEqual(paletteBox!.x);
  expect(moreColorsButtonBox!.y).toBeGreaterThanOrEqual(paletteBox!.y);
  expect(moreColorsButtonBox!.x + moreColorsButtonBox!.width).toBeLessThanOrEqual(paletteBox!.x + paletteBox!.width);
  expect(moreColorsButtonBox!.y + moreColorsButtonBox!.height).toBeLessThanOrEqual(paletteBox!.y + paletteBox!.height);

  expect(expandedPaletteBox!.x).toBeGreaterThanOrEqual(0);
  expect(expandedPaletteBox!.y).toBeGreaterThanOrEqual(0);
  expect(expandedPaletteBox!.x + expandedPaletteBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(expandedPaletteBox!.y + expandedPaletteBox!.height).toBeLessThanOrEqual(viewport!.height);
  expect(showColorsButtonBox!.x).toBeGreaterThanOrEqual(expandedPaletteBox!.x);
  expect(showColorsButtonBox!.y).toBeGreaterThanOrEqual(expandedPaletteBox!.y);
  expect(showColorsButtonBox!.x + showColorsButtonBox!.width).toBeLessThanOrEqual(expandedPaletteBox!.x + expandedPaletteBox!.width);
  expect(showColorsButtonBox!.y + showColorsButtonBox!.height).toBeLessThanOrEqual(expandedPaletteBox!.y + expandedPaletteBox!.height);
});
