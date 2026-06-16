import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "coverage/**",
      "packages/db/generated/**",
      "packages/db/prisma/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        crypto: "readonly",
        btoa: "readonly",
        atob: "readonly",
        process: "readonly",
        console: "readonly",
      },
    },
  },
);
