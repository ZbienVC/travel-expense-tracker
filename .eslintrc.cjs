// Lint settings for the web app and API. The mobile app is built by Expo and checked there.
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { browser: true, node: true, es2020: true },
  ignorePatterns: ["dist", "node_modules", "src/mobile"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};
