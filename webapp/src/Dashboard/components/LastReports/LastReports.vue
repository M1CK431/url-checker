<template>
  <Loader as="div" :loading="$apollo.loading" :error="error">
    <Card v-if="!reports[0]" class="h-[24rem] flex items-center justify-center">
      <div class="text-slate-500 text-sm text-center">
        <div class="font-semibold">
          {{ $t("HERE_WILL_APPEAR_YOUR_LATEST_REPORTS") }}
        </div>
        ({{ $t("REPORT_RESULT_OF_A_SITE_TEST") }})
      </div>
    </Card>

    <div
      v-else
      class="overflow-y-hidden h-[22rem] flex items-start -mb-14 -mx-8 px-8"
    >
      <div
        class="flex flex-wrap gap-x-6 gap-y-20 w-full"
        :class="{ 'justify-between': reports.length > 2 }"
      >
        <ReportCard
          v-for="report in reports"
          :key="report.id"
          v-bind="report"
        />
      </div>
    </div>
  </Loader>
</template>

<script>
import { Loader, Card, ReportCard } from "@/components";
import { reportsQuery, reportSubscription } from "./lastReports.gql";

export default {
  components: { Loader, Card, ReportCard },
  data: () => ({ reports: [], error: "" }),
  apollo: {
    reports: {
      query: reportsQuery,
      update: ({ reports: { entries } }) => entries,
      error: (err, vm) => (vm.error = err.toString())
    }
  },
  mounted() {
    this.$subscribe.add(
      { key: "dashboard-report", evictCache: { fieldName: "reports" } },
      { query: reportSubscription }
    );
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
