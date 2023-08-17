<template>
  <GenerateReport class="mb-10" />

  <div class="flex gap-10">
    <div class="w-1/4 2xl:w-1/5 shrink-0 space-y-6 text-slate-700 text-base">
      <Card size="sm" class="text-center space-y-2 leading-none">
        <span>{{ $t("TOTAL_OF_CHECKED_WEBSITES") }}</span>

        <div class="font-semibold">
          <NSpin v-if="$apollo.queries.websites.loading" class="mt-1" />
          <template v-else>{{ websites.totalCount || "-" }}</template>
        </div>
      </Card>

      <Card size="sm" class="text-center space-y-2 leading-none">
        <span>{{ $t("TOTAL_OF_GENERATED_REPORTS") }}</span>
        <div class="font-semibold">
          <NSpin v-if="$apollo.queries.reportsCount.loading" class="mt-1" />
          {{ reportsCount || "-" }}
        </div>
      </Card>

      <Card size="sm" class="text-center space-y-2 leading-none">
        <span>{{ $t("TOTAL_OF_CHECKED_URLS") }}</span>
        <div class="font-semibold">
          <NSpin
            v-if="$apollo.queries.checkResultsCount.loading"
            class="mt-1"
          />
          {{ checkResultsCount || "-" }}
        </div>
      </Card>

      <Illustration class="!mt-16 mx-auto drop-shadow-xl" />
    </div>

    <Error :error="error">
      <Card size="lg" class="grow">
        <Loader
          :loading="
            !search && !websites.totalCount && $apollo.queries.websites.loading
          "
        >
          <NInput
            @update:value="handleSearch"
            clearable
            :placeholder="$t('SEARCH_BY_SITE_NAME')"
            class="mb-4"
          >
            <template #suffix>
              <RiSearch2Line v-show="!search" class="absolute text-slate-400" />
            </template>
          </NInput>

          <template v-if="websites.totalCount">
            <Table
              v-model="selected"
              :rows="websites.entries"
              :get-key="({ host }) => host"
              :loading="$apollo.queries.websites.loading"
            />

            <div class="mt-4 flex justify-center">
              <NPagination
                v-model:page="page.current"
                :item-count="websites.totalCount"
                :page-sizes="[10, 20, 30, 40, 50]"
                show-size-picker
                v-model:pageSize="page.size"
                @update:pageSize="page.current = 1"
                class="[&_.n-pagination-item]:font-semibold"
              />
            </div>
          </template>

          <div
            v-else
            class="h-full flex items-center justify-center text-slate-500 font-semibold"
          >
            {{ $t("HERE_WILL_BE_DISPLAY_CHECKED_WEBSITE_LIST") }}
          </div>
        </Loader>
      </Card>
    </Error>
  </div>
</template>

<script>
import { Card, Error, Loader } from "@/components";
import Illustration from "./components/Illustration.vue";
import Table from "./components/Table.vue";
import { debounce } from "@/helpers.js";
import websitesQuery from "./queries/websites.query.gql";
import reportSub from "./queries/report.subscription.gql";
import websiteSub from "./queries/website.subscription.gql";
import gql from "graphql-tag";
import GenerateReport from "./components/GenerateReport.vue";

export default {
  components: { Card, Error, Loader, Illustration, Table, GenerateReport },
  data: () => ({
    search: "",
    sort: { by: "updatedAt", order: "DESC" },
    websites: { totalCount: 0, entries: [] },
    page: { current: 1, size: 10 },
    reportsCount: 0,
    checkResultsCount: 0,
    error: "",
    selected: []
  }),
  apollo: {
    websites: {
      query: websitesQuery,
      variables() {
        return { search: this.search, sort: this.sort, page: this.page };
      },
      error: (err, vm) => (vm.error = err.toString())
    },
    reportsCount: {
      query: gql`
        query {
          reports {
            totalCount
          }
        }
      `,
      update: ({ reports }) => reports.totalCount
    },
    checkResultsCount: {
      query: gql`
        query {
          checkResults {
            totalCount
          }
        }
      `,
      update: ({ checkResults }) => checkResults.totalCount
    },
    $subscribe: {
      websiteChange: {
        query: websiteSub,
        result({ data: { website: { operation } = {} } }) {
          if (operation === "UPDATE") return;
          Object.values(this.$apollo.queries || {}).forEach(query =>
            query.refetch()
          );
        }
      },
      reportChange: {
        query: reportSub,
        result({ data: { report: { operation, data: { status } } = {} } }) {
          if (operation !== "UPDATE")
            return Object.values(this.$apollo.queries || {}).forEach(query =>
              query.refetch()
            );

          const outdatedQueries = ["websites", "checkResultsCount"].map(
            query => this.$apollo.queries[query]
          );

          status === "PROCESSING"
            ? outdatedQueries.forEach(query => query.startPolling(1000))
            : outdatedQueries.forEach(query =>
                setTimeout(() => query?.stopPolling(), 1000)
              );
        }
      }
    }
  },
  methods: {
    handleSearch: debounce(function (search) {
      this.search = search;
      this.page.current = 1;
    }, 500)
  },
  i18n: {
    messages: {
      "en-US": {
        TOTAL_OF_CHECKED_WEBSITES: "Total of checked websites",
        TOTAL_OF_GENERATED_REPORTS: "Total of generated reports",
        TOTAL_OF_CHECKED_URLS: "Total of checked URLs",
        HERE_WILL_BE_DISPLAY_CHECKED_WEBSITE_LIST:
          "Here will be displayed checked websites list",
        SEARCH_BY_SITE_NAME: "Search by site name"
      },
      "fr-FR": {
        TOTAL_OF_CHECKED_WEBSITES: "Total des sites vérifiés",
        TOTAL_OF_GENERATED_REPORTS: "Total de rapports générés",
        TOTAL_OF_CHECKED_URLS: "Total d'URL vérifiées",
        HERE_WILL_BE_DISPLAY_CHECKED_WEBSITE_LIST:
          "Ici s’affichera la liste des sites testés",
        SEARCH_BY_SITE_NAME: "Rechercher par nom de site"
      }
    }
  }
};
</script>
