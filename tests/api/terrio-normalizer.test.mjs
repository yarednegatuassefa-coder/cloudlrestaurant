import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../scripts/terrio-normalize-delivery-zones.mjs", import.meta.url));

test("Terrio normalizer converts and validates a local vector dataset without calling Cloud L", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "cloudl-terrio-test-"));
  try {
    const input = join(root, "source.gpkg");
    const output = join(root, "normalized.geojson");
    const fixture = join(root, "fixture.geojson");
    const fakeTerrio = join(root, "terrio");
    const geojson = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { name: "Test Zone", delivery_fee_etb: 75 },
        geometry: { type: "Polygon", coordinates: [[[38.7, 9.0], [38.71, 9.0], [38.71, 9.01], [38.7, 9.0]]] }
      }]
    };
    writeFileSync(input, "fixture input");
    writeFileSync(fixture, JSON.stringify(geojson));
    writeFileSync(fakeTerrio, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("terrio 0.9.0"); process.exit(0); }
if (args[0] === "info" || args[0] === "check") { console.log("{}"); process.exit(0); }
if (args[0] === "convert") { fs.copyFileSync(process.env.TERRIO_FIXTURE, args[2]); process.exit(0); }
process.exit(2);
`);
    chmodSync(fakeTerrio, 0o755);
    const result = spawnSync(process.execPath, [script, input, output], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, TERRIO_BIN: fakeTerrio, TERRIO_FIXTURE: fixture }
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "ready-for-staff-review");
    assert.equal(report.features, 1);
    assert.equal(report.inactiveOnImport, 1);
    assert.equal(report.crs, "EPSG:4326");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
