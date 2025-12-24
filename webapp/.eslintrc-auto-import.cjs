// This a wrapper to workaround ESM lake of support for JSON file import
// See here for details: https://github.com/eslint/eslint/discussions/15305
module.exports = require("./.eslintrc-auto-import.json");
