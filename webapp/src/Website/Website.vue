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
          {{ $t("{n}_REPORTS", website.reports.totalCount) }}
        </div>
      </div>

      <div class="flex">
        <GenerateReport :host />

        <DeleteWebsites :to="{ name: 'sites' }" v-slot="{ deleteWebsites }">
          <div class="ml-4 pl-4 border-l border-slate-500">
            <NTooltip :disabled="!website.activeReports.totalCount">
              <template #trigger>
                <NButton
                  type="primary"
                  circle
                  @click="deleteWebsites([host])"
                  :disabled="!!website.activeReports.totalCount"
                >
                  <RiDeleteBin7Fill />
                </NButton>
              </template>
              {{ $t("A_REPORT_IS_IN_PROGRESS") }}
            </NTooltip>
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
      :reports
      :noMatch="noReportsMatch"
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
import {
  websiteQuery,
  websiteSubscription,
  reportsQuery,
  reportSubscription
} from "./website.gql";
import { uniqBy, deepCopy, info } from "@/helpers.js";
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
    processingReportsCount: 0,
    page: 1,
    errors: { website: "", reports: "" },
    search: "",
    sort: new Sort(),
    filters: getFilters(),
    defaultFilters: getFilters()
  }),
  apollo: {
    website: {
      query: websiteQuery,
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
      query: reportsQuery,
      variables() {
        const { host, page, sort, search, filters, defaultFilters } = this;
        const apiFilters = Object.entries(filters).reduce(
          (acc, [key, filter]) =>
            filter && `${filter}` !== `${defaultFilters[key]}`
              ? { ...acc, [key]: { gte: filter[0], lte: filter[1] } }
              : acc,
          { websiteHost: { equals: host } }
        );

        return {
          host,
          sort,
          page,
          filters: {
            ...apiFilters,
            ...(search && { url: { contains: search } })
          }
        };
      },
      update({ reports: { totalCount, entries } }) {
        this.reportsTotalCount = totalCount;
        return uniqBy([...this.reports, ...deepCopy(entries)], "id");
      },
      error: (err, vm) => (vm.errors.reports = err.toString())
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
    this.$subscribe.add(
      { key: `website:${this.host}`, clearOnDelete: true },
      { query: websiteSubscription, variables: { host: this.host } },
      ({ data: { website } }) => {
        const { operation, data: { host } = {} } = website;
        const { name, params } = this.$route;
        const isMounted = name === "site" && this.host === params.host;
        if (operation !== "DELETE" || !isMounted) return;

        info({
          title: this.$t("REDIRECTION"),
          content: this.$t("WEBSITE_{host}_DELETED", { host })
        });

        return this.$router.push({ name: "sites" });
      }
    );

    this.$subscribe.add(
      {
        key: `website:${this.host}-reports`,
        evictCache: { fieldName: "reports" }
      },
      { query: reportSubscription },
      ({ data: { report: { operation, data } = {} } }) => {
        if (data.website.host !== this.host) return;
        delete data.website; // prevent side effect in ReportsGallery > ReportCard

        if (operation === "CREATE")
          return Object.assign(this, { page: 1, reports: [] });

        const prevIdx = this.reports.findIndex(({ id }) => id === data.id);
        if (prevIdx < 0) return;

        if (operation === "UPDATE")
          return Object.assign(this.reports[prevIdx], data);

        operation === "DELETE" && this.reports.splice(prevIdx, 1);
      }
    );

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
    "en-US": {
      "{n}_REPORTS": "1 report | {n} reports",
      "WEBSITE_{host}_DELETED": 'Website "{host}" deleted'
    },
    "fr-FR": {
      "{n}_REPORTS": "1 rapport | {n} rapports",
      "WEBSITE_{host}_DELETED": 'Site "{host}" supprimé'
    }
  }
};
</script>
