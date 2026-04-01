import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("prepare-native-web-assets", () => {
  it("inlines bundled entry assets while preserving copied files", () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "quicknote-native-web-"));
    const distDir = path.join(fixtureRoot, "dist");
    const outputDir = path.join(fixtureRoot, "native-web");
    const assetsDir = path.join(distDir, "assets");

    try {
      mkdirSync(assetsDir, { recursive: true });

      writeFileSync(path.join(assetsDir, "app.css"), "body { color: rgb(1, 2, 3); }");
      writeFileSync(
        path.join(assetsDir, "app.js"),
        'console.log("</script>inline-safe"); const marker = "$&/ should stay literal";',
      );
      writeFileSync(
        path.join(distDir, "index.html"),
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Fixture</title>
    <link rel="stylesheet" href="./assets/app.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/app.js"></script>
  </body>
</html>
`,
      );

      execFileSync(process.execPath, ["scripts/prepare-native-web-assets.mjs", distDir, outputDir], {
        cwd: process.cwd(),
      });

      const outputHtml = readFileSync(path.join(outputDir, "index.html"), "utf8");

      expect(outputHtml).toContain('data-quicknote-inline="./assets/app.css"');
      expect(outputHtml).toContain('data-quicknote-inline="./assets/app.js"');
      expect(outputHtml).not.toContain('<link rel="stylesheet" href="./assets/app.css">');
      expect(outputHtml).not.toContain('<script type="module" src="./assets/app.js"></script>');
      expect(outputHtml).toContain('console.log("<\\/script>inline-safe");');
      expect(outputHtml).toContain('const marker = "$&/ should stay literal";');
      expect(outputHtml).not.toContain('</body>/ should stay literal');
      expect(existsSync(path.join(outputDir, "assets", "app.css"))).toBe(true);
      expect(existsSync(path.join(outputDir, "assets", "app.js"))).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
