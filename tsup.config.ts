import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node20",
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["vscode"],
  noExternal: ["ajv"],
});
