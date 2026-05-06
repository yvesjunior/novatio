/**
 * Minimal ESLint v9 flat config.
 *
 * eslint-config-next 16.x doesn't ship a working flat config and the FlatCompat
 * shim explodes ("Converting circular structure to JSON") when it tries to
 * load `next/core-web-vitals`. Until upstream ships flat config support we
 * run a small ruleset directly so `npm run lint` catches the obvious issues
 * (unused vars, undefined references, broken imports) on our own code.
 */
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  // Ignore generated / vendored / static content.
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "static_site/**",
      "tests/visual.spec.ts-snapshots/**",
      "test-results/**",
      "playwright-report/**",
      "public/**",
    ],
  },

  // Base JS rules.
  js.configs.recommended,

  // TypeScript / TSX.
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "off", // TS handles this
    },
  },

  // Plain JS (scripts/, config files).
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
