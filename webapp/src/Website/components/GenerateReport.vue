<template>
  <div class="flex">
    <NSelect
      v-model:value="url"
      :placeholder="$t('SELECT_A_SITEMAP')"
      :options="sitemaps.map(value => ({ label: getPathname(value), value }))"
      :loading="$apollo.loading"
      tag
      @create="onCreate"
      filterable
      :disabled="generating"
    >
      <template #empty>{{ error }}</template>
    </NSelect>

    <NButton
      :disabled="!isValidTarget"
      :loading="generating"
      type="primary"
      @click="checkWebsite"
      class="ml-2"
    >
      {{ $t("CHECK") }}
    </NButton>
  </div>
</template>

<script>
import { success, requestErrorHandler, isUrl, getPathname } from "@/helpers.js";
import gql from "graphql-tag";

export default {
  props: { host: { type: String, required: true } },
  setup: () => ({ getPathname }),
  data: () => ({ sitemaps: [], error: "", url: null, generating: false }),
  apollo: {
    sitemaps: {
      query: gql`
        query ($host: ID!) {
          website(host: $host) {
            host
            sitemaps
          }
        }
      `,
      variables() {
        return { host: this.host };
      },
      update: ({ website: { sitemaps } }) => sitemaps,
      error: (err, vm) => (vm.error = err.toString())
    }
  },
  computed: {
    isValidTarget: ({ url }) => isUrl(url)
  },
  mounted() {
    this.$subscribe.add(
      { key: "generateReport-website", clearOnDelete: true },
      {
        query: gql`
          subscription {
            website {
              data {
                host
                sitemaps
              }
            }
          }
        `,
        variables: { host: this.host }
      }
    );
  },
  methods: {
    onCreate(path) {
      path = path.replace(/^\/+/, "");
      return { label: path, value: `https://${this.host}/${path}` };
    },
    checkWebsite() {
      this.generating = true;

      this.$apollo
        .mutate({
          mutation: gql`
            mutation ($url: URL!) {
              generateReport(url: $url) {
                id
              }
            }
          `,
          variables: { url: this.url },
          update: (_cache, { data }) =>
            this.$subscribe.handleMutation(
              { operation: "CREATE", evictCache: { fieldName: "reports" } },
              [data.generateReport]
            )
        })
        .then(({ data: { generateReport: { id } } = {} }) => {
          success();
          this.url = "";
          this.$router.push({ name: "report", params: { reportId: id } });
        })
        .catch(requestErrorHandler)
        .finally(() => (this.generating = false));
    }
  },
  i18n: {
    messages: {
      "en-US": { SELECT_A_SITEMAP: "Select a sitemap" },
      "fr-FR": { SELECT_A_SITEMAP: "Sélectionner un sitemap" }
    }
  }
};
</script>
