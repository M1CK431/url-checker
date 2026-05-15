<template>
  <Loader
    :loading="$apollo.queries.report.loading"
    :error="error"
    as="div"
    class="flex gap-6 mb-8"
  >
    <div class="grow">
      <div class="flex items-center gap-4 text-slate-700">
        <NButton
          type="primary"
          size="tiny"
          @click="$router.push({ name: 'site' })"
        >
          <RiArrowLeftSLine />
        </NButton>

        <span class="text-base font-semibold">
          {{ $t("{COUNT}_REPORTS", report.website.reports.totalCount) }}
        </span>
      </div>

      <Illustration class="hidden 2xl:block mx-auto mt-8" />
    </div>

    <Card size="lg" class="h-80 relative flex gap-4">
      <div class="w-2/5 space-y-7 text-slate-700">
        <div class="flex items-center gap-1 text-base font-semibold">
          <img
            :src="report.website.faviconUrl"
            alt="favicon"
            class="h-4 w-4 mr-2"
          />
          <NEllipsis class="grow">{{ report.website.host }}</NEllipsis>
        </div>

        <div class="space-y-6">
          <div class="space-x-3">
            <span class="font-semibold">{{ $t("URL") }}:</span>
            <span>{{ urlPathname }}</span>
          </div>

          <div class="space-x-3">
            <span class="font-semibold">{{ $t("DATE") }}:</span>
            <span>{{
              new Date(report.createdAt).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short"
              })
            }}</span>
          </div>

          <div class="space-x-3">
            <span class="font-semibold">{{ $t("DURATION") }}:</span>
            <span>{{ duration }}</span>
          </div>

          <div class="space-x-3">
            <span class="font-semibold">{{ $t("STATUS") }}:</span>
            <Status v-bind="report" />
          </div>
        </div>

        <div class="absolute left-4 bottom-4 flex gap-4">
          <NButton
            type="primary"
            @click="generateReport"
            :loading="generating"
            :disabled="['PENDING', 'PROCESSING'].includes(report.status)"
          >
            {{ $t("CHECK") }}
          </NButton>

          <NButton
            type="primary"
            circle
            @click="$refs.pieChart.exportAsPng()"
            :disabled="['PENDING', 'PROCESSING'].includes(report.status)"
          >
            <RiDownload2Line class="text-base" />
          </NButton>

          <DeleteReports
            :to="{
              name: report.website.reports.totalCount === 1 ? 'sites' : 'site'
            }"
          >
            <template #default="{ deleteReports }">
              <NButton
                type="primary"
                circle
                @click="deleteReports([reportId])"
                :disabled="report.status === 'PROCESSING'"
              >
                <RiDeleteBin7Fill />
              </NButton>
            </template>
          </DeleteReports>
        </div>
      </div>

      <div class="w-120 relative flex items-center justify-start">
        <NProgress
          v-if="['PENDING', 'PROCESSING'].includes(report.status)"
          type="circle"
          :percentage="
            Math.round((report.processedCount / report.totalCount) * 100)
          "
          class="ml-16 scale-[2.25]"
        />

        <div v-else class="absolute inset-y-0 w-120 right-4">
          <ReportPieChart ref="pieChart" v-bind="report" :offsetY="75" />
        </div>
      </div>

      <div class="border-r" />

      <PreviousReport v-bind="report" class="pl-6 mr-2 w-60" />
    </Card>
  </Loader>

  <CheckResults :reportId="reportId" />
</template>

<script>
import { Loader, Card, ReportPieChart, Status } from "@/components";
import Illustration from "./components/Illustration.vue";
import PreviousReport from "./components/PreviousReport/PreviousReport.vue";
import CheckResults from "./components/CheckResults/CheckResults.vue";
import DeleteReports from "./components/DeleteReports.vue";
import {
  reportQuery,
  reportSubscription,
  websiteSubscription
} from "./report.gql";
import gql from "graphql-tag";
import {
  success,
  requestErrorHandler,
  elapsedTimeFormatter,
  getRoundedPercent,
  info
} from "@/helpers.js";

