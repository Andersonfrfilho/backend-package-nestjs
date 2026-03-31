import { defineConfig } from "tsup";
import { TsconfigPathsPlugin } from "@esbuild-plugins/tsconfig-paths";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node16",
  tsconfig: "tsconfig.tsup.json",
  dts: true,
  clean: true,
  outDir: "dist",
  external: ["@nestjs/*", "axios", "rxjs"],
  // Ensure shared is bundled into the package at build time so published packages
  // don't require the private `@adatechnology/shared` package from npm.
  noExternal: ["@adatechnology/shared"],
  esbuildPlugins: [TsconfigPathsPlugin({})],
});
