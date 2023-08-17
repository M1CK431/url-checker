import { createI18n } from "vue-i18n";
import enUS from "@/locales/en-US.json";
import frFR from "@/locales/fr-FR.json";
import { userPrefs } from "./userPrefs.js";

const i18n = createI18n({
  messages: { "en-US": enUS, "fr-FR": frFR },
  locale: userPrefs.locale || navigator.language,
  fallbackLocale: "en-US",
  silentFallbackWarn: true,
  silentTranslationWarn: true,
  warnHtmlInMessage: "off"
});

export const { d, n, rt, t, tc, te, tm } = i18n.global;

export const mergeLocalesMessages = localesMessages =>
  Object.entries(localesMessages).forEach(localeMessages =>
    i18n.global.mergeLocaleMessage(...localeMessages)
  );

export const setLocale = async locale => {
  userPrefs.locale = locale;
  location.reload();
};

export default i18n;
