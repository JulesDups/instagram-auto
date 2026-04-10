import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Operational utility scripts (not part of the app, not transpiled):
    ".scripts/**",
    // Git worktrees live under .worktrees/<branch>/ and contain their own
    // node_modules, .next and .scripts that should not be scanned by the root
    // lint run.
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
