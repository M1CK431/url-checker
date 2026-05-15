import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import graphql from "@rollup/plugin-graphql";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import vueI18nSfcAutoimport from "vite-plugin-vue-i18n-sfc-auto-import";
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference";
import tailwindcss from "@tailwindcss/vite";

import { disableFragmentWarnings } from "graphql-tag";
disableFragmentWarnings();

import dns from "dns";
dns.setDefaultResultOrder("verbatim");

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 8080 },
  plugins: [
    vue(),
    tailwindAutoReference("./src/assets/tailwind.css"),
    tailwindcss(),
    graphql(),
    AutoImport({
      imports: [
        "vue",
        {
          "naive-ui": [
            "useDialog",
            "useMessage",
            "useNotification",
            "useLoadingBar"
          ]
        }
      ],
      eslintrc: { enabled: true },
      dts: false
    }),
    Components({
      dirs: ["components"],
      resolvers: [
        NaiveUiResolver(),
        IconsResolver({ prefix: false, enabledCollections: ["ri"] })
      ],
      dts: false
    }),
    Icons({ compiler: "vue3" }),
    VueI18nPlugin({
      include: fileURLToPath(new URL("./src/locales/**", import.meta.url)),
      strictMessage: false
    }),
    vueI18nSfcAutoimport(`import { i18n } from "@/plugins/i18n.js";`)
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
