<template>
  <Loader :loading="$apollo.queries.website.loading" :error="errors.website">
    <div class="flex items-center justify-between">
      <div class="flex items-center text-slate-700">
        <NButton
          type="primary"
          size="tiny"
          @click="$router.push({ name: 'sites' })"
        >
          <RiArrowLeftSLine />
        </NButton>

        <div class="flex items-center px-4 border-r border-slate-500">
          <img :src="website.faviconUrl" alt="favicon" class="h-4 w-4 mr-2" />
          <h2 class="font-semibold text-base">{{ website.host }}</h2>
        </div>

        <div class="ml-4 font-semibold">
          {{ $tc("{n}_REPORTS", website.reports.totalCount) }}
        </div>
      </div>

      <div class="flex">
        <GenerateReport :host="host" />

        <DeleteWebsites v-slot="{ deleteWebsites }">
          <div class="ml-4 pl-4 border-l border-slate-500">
            <NButton type="primary" circle @click="deleteWebsites([host])">
              <RiDeleteBin7Fill />
            </NButton>
          </div>
        </DeleteWebsites>
      </div>
    </div>

    <ReportsFilters
      v-model:filters="filters"
      @update:filters="reportsQueryVarsChange"
      v-model:search="search"
      @update:search="reportsQueryVarsChange"
      class="mt-10"
    />

    <ReportsGallery
      ref="reportsGallery"
      :loading="$apollo.queries.reports.loading"
      :error="errors.reports"
      v-model:sort="sort"
      @update:sort="reportsQueryVarsChange"
      :reports="reports"
      :no-match="noReportsMatch"
      class="mt-6"
    />
  </Loader>
</template>

<script>
import { Loader } from "@/components";
import DeleteWebsites from "@/Websites/components/DeleteWebsites.vue";
import ReportsFilters from "./components/ReportsFilters/ReportsFilters.vue";
import ReportsGallery, { Sort } from "./components/ReportsGallery.vue";
import GenerateReport from "./components/GenerateReport.vue";
import websiteReportsQuery from "./queries/websiteReports.query.gql";
import reportSub from "./queries/report.subscription.gql";
import gql from "graphql-tag";
import { uniqBy } from "@/helpers.js";
import { ctx as appCtx } from "@/App.vue";

const getFilters = (maxUrlsCount = 0) => ({
  updatedAt: null,
  processedCount: [0, maxUrlsCount],
  http3xxCount: [0, maxUrlsCount],
  http4xxCount: [0, maxUrlsCount],
  http5xxCount: [0, maxUrlsCount]
});

export default {
  components: {
    Loader,
    DeleteWebsites,
    GenerateReport,
    ReportsFilters,
    ReportsGallery
  },
  props: { host: { type: String, required: true } },
  data: () => ({
    website: {},
    reports: [],
    reportsTotalCount: 0,
    page: 1,
    errors: { website: "", reports: "" },
    search: "",
    sort: new Sort(),
    filters: getFilters(),
    defaultFilters: getFilters()
  }),
  apollo: {
    website: {
      query: gql`
        query ($host: String!) {
          website(host: $host) {
            host
            faviconUrl
            maxUrlsCount
            reports {
              totalCount
            }
          }
        }
      `,
      variables() {
        return { host: this.host };
      },
      update({ website, website: { maxUrlsCount } }) {
        this.filters = getFilters(maxUrlsCount);
        this.defaultFilters = getFilters(maxUrlsCount);

        return website;
      },
      error: (err, vm) => (vm.errors.website = err.toString())
    },
    reports: {
      query: websiteReportsQuery,
      variables() {
        const { host, page, sort, search, filters, defaultFilters } = this;
        const apiFilters = Object.entries(filters).reduce(
          (acc, [key, filter]) =>
            filter && `${filter}` !== `${defaultFilters[key]}`
              ? { ...acc, [key]: { start: filter[0], end: filter[1] } }
              : acc,
          {}
        );

        return { host, sort, page, search, filters: apiFilters };
      },
      update({ website: { reports: { totalCount, entries } = {} } }) {
        this.reportsTotalCount = totalCount;
        return uniqBy([...this.reports, ...entries], "id");
      },
      error: (err, vm) => (vm.errors.reports = err.toString())
    },
    $subscribe: {
      websiteChange: {
        query: gql`
          subscription ($host: String!) {
            website(host: $host) {
              operation
            }
          }
        `,
        variables() {
          return { host: this.host };
        },
        result({ data: { website: { operation } = {} } }) {
          if (operation === "DELETE")
            return this.$router.push({ name: "sites" });
          this.$apollo.queries?.website.refetch();
        }
      },
      reportChange: {
        query: reportSub,
        result({ data: { report: { operation, data } = {} } }) {
          const prev = this.reports.find(({ id }) => id === data.id);
          if (operation === "UPDATE") return prev && Object.assign(prev, data);

          Object.assign(this, { page: 1, reports: [] });
          Object.values(this.$apollo.queries || {}).forEach(query =>
            query.refetch()
          );
        }
      }
    }
  },
  computed: {
    noReportsMatch: ({ reportsTotalCount, search, filters, defaultFilters }) =>
      !reportsTotalCount &&
      (!!search ||
        Object.entries(filters).some(
          ([key, filter]) => filter !== defaultFilters[key]
        ))
  },
  mounted() {
    appCtx.onScroll = () =>
      !this.$apollo.loading &&
      this.reports.length < this.reportsTotalCount &&
      this.page++;
  },
  unmounted() {
    appCtx.onScroll = null;
  },
  methods: {
    reportsQueryVarsChange() {
      Object.assign(this, { page: 1, reports: [] });
      this.$refs.reportsGallery.selected = [];
    }
  },
  i18n: {
    messages: {
      "en-US": {
        "{n}_REPORTS": "1 report | {n} reports",
        SELECT_A_WEBSITE_URL: "Select a website URL"
      },
      "fr-FR": {
        "{n}_REPORTS": "1 rapport | {n} rapports",
        SELECT_A_WEBSITE_URL: "Sélection une URL du site"
      }
    }
  }
};
</script>
