import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [resolve(__dirname, "snippet.ts")],
  outfile: resolve(__dirname, "..", "dist", "snippet.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  platform: "browser",
  sourcemap: false,
  banner: {
    js: "/* @llm-telemetry/referral-snippet v0.1.0 | MIT */",
  },
};

if (isWatch) {
  const ctx = await (await import("esbuild")).context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(options);
  console.log("Built dist/snippet.js");
}
