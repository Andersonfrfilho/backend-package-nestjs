import { defineConfig } from "tsup";
import { TsconfigPathsPlugin } from "@esbuild-plugins/tsconfig-paths";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "node16",
  tsconfig: "tsconfig.tsup.json",
  dts: true,
  clean: true,
  outDir: "dist",
  external: ["@nestjs/*", "@adatechnology/http-client"],
  esbuildPlugins: [TsconfigPathsPlugin({})],
});