export default {
  components: {
    Loader,
    Illustration,
    PreviousReport,
    CheckResults,
    DeleteReports,
    Card,
    ReportPieChart,
    Status
  },
  inheritAttrs: false,
  props: {
    host: { type: String, required: true },
    reportId: { type: String, required: true }
  },
  setup: () => ({ elapsedTimeFormatter, getRoundedPercent }),
  data: () => ({
    report: {},
    error: "",
    generating: false,
    intervalId: null,
    processingDuration: 0
  }),
  apollo: {
    report: {
      query: reportQuery,
      variables() {
        return { id: this.reportId };
      },
      result({ data: { report } }) {
        if (report.status === "PROCESSING" && !this.intervalId) {
          const now = Date.now();
          const [{ updatedAt = now } = {}] = report.oldestCheckResult.entries;
          this.processingDuration = now - new Date(updatedAt);
          this.intervalId = setInterval(
            () => (this.processingDuration += 1000),
            1000
          );
        }

        if (report.status !== "PROCESSING" && this.intervalId)
          clearInterval(this.intervalId);
      },
      error: (err, vm) => (vm.error = err.toString())
    }
  },
  computed: {
    urlPathname: ({ report: { url } }) => url && new URL(url).pathname,
    duration: ({ report, processingDuration }) =>
      elapsedTimeFormatter(
        Math.round(
          (report.status === "PROCESSING"
            ? processingDuration
            : report.duration) / 1000
        )
      )
  },
  watch: {
    reportId: {
      immediate: true,
      handler() {
        const { host, reportId } = this;

        this.$subscribe.add(
          { key: `report:${reportId}-website`, clearOnDelete: true },
          { query: websiteSubscription, variables: { host } },
          ({ data: { website } }) => {
            const { operation } = website;
            const { name, params } = this.$route;
            const isMounted = name === "report" && reportId === params.reportId;
            if (operation !== "DELETE" || !isMounted) return;

            info({
              title: this.$t("REDIRECTION"),
              content: this.$t("WEBSITE_{HOST}_DELETED", { host })
            });

            return this.$router.push({ name: "sites" });
          }
        );

        this.$subscribe.add(
          { key: `report:${this.reportId}`, clearOnDelete: true },
          { query: reportSubscription, variables: { id: this.reportId } },
          ({ data: { report } }) => {
            const { operation, data } = report;
            const { name, params } = this.$route;
            const isMounted =
              name === "report" && this.reportId === params.reportId;
            if (operation !== "DELETE" || !isMounted) return;

            info({
              title: this.$t("REDIRECTION"),
              content: this.$t("REPORT_DELETED")
            });

            const { host, reports } = data.website;
            return this.$router.push(
              reports.totalCount > 1
                ? { name: "site", params: { host } }
                : { name: "sites" }
            );
          }
        );
      }
    }
  },
  unmounted() {
    clearInterval(this.intervalId);
  },
  methods: {
    generateReport() {
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
          variables: { url: this.report.url }
        })
        .then(({ data: { generateReport: { id } = {} } }) => {
          success();
          this.$router.push({ params: { reportId: id } });
        })
        .catch(requestErrorHandler)
        .finally(() => (this.generating = false));
    }
  },
  i18n: {
    "en-US": {
      "{COUNT}_REPORTS": "1 report | {n} reports",
      "WEBSITE_{HOST}_DELETED": "Website {host} deleted",
      REPORT_DELETED: "Report deleted"
    },
    "fr-FR": {
      "{COUNT}_REPORTS": "1 rapport | {n} rapports",
      "WEBSITE_{HOST}_DELETED": "Site {host} supprimé",
      REPORT_DELETED: "Rapport supprimé"
    }
  }
};
</script>
