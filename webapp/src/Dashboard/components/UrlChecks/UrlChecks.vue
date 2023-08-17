<template>
  <div class="flex gap-10 relative">
    <!-- absolute because need extra height for shadow (overflow) -->
    <Illustration class="absolute top-0 left-0 shrink-0 drop-shadow-xl" />

    <Card size="lg" class="ml-96 grow space-y-5">
      <NTabs v-model:value="target" style="--n-tab-padding: 0 0 6px 0">
        <NTab name="url">{{ $t("TEST_AN_URL") }}</NTab>
        <NTab name="website">{{ $t("TEST_A_WEBSITE") }}</NTab>
      </NTabs>

      <div class="flex gap-2">
        <NInput
          v-model:value="url"
          :placeholder="$t(target === 'url' ? 'COPY_URL' : 'COPY_SITEMAP_URL')"
          :disabled="checking || generating"
          v-bind="url && { status: isAllowedDomain ? 'success' : 'error' }"
          @keyup.enter="
            isAllowedDomain && (target === 'url' ? checkUrl() : checkWebsite())
          "
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
          :loading="checking || generating"
          type="primary"
          @click="target === 'url' ? checkUrl() : checkWebsite()"
        >
          {{ $t("CHECK") }}
        </NButton>
      </div>
    </Card>
  </div>

  <Card v-if="$userPrefs.lastCheckResults[0]" size="xl">
    <h2 class="font-semibold text-slate-700 text-base mb-2">
      {{ $t("LAST_CHECKED_URL") }}
    </h2>

    <UrlChecksTable :rows="$userPrefs.lastCheckResults" @recheck="recheckUrl" />
  </Card>

  <Card v-else class="h-64 flex items-center justify-center">
    <div class="text-slate-500 text-sm text-center">
      <div class="font-semibold">
        {{ $t("HERE_WILL_BE_DISPLAYED_THE_RESULTS_OF_YOUR_LAST_URL_TESTS") }}
      </div>
    </div>
  </Card>
</template>

<script>
import {
  success,
  requestErrorHandler,
  isUrl,
  isAllowedDomain
} from "@/helpers.js";
import { Card, UrlChecksTable } from "@/components";
import Illustration from "./components/Illustration.vue";
import checkUrlMutation from "./checkUrl.mutation.gql";
import gql from "graphql-tag";

export default {
  components: { Card, Illustration, UrlChecksTable },
  data: () => ({ target: "url", url: "", checking: false, generating: false }),
  computed: {
    isUrl: ({ url }) => isUrl(url),
    isAllowedDomain: ({ url }) => isAllowedDomain(url)
  },
  methods: {
    checkUrl() {
      this.checking = true;
      const { $apollo, addToLastUrlChecks, url } = this;

      $apollo
        .mutate({ mutation: checkUrlMutation, variables: { url } })
        .then(({ data: { checkUrl } }) => {
          success();
          addToLastUrlChecks(checkUrl);
          this.url = "";
        })
        .catch(requestErrorHandler)
        .finally(() => (this.checking = false));
    },
    addToLastUrlChecks(checkUrl) {
      const { lastCheckResults } = this.$userPrefs;
      const idx = lastCheckResults.findIndex(({ url }) => url === checkUrl.url);

      if (idx > -1) lastCheckResults.splice(idx, 1);
      if (lastCheckResults[2]) lastCheckResults.pop();
      lastCheckResults.unshift(checkUrl);
    },
    recheckUrl(checkResult) {
      checkResult.status = "PROCESSING";

      this.$apollo
        .mutate({ mutation: checkUrlMutation, variables: checkResult })
        .then(({ data: { checkUrl } }) => {
          success();
          Object.assign(checkResult, checkUrl);
        })
        .catch(err => {
          requestErrorHandler(err);
          checkResult.status = "ERROR";
          checkResult.errorReason = err.toString();
        });
    },
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
        TEST_AN_URL: "Test an URL",
        COPY_URL: "Copy URL",
        HERE_WILL_BE_DISPLAYED_THE_RESULTS_OF_YOUR_LAST_URL_TESTS:
          "Here will be displayed the results of your last URL tests",
        LAST_CHECKED_URL: "Last checked URL",
        INVALID_URL: "Invalid URL",
        "ALLOWED_DOMAINS_{ALLOWED_DOMAINS}":
          "Allowed domain: {allowedDomains} | Allowed domains: {allowedDomains}"
      },
      "fr-FR": {
        TEST_AN_URL: "Tester une URL",
        COPY_URL: "Copier l'URL",
        HERE_WILL_BE_DISPLAYED_THE_RESULTS_OF_YOUR_LAST_URL_TESTS:
          " Ici s'afficheront les résultats de vos derniers tests d'URL",
        LAST_CHECKED_URL: "Dernières URL testées",
        INVALID_URL: "URL invalide",
        "ALLOWED_DOMAINS_{ALLOWED_DOMAINS}":
          "Domaines autorisés: {allowedDomains}"
      }
    }
  }
};
</script>
