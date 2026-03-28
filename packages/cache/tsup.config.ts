import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node16",
  dts: true,
  clean: true,
  outDir: "dist",
  external: ["@nestjs/common", "@nestjs/core"],
});
