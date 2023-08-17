<template>
  <Card class="space-y-4">
    <h2 class="text-base text-slate-700 font-semibold">
      {{ $t("TEST_A_WEBSITE") }}
    </h2>

    <div class="flex gap-2">
      <NInput
        v-model:value="url"
        :placeholder="$t('COPY_SITEMAP_URL')"
        :disabled="generating"
        v-bind="url && { status: isAllowedDomain ? 'success' : 'error' }"
        @keyup.enter="isAllowedDomain && checkWebsite()"
        clearable
      >
        <template v-if="url && !isAllowedDomain" #prefix>
          <NTooltip class="max-w-sm">
            <template #trigger>
              <RiErrorWarningFill class="text-red-600 cursor-default" />
            </template>

            {{
              $t(
                isUrl ? "ALLOWED_DOMAINS_{ALLOWED_DOMAINS}" : "INVALID_URL",
                $allowedDomains.count,
                { allowedDomains: $allowedDomains.join(", ") }
              )
            }}
          </NTooltip>
        </template>
      </NInput>

      <NButton
        :disabled="!isAllowedDomain"
        :loading="generating"
        type="primary"
        @click="checkWebsite"
      >
        {{ $t("CHECK") }}
      </NButton>
    </div>
  </Card>
</template>

<script>
import { Card } from "@/components";
import {
  success,
  requestErrorHandler,
  isUrl,
  isAllowedDomain
} from "@/helpers.js";
import gql from "graphql-tag";

export default {
  components: { Card },
  data: () => ({ url: "", generating: false }),
  computed: {
    isUrl: ({ url }) => isUrl(url),
    isAllowedDomain: ({ url }) => isAllowedDomain(url)
  },
  methods: {
    checkWebsite() {
      this.generating = true;

      this.$apollo
        .mutate({
          mutation: gql`
            mutation ($url: String!) {
              generateReport(url: $url) {
                id
                website {
                  host
                }
              }
            }
          `,
          variables: { url: this.url }
        })
        .then(({ data: { generateReport: { id, website } = {} } }) => {
          success();
          this.url = "";
          this.$router.push({
            name: "report",
            params: { host: website.host, reportId: id }
          });
        })
        .catch(requestErrorHandler)
        .finally(() => (this.generating = false));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        INVALID_URL: "Invalid URL",
        "ALLOWED_DOMAINS_{ALLOWED_DOMAINS}":
          "Allowed domain: {allowedDomains} | Allowed domains: {allowedDomains}"
      },
      "fr-FR": {
        INVALID_URL: "URL invalide",
        "ALLOWED_DOMAINS_{ALLOWED_DOMAINS}":
          "Domaines autorisés: {allowedDomains}"
      }
    }
  }
};
</script>
