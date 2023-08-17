<template>
  <div class="flex">
    <NSelect
      v-model:value="url"
      :placeholder="$t('SELECT_A_WEBSITE_URL')"
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
  data: () => ({ sitemaps: [], error: "", url: "", generating: false }),
  apollo: {
    sitemaps: {
      query: gql`
        query ($host: String!) {
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
    },
    $subscribe: {
      report: {
        query: gql`
          subscription {
            report {
              operation
            }
          }
        `,
        result({ data: { operation } }) {
          if (operation === "UPDATE") return;
          this.queries?.sitemaps.refetch();
        }
      }
    }
  },
  computed: {
    isValidTarget: ({ url }) => isUrl(url)
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
            mutation ($url: String!) {
              generateReport(url: $url) {
                id
              }
            }
          `,
          variables: { url: this.url }
        })
        .then(({ data: { generateReport: { id } } = {} }) => {
          success();
          this.url = "";
          this.$router.push({ name: "report", params: { reportId: id } });
        })
        .catch(requestErrorHandler)
        .finally(() => (this.generating = false));
    }
  }
};
</script>
