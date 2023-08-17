<template>
  <NDrawer
    placement="bottom"
    :default-height="144"
    class="recheck-url-drawer"
    content-style="padding: 1rem; overflow: hidden"
    :show="!!url"
    @update:show="$emit('update:url', '')"
    :theme-overrides="{ color: 'none' }"
  >
    <UrlChecksTable :rows="[checkResult]" @recheck="recheckUrl" />
  </NDrawer>
</template>

<script>
import { UrlChecksTable } from "@/components";
import { success, requestErrorHandler } from "@/helpers.js";
import gql from "graphql-tag";

export default {
  components: { UrlChecksTable },
  props: { url: String },
  data: () => ({
    checkResult: {
      url: "",
      createdAt: null,
      updatedAt: null,
      responseCode: 0,
      redirectUrl: null,
      size: 0,
      duration: 0,
      status: "PROCESSING",
      errorReason: null
    }
  }),
  watch: { url: "recheckUrl" },
  methods: {
    recheckUrl() {
      const { url, checkResult } = this;
      if (!url) return;

      Object.assign(checkResult, { url, status: "PROCESSING" });

      this.$apollo
        .mutate({
          mutation: gql`
            mutation CheckUrl($url: String!) {
              checkUrl(url: $url) {
                url
                updatedAt
                responseCode
                redirectUrl
                size
                duration
                status
                errorReason
              }
            }
          `,
          variables: { url }
        })
        .then(({ data: { checkUrl } }) => {
          success();
          Object.assign(checkResult, checkUrl);
        })
        .catch(err => {
          requestErrorHandler(err);
          checkResult.status = "ERROR";
          checkResult.errorReason = err.toString();
        });
    }
  }
};
</script>

<style>
.recheck-url-drawer {
  @apply rounded-t-xl mx-5 ring-1 ring-white/50;
  @apply bg-gradient-to-b from-white/60 to-white/20 backdrop-blur-2xl;
}
</style>
