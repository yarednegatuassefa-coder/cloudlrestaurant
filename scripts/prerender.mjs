import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  configFile: resolve("vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
  const appMarkup = renderToString(React.createElement(App));
  const indexPath = resolve("dist/index.html");
  const html = await readFile(indexPath, "utf8");
  const rootMarkup = `<div id="root">${appMarkup}</div>`;

  if (!html.includes('<div id="root"></div>')) {
    throw new Error("The expected empty React root was not found in dist/index.html");
  }

  await writeFile(indexPath, html.replace('<div id="root"></div>', rootMarkup));
  console.log(`Prerendered ${appMarkup.length.toLocaleString()} characters into ${indexPath}`);
} finally {
  await vite.close();
}
