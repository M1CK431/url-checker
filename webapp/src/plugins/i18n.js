import { createI18n } from "vue-i18n";
import messages from "@intlify/unplugin-vue-i18n/messages";
import { userPrefs } from "./userPrefs.js";

const datetimeFormats = {
  short: { dateStyle: "short", timeStyle: "short" }
};

export const i18n = createI18n({
  legacy: false,
  datetimeFormats: { "en-US": datetimeFormats, "fr-FR": datetimeFormats },
  messages,
  locale: userPrefs.locale || navigator.language,
  fallbackLocale: "en-US",
  fallbackWarn: false,
  warnHtmlMessage: false
});

export const { n, rt, t, te, tm } = i18n.global;

export const d = (date = new Date(), format = "short") =>
  i18n.global.d(new Date(date), format);

export const mergeLocalesMessages = localesMessages =>
  Object.entries(localesMessages).forEach(localeMessages =>
    i18n.global.mergeLocaleMessage(...localeMessages)
  );

export const setLocale = async locale => {
  userPrefs.locale = locale;
  location.reload();
};

export default app => {
  app.use(i18n);
  app.mixin({ computed: { $d: _ => (date, fmt) => d(date, fmt) } });
};
