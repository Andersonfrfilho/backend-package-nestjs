import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node16",
  dts: true,
  clean: true,
  outDir: "dist",
  external: ["@nestjs/common", "@nestjs/core"],
  // Ensure shared is bundled into the package at build time so published packages
  // don't require the private `@adatechnology/shared` package from npm.
  noExternal: ["@adatechnology/shared"],
});
