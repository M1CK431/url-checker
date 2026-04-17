import { t, mergeLocalesMessages } from "@/plugins/i18n.js";
import { getRgbTwColor } from "@/helpers.js";

mergeLocalesMessages({
  "en-US": {
    INFORMATION: "Information",
    SUCCESS: "Success",
    REDIRECTION: "Redirection",
    CLIENT_ERROR: "Client error",
    SERVER_ERROR: "Server error"
  },
  "fr-FR": {
    INFORMATION: "Information",
    SUCCESS: "Succès",
    REDIRECTION: "Redirection",
    CLIENT_ERROR: "Erreur client",
    SERVER_ERROR: "Erreur serveur"
  }
});

export default {
  1: { label: t("INFORMATION"), color: getRgbTwColor("blue", 700) },
  2: { label: t("SUCCESS"), color: getRgbTwColor("green", 600) },
  3: { label: t("REDIRECTION"), color: getRgbTwColor("yellow", 500) },
  4: { label: t("CLIENT_ERROR"), color: getRgbTwColor("orange", 400) },
  5: { label: t("SERVER_ERROR"), color: getRgbTwColor("red", 600) }
};
