import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx|js|jsx|css|scss|html)$/.test(entry.name)
        ? [path]
        : [];
  });
}

test("system UI assets follow the configured Vite base URL", () => {
  const applicationFiles = [...sourceFiles("src"), "index.html"];
  const offenders = applicationFiles
    .filter((path) => readFileSync(path, "utf8").includes("/assets/"));

  assert.deepEqual(offenders, []);

  const helper = readFileSync("src/utils/assetUrl.ts", "utf8");
  assert.match(helper, /import\.meta\.env\.BASE_URL/);
});

test("static manifest resources remain valid under a non-root base URL", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8")) as {
    icons?: Array<{ src?: string }>;
  };
  const iconPaths = (manifest.icons ?? []).map((icon) => icon.src ?? "");

  assert.equal(iconPaths.some((path) => path.startsWith("/assets/")), false);
  assert.equal(iconPaths.includes("assets/pwa-icon.png"), true);
  assert.equal(existsSync("public/assets/pwa-icon.png"), true);
});

test("every configured operating system image exists in public assets", () => {
  const source = readFileSync("src/utils/osImageHelper.ts", "utf8");
  const imagePaths = [...source.matchAll(/image:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.ok(imagePaths.length > 0);
  assert.deepEqual(
    imagePaths.filter((path) => !existsSync(join("public", path))),
    [],
  );
});
