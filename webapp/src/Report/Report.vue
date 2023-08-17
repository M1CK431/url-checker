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
          {{ $tc("{COUNT}_REPORTS", report.website.reports.totalCount) }}
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
            <span>
              {{ elapsedTimeFormatter(Math.round(report.duration / 1000)) }}
            </span>
          </div>

          <div class="space-x-3">
            <span class="font-semibold">{{ $t("STATUS") }}:</span>
            <Status v-bind="report" />
          </div>
        </div>

        <div class="absolute left-4 bottom-4 flex gap-4">
          <NButton type="primary" @click="generateReport" :loading="generating">
            {{ $t("CHECK") }}
          </NButton>

          <NButton type="primary" circle @click="$refs.pieChart.exportAsPng()">
            <RiDownload2Line class="text-base" />
          </NButton>

          <DeleteReports
            :to="{
              name: report.website.reports.totalCount === 1 ? 'sites' : 'site'
            }"
          >
            <template #default="{ deleteReports }">
              <NButton type="primary" circle @click="deleteReports([reportId])">
                <RiDeleteBin7Fill />
              </NButton>
            </template>
          </DeleteReports>
        </div>
      </div>

      <div class="w-[30rem] relative flex items-center justify-start">
        <NProgress
          v-if="report.status === 'PROCESSING'"
          type="circle"
          :percentage="
            Math.round((report.processedCount / report.totalCount) * 100)
          "
          class="ml-16 scale-[2.25]"
        />

        <div v-else class="absolute inset-y-0 w-[30rem] right-4">
          <ReportPieChart ref="pieChart" v-bind="report" :offset-y="75" />
        </div>
      </div>

      <div class="border-r" />

      <PreviousReport v-bind="report" class="pl-6 mr-2 w-60" />
    </Card>
  </Loader>

  <CheckResults :report-id="reportId" />
</template>

<script>
import { Loader, Card, ReportPieChart, Status } from "@/components";
import Illustration from "./components/Illustration.vue";
import PreviousReport from "./components/PreviousReport/PreviousReport.vue";
import CheckResults from "./components/CheckResults/CheckResults.vue";
import DeleteReports from "./components/DeleteReports.vue";
import reportQuery from "./queries/report.query.gql";
import reportSub from "./queries/report.subscription.gql";
import gql from "graphql-tag";
import {
  success,
  requestErrorHandler,
  elapsedTimeFormatter,
  getRoundedPercent
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
  props: { reportId: { type: String, required: true } },
  setup: () => ({ elapsedTimeFormatter, getRoundedPercent }),
  data: () => ({ report: {}, error: "", generating: false }),
  apollo: {
    report: {
      query: reportQuery,
      variables() {
        return { id: this.reportId };
      },
      error: (err, vm) => (vm.error = err.toString())
    },
    $subscribe: {
      reportChange: {
        query: reportSub,
        variables() {
          return { id: this.reportId };
        }
      }
    }
  },
  computed: {
    urlPathname: ({ report: { url } }) => url && new URL(url).pathname
  },
  methods: {
    generateReport() {
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
    messages: {
      "en-US": { "{COUNT}_REPORTS": "1 report | {n} reports" },
      "fr-FR": { "{COUNT}_REPORTS": "1 rapport | {n} rapports" }
    }
  }
};
</script>
