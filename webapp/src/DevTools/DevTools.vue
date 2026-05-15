<template>
  <NTabs animated paneWrapperClass="grow pt-2" class="h-full">
    <NTabPane
      name="gqlClient"
      tab="GraphQL client"
      displayDirective="show"
      class="h-full"
    >
      <Altair class="size-full rounded-md" />
    </NTabPane>

    <NTabPane name="pluginsState" tab="Plugins state" displayDirective="show">
      <NCollapse :themeOverrides="{ titlePadding: 0 }">
        <NCollapseItem
          v-for="(obj, key) in {
            auth: $auth,
            userPrefs: $userPrefs,
            allowedDomains: $allowedDomains
          }"
          :key
          :name="key"
          :title="key"
          class="capitalize bg-white rounded-md px-4 py-3 select-none"
        >
          <div class="px-4 pb-4">
            <NCode
              :hljs
              :code="JSON.stringify(obj, null, 2)"
              language="json"
              wordWrap
              class="block max-h-96 overflow-auto"
            />
          </div>
        </NCollapseItem>
      </NCollapse>
    </NTabPane>
  </NTabs>
</template>

<script>
import Altair from "./components/Altair.vue";
import hljs from "https://unpkg.com/@highlightjs/cdn-assets@11.11.0/es/highlight.min.js";
import json from "https://unpkg.com/@highlightjs/cdn-assets@11.11.0/es/languages/json.min.js";

hljs.registerLanguage("json", json);

export default {
  components: { Altair },
  setup: () => ({ hljs })
};
</script>

<style scoped>
@import url("https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/default.min.css");
</style>
