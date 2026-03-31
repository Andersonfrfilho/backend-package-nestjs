import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node16",
  tsconfig: "tsconfig.tsup.json",
  dts: true,
  clean: true,
  outDir: "dist",
  external: ["@nestjs/*"],
  // Bundle private `shared` into the published artifact so consumers don't need
  // the unpublished `@adatechnology/shared` package from npm.
  noExternal: ["@adatechnology/shared"],
});
