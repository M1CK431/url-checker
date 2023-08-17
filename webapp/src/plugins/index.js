// @index(['./**/*.js', '!./*-autoimport.js'], f => `export { default as ${f.name} } from "${f.path}${f.ext}";`)
export { default as allowedDomains } from "./allowedDomains.js";
export { default as apollo } from "./apollo.js";
export { default as i18n } from "./i18n.js";
export { default as naiveUI } from "./naiveUI.js";
export { default as userPrefs } from "./userPrefs.js";
