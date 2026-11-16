#!/usr/bin/env node
/**
 * Convert a local GIS vector dataset into the strict GeoJSON contract used by
 * Cloud L's staff delivery-zone importer. This is an offline preflight only:
 * it never calls Cloud L or writes to a database.
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { parseDeliveryGeoJson } from "../lib/server/delivery-geojson.mjs";

const MAX_INPUT_BYTES = 100 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const ALLOWED_SUFFIXES = [".gpkg", ".parquet", ".fgb", ".geojson", ".json", ".shp.zip"];

function fail(message) {
  console.error(`Terrio preflight: ${message}`);
  process.exitCode = 1;
}

function runTerrio(binary, args) {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw new Error(result.error.code === "ENOENT"
    ? "Terrio CLI not found. Install Terrio and ensure its binary is on PATH, or set TERRIO_BIN."
    : result.error.message);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "No diagnostic output.").trim().slice(0, 1800);
    throw new Error(`terrio ${args[0]} failed (exit ${result.status}): ${detail}`);
  }
  return result.stdout.trim();
}

function main() {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg || !outputArg || process.argv.length !== 4) {
    throw new Error("Usage: npm run gis:normalize-delivery-zones -- <input.gpkg|input.parquet|input.fgb|input.geojson|input.shp.zip> <output.geojson>");
  }

  const input = resolve(inputArg);
  const output = resolve(outputArg);
  if (input === output) throw new Error("Input and output paths must be different.");
  if (!ALLOWED_SUFFIXES.some((suffix) => input.toLowerCase().endsWith(suffix))) {
    throw new Error("Unsupported input type. Use GeoPackage, GeoParquet, FlatGeobuf, GeoJSON or a zipped Shapefile.");
  }
  if (!existsSync(input) || !lstatSync(input).isFile()) throw new Error("Input must be an existing regular local file (symlinks and URLs are refused).");
  if (statSync(input).size > MAX_INPUT_BYTES) throw new Error("Input exceeds the 100 MB local preflight limit.");
  if (existsSync(output)) throw new Error("Output already exists. Choose a new filename; this tool never overwrites.");
  if (extname(output).toLowerCase() !== ".geojson") throw new Error("Output filename must end in .geojson.");
  if (!existsSync(dirname(output))) throw new Error("Output directory does not exist.");

  const binary = process.env.TERRIO_BIN || "terrio";
  const version = runTerrio(binary, ["--version"]);
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (match && (Number(match[1]) < 0 || (Number(match[1]) === 0 && Number(match[2]) < 9))) {
    console.warn(`Warning: detected ${version}; Terrio 0.9.0 is recommended for this workflow.`);
  }

  // Metadata inspection and a full exposed-content read happen before conversion.
  runTerrio(binary, ["info", input, "--json"]);
  runTerrio(binary, ["check", input, "--json"]);

  try {
    runTerrio(binary, ["convert", input, output, "--t-srs", "EPSG:4326"]);
    const size = statSync(output).size;
    if (size > MAX_OUTPUT_BYTES) throw new Error("Converted GeoJSON exceeds Cloud L's 2 MB import limit; reduce the layer or split it into smaller files.");
    const document = JSON.parse(readFileSync(output, "utf8"));
    const zones = parseDeliveryGeoJson(document);
    console.log(JSON.stringify({
      status: "ready-for-staff-review",
      terrio: version,
      input,
      output,
      crs: "EPSG:4326",
      features: zones.length,
      bytes: size,
      activeOnImport: zones.filter((zone) => zone.isActive).length,
      inactiveOnImport: zones.filter((zone) => !zone.isActive).length,
      nextStep: "Review the GeoJSON, then import it manually through the authenticated Cloud L staff Delivery intelligence panel.",
    }, null, 2));
  } catch (error) {
    // Remove partial output from a failed conversion or validation.
    if (existsSync(output)) {
      try { unlinkSync(output); } catch { /* preserve the original error */ }
    }
    throw error;
  }
}


try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : "Unknown Terrio preflight error.");
}
