<template>
  <Loader as="div" :loading="$apollo.loading" :error="error">
    <Card v-if="!reports[0]" class="h-[22rem] flex items-center justify-center">
      <div class="text-slate-500 text-sm text-center">
        <div class="font-semibold">
          {{ $t("HERE_WILL_APPEAR_YOUR_LATEST_REPORTS") }}
        </div>
        ({{ $t("REPORT_RESULT_OF_A_SITE_TEST") }})
      </div>
    </Card>

    <div
      class="grid gap-x-6 gap-y-24 h-[22rem] overflow-y-hidden -mb-16 justify-between"
      style="grid-template-columns: repeat(auto-fill, 21.55rem)"
    >
      <ReportCard
        v-for="report in reports"
        :key="report.id"
        v-bind="report"
        class="mb-2"
      />
    </div>
  </Loader>
</template>

<script>
import { Loader, Card, ReportCard } from "@/components";
import reportsQuery from "./reports.query.gql";
import reportSub from "./report.subscription.gql";

export default {
  components: { Loader, Card, ReportCard },
  data: () => ({ reports: [], error: "" }),
  apollo: {
    reports: {
      query: reportsQuery,
      update: ({ reports: { entries } }) => entries,
      error: (err, vm) => (vm.error = err.toString())
    },
    $subscribe: {
      reportChange: {
        query: reportSub,
        result({ data: { report: { operation } = {} } }) {
          operation !== "UPDATE" && this.$apollo.queries?.reports.refetch();
        }
      }
    }
  },
  i18n: {
    messages: {
      "en-US": {
        HERE_WILL_APPEAR_YOUR_LATEST_REPORTS:
          "Here will appear your latest reports",
        REPORT_RESULT_OF_A_SITE_TEST: "Report: result of a site test"
      },
      "fr-FR": {
        HERE_WILL_APPEAR_YOUR_LATEST_REPORTS:
          "Ici s'afficheront vos derniers rapports",
        REPORT_RESULT_OF_A_SITE_TEST: "rapport: résultat d'un test de site"
      }
    }
  }
};
</script>
