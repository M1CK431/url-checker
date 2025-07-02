import globals from "globals";
import js from "@eslint/js";
import stylisticJs from "@stylistic/eslint-plugin-js";

export default [
  { languageOptions: { globals: globals.node } },
  js.configs.recommended,
  {
    rules: {
      "no-console": process.env.NODE_ENV === "production" ? "off" : "warn",
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
      "no-setter-return": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-prototype-builtins": "off",
      "no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }
      ]
    }
  },
  stylisticJs.configs["all"],
  {
    rules: Object.entries({
      indent: [2, { offsetTernaryExpressions: true }],
      "max-len":
        {
          tabWidth: 2,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true
        },
      "object-curly-newline": { multiline: true, consistent: true },
      "quote-props": "as-needed",
      quotes: ["double", { avoidEscape: true }],
      "comma-dangle": "never",
      "array-element-newline": { consistent: true, multiline: true },
      "object-property-newline": { allowAllPropertiesOnSameLine: true },
      "object-curly-spacing": "always",
      "multiline-ternary": "always-multiline",
      "arrow-parens": "as-needed",
      "padded-blocks": ["never", { allowSingleLineBlocks: true }],
      "function-call-argument-newline": "consistent",
      "multiline-comment-style": "off",
      "dot-location": "property",
      "no-confusing-arrow": "off",
      "implicit-arrow-linebreak": "off",
      "space-before-function-paren": {
        anonymous: "always",
        named: "never",
        asyncArrow: "always"
      },
      "nonblock-statement-body-position": "off",
      "no-extra-parens": [
        "all",
        {
          nestedBinaryExpressions: false,
          ternaryOperandBinaryExpressions: false
        }
      ],
      "wrap-regex": "off",
      "newline-per-chained-call": "off",
      "array-bracket-newline": "consistent",
      "function-paren-newline": "multiline-arguments",
      "brace-style": ["1tbs", { allowSingleLine: true }]
    })
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`@stylistic/js/${key}`]:
            value === "off"
              ? "off"
              : [1, ...Array.isArray(value) ? value : [value]]
        }),
        {}
      )
  }
];
