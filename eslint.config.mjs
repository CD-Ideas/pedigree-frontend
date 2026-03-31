import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "jest.config.js",
    "tests/e2e/jest.e2e.config.js",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-use-before-define": "warn",
    },
  },
]);

export default eslintConfig;
