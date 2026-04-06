import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node20",
  tsconfig: "./tsconfig.json",
});
