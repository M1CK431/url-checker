/* eslint-env node */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  plugins: ["prettier"],
  extends: [
    "plugin:vue/vue3-strongly-recommended",
    "eslint:recommended",
    "./.eslintrc-auto-import.json",
    "plugin:prettier/recommended"
  ],
  parserOptions: { ecmaVersion: "latest" },
  overrides: [
    {
      files: ["*.graphql", "*.gql"],
      parser: "@graphql-eslint/eslint-plugin",
      plugins: ["@graphql-eslint"],
      rules: { "@graphql-eslint/no-duplicate-fields": "error" }
    }
  ],
  rules: {
    "prettier/prettier": [
      "warn",
      { trailingComma: "none", arrowParens: "avoid" }
    ],
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-setter-return": "off",
    "no-empty": ["error", { allowEmptyCatch: true }],

    "vue/multi-word-component-names": "off",
    "vue/no-reserved-component-names": "off",
    "vue/max-attributes-per-line": "off",
    "vue/no-template-shadow": "off",
    "vue/one-component-per-file": "off",
    "vue/require-explicit-emits": "off",
    "vue/singleline-html-element-content-newline": "off",
    "vue/require-default-prop": "off",
    "vue/v-on-event-hyphenation": ["error", "never"],
    "vue/component-tags-order": [
      "warn",
      { order: ["template", "script", "style"] }
    ],
    "vue/no-lone-template": "warn",
    "vue/order-in-components": "warn",
    "vue/this-in-template": "error",
    "vue/block-tag-newline": "warn",
    "vue/component-name-in-template-casing": [
      "warn",
      "PascalCase",
      {
        registeredComponentsOnly: false,
        ignores: ["component", "transition", "fa"]
      }
    ],
    "vue/component-options-name-casing": "warn",
    "vue/custom-event-name-casing": "error",
    "vue/no-empty-component-block": "warn",
    "vue/no-ref-object-destructure": "error",
    "vue/no-required-prop-with-default": "warn",
    "vue/no-template-target-blank": "error",
    "vue/no-this-in-before-route-enter": "error",
    "vue/no-unsupported-features": ["error", { version: "^3.2.37" }],
    "vue/no-unused-properties": "warn",
    "vue/no-unused-refs": "warn",
    "vue/no-useless-mustaches": "warn",
    "vue/no-useless-v-bind": "warn",
    "vue/padding-line-between-blocks": "warn",
    "vue/prefer-separate-static-class": "error",
    "vue/prefer-true-attribute-shorthand": "warn",
    "vue/v-for-delimiter-style": "warn"
  }
};
