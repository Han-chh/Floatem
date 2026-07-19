import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

function usage() {
  console.error("usage: node scripts/prepare-native-web-assets.mjs <dist-dir> <output-dir>");
  process.exit(1);
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] ?? null;
}

function resolveAssetPath(distDir, reference) {
  const cleanReference = reference.split("#")[0].split("?")[0];

  if (!cleanReference) {
    throw new Error(`Unable to resolve an empty asset reference from "${reference}".`);
  }

  if (/^(?:https?:)?\/\//i.test(cleanReference) || cleanReference.startsWith("data:")) {
    throw new Error(`Only local bundled assets can be inlined, but found "${reference}".`);
  }

  const relativePath = cleanReference.startsWith("/")
    ? cleanReference.replace(/^\/+/, "")
    : cleanReference;

  const absolutePath = path.resolve(distDir, relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Bundled asset "${reference}" does not exist at "${absolutePath}".`);
  }

  return absolutePath;
}

function injectBeforeClosingTag(html, tagName, content) {
  const pattern = new RegExp(`</${tagName}>`, "i");

  if (pattern.test(html)) {
    return html.replace(pattern, (match) => `${content}\n${match}`);
  }

  return `${html}\n${content}`;
}

function sanitizeInlineScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

function sanitizeInlineStyle(source) {
  return source.replace(/<\/style/gi, "<\\/style");
}

const [, , distDirArg, outputDirArg] = process.argv;

if (!distDirArg || !outputDirArg) {
  usage();
}

const distDir = path.resolve(distDirArg);
const outputDir = path.resolve(outputDirArg);
const requiredHTMLPath = path.join(distDir, "index.html");
if (!existsSync(requiredHTMLPath)) {
  throw new Error(`Missing Vite build output at "${requiredHTMLPath}". Run the frontend build first.`);
}

const htmlFilenames = ["index.html", "floating.html"].filter((filename) =>
  existsSync(path.join(distDir, filename)),
);

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(distDir, outputDir, { recursive: true });

for (const filename of htmlFilenames) {
  let html = readFileSync(path.join(distDir, filename), "utf8");
  const inlineStyles = [];
  const inlineScripts = [];

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
  const rel = getAttribute(tag, "rel")?.toLowerCase();
  const href = getAttribute(tag, "href");

  if (rel !== "stylesheet" || !href) {
    return tag;
  }

  const assetPath = resolveAssetPath(distDir, href);
  inlineStyles.push({
    href,
    content: readFileSync(assetPath, "utf8"),
  });

  return "";
  });

  html = html.replace(/<script\b[^>]*>\s*<\/script>/gi, (tag) => {
  const type = getAttribute(tag, "type")?.toLowerCase();
  const src = getAttribute(tag, "src");

  if (type !== "module" || !src) {
    return tag;
  }

  const assetPath = resolveAssetPath(distDir, src);
  inlineScripts.push({
    src,
    content: readFileSync(assetPath, "utf8"),
  });

  return "";
  });

  const styleTags = inlineStyles
  .map(
    ({ href, content }) =>
      `    <style data-stickit-inline="${href}">\n${sanitizeInlineStyle(content)}\n    </style>`,
  )
  .join("\n");

  const scriptTags = inlineScripts
  .map(
    ({ src, content }) =>
      `    <script type="module" data-stickit-inline="${src}">\n${sanitizeInlineScript(content)}\n    </script>`,
  )
  .join("\n");

  if (styleTags) {
    html = injectBeforeClosingTag(html, "head", styleTags);
  }

  if (scriptTags) {
    html = injectBeforeClosingTag(html, "body", scriptTags);
  }

  writeFileSync(path.join(outputDir, filename), html);
}
