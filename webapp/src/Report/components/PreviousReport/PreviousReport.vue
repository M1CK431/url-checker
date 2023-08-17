<template>
  <div
    v-if="status !== 'DONE' || error || !previousReport"
    class="py-3 flex items-center justify-center text-slate-500 font-semibold text-xs text-center"
  >
    <div v-if="status === 'PROCESSING'">
      {{ $t("WAIT_UNTIL_THE_REPORT_TO_BE_COMPLETED_TO_CONSULT_THE_ANALYSIS") }}
    </div>

    <div
      v-else-if="
        status === 'ERROR' || previousReport?.status === 'ERROR' || error
      "
    >
      {{ $t("ANALYSIS_UNAVAILABLE") }}
    </div>

    <div v-else-if="!previousReport">
      {{ $t("THERE_IS_NO_PREVIOUS_REPORT_TO_COMPARE_WITH") }}
    </div>
  </div>

  <Loader v-else :loading="$apollo.loading" as="div" class="py-3 flex flex-col">
    <div class="grow text-center">
      <component
        :is="analysis.icon"
        class="inline-block text-3xl mb-3"
        :class="analysis.iconClass"
      />
      <br />
      <span class="text-slate-700 font-semibold">
        {{ analysis.msg }}
        <RouterLink
          :to="{ params: { reportId: previousReport?.id } }"
          class="underline"
        >
          {{ $t("PREVIOUS_REPORT") }}
        </RouterLink>
      </span>
    </div>

    <div class="space-y-3 text-slate-700">
      <div
        v-for="({ label, value }, key) in kpis"
        :key="key"
        class="text-center"
      >
        <div class="flex items-center mb-1">
          <div class="p-0.5 mr-1.5 bg-slate-500/10 rounded">
            <RiArrowRightUpLine
              v-if="value > 0"
              :class="{ 'text-red-600': key !== 'totalCount' }"
            />
            <RiArrowRightDownLine
              v-else-if="value < 0"
              :class="{ 'text-green-600': key !== 'totalCount' }"
            />
            <RiEqualLine v-else />
          </div>
          {{ label }}
        </div>
      </div>
    </div>
  </Loader>
</template>

<script>
import { Loader } from "@/components";
import { requestErrorHandler } from "@/helpers.js";
import previousReportQuery from "./previousReport.query.gql";

const kpis = {
  totalCount: "URLS",
  http3xxCount: "REDIRECTIONS",
  http4xxCount: "CLIENT_ERRORS",
  http5xxCount: "SERVER_ERRORS"
};

export default {
  components: { Loader },
  props: {
    website: { type: Object, required: true },
    url: { type: String, required: true },
    status: { type: String, required: true },
    createdAt: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    totalCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http3xxCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http4xxCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http5xxCount: { type: Number, required: true }
  },
  data: () => ({ previousReport: null, error: "" }),
  apollo: {
    previousReport: {
      query: previousReportQuery,
      variables() {
        const { website, url, createdAt } = this;
        return { host: website.host, url, before: createdAt };
      },
      update: ({ website: { reports: { entries } = [] } = {} }) => entries[0],
      error: (err, vm) => {
        vm.error = err.toString();
        requestErrorHandler(err);
      },
      skip: ({ status }) => status !== "DONE"
    }
  },
  computed: {
    kpis: ({ $i18n, $props, previousReport }) =>
      Object.entries(kpis).reduce(
        (acc, [key, labelKey]) => ({
          ...acc,
          [key]: {
            value: $props[key] - previousReport[key],
            get label() {
              if (!this.value) return $i18n.tc(labelKey, 2);

              return `${this.value.toLocaleString(undefined, {
                signDisplay: "exceptZero"
              })} ${$i18n.tc(labelKey, Math.abs(this.value))}`;
            }
          }
        }),
        {}
      ),
    analysis: ({ $i18n, kpis }) => {
      if ([3, 4, 5].some(n => kpis[`http${n}xxCount`].value > 0))
        return {
          icon: defineAsyncComponent(() => import("~icons/ri/spam-3-fill")),
          iconClass: "text-red-600",
          msg: $i18n.t("DEGRADATION_COMPARED_TO")
        };

      if (kpis.totalCount.value !== 0)
        return {
          icon: defineAsyncComponent(() => import("~icons/ri/question-fill")),
          iconClass: "text-blue-600",
          msg: $i18n.t("URLS_MODIFIED_COMPARED_TO")
        };

      if ([3, 4, 5].some(n => kpis[`http${n}xxCount`].value < 0))
        return {
          icon: defineAsyncComponent(
            () => import("~icons/ri/sparkling-2-fill")
          ),
          iconClass: "text-yellow-600",
          msg: $i18n.t("IMPROVEMENT_COMPARED_TO")
        };

      return {
        icon: defineAsyncComponent(
          () => import("~icons/ri/checkbox-circle-fill")
        ),
        iconClass: "text-green-600",
        msg: $i18n.t("IDENTICAL_TO")
      };
    }
  },
  i18n: {
    messages: {
      "en-US": {
        WAIT_UNTIL_THE_REPORT_TO_BE_COMPLETED_TO_CONSULT_THE_ANALYSIS:
          "Wait until the report to be completed to consult the analysis",
        ANALYSIS_UNAVAILABLE: "Analysis unavailable",
        THERE_IS_NO_PREVIOUS_REPORT_TO_COMPARE_WITH:
          "There is no previous report to compare with",
        URLS: "URL | URL | URLs",
        REDIRECTIONS: "redirection | redirection | redirections",
        CLIENT_ERRORS: "client error | client error | client errors",
        SERVER_ERRORS: "server error | server error | server errors",
        DEGRADATION_COMPARED_TO: "Degradation compared to",
        IDENTICAL_TO: "Identical to",
        URLS_MODIFIED_COMPARED_TO: "URLs modified compared to",
        IMPROVEMENT_COMPARED_TO: "Improvement compared to",
        PREVIOUS_REPORT: "previous report"
      },
      "fr-FR": {
        WAIT_UNTIL_THE_REPORT_TO_BE_COMPLETED_TO_CONSULT_THE_ANALYSIS:
          "Patienter jusqu'à la completion du rapport pour consulter l'analyse",
        ANALYSIS_UNAVAILABLE: "Analyse indisponible",
        THERE_IS_NO_PREVIOUS_REPORT_TO_COMPARE_WITH:
          "Il n’existe aucun rapport précédent avec lequel comparer",
        URLS: "URL | URL | URLs",
        REDIRECTIONS: "redirection | redirection | redirections",
        CLIENT_ERRORS: "erreur client | erreur client | erreurs client",
        SERVER_ERRORS: "erreur serveur | erreur serveur | erreurs serveur",
        DEGRADATION_COMPARED_TO: "Dégradation comparé au",
        IDENTICAL_TO: "Identique au",
        URLS_MODIFIED_COMPARED_TO: "URLs modifiées comparé au",
        IMPROVEMENT_COMPARED_TO: "Amélioration comparé au",
        PREVIOUS_REPORT: "rapport précédent"
      }
    }
  }
};
</script>
