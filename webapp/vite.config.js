import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import graphql from "@rollup/plugin-graphql";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";

import dns from "dns";
dns.setDefaultResultOrder("verbatim");

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 8080 },
  build: { target: "es2022" },
  plugins: [
    vue(),
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
    Icons({ compiler: "vue3" })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
