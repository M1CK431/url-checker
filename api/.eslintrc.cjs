module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:node/recommended"
  ],
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": [
      "warn",
      { trailingComma: "none", arrowParens: "avoid" }
    ],
    "no-setter-return": "off",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-unused-vars": "warn",
    "node/file-extension-in-import": "error"
  }
};
