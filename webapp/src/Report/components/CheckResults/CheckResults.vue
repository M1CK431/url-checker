<template>
  <Loader :loading="!isConfigured && $apollo.loading" :error="error">
    <NInput
      v-model:value="search"
      @update:value="handleSearch"
      clearable
      :placeholder="$t('SEARCH_BY_URL')"
      class="mb-4 shadow-xl"
    >
      <template #suffix>
        <RiSearch2Line v-show="!search" class="absolute text-slate-400" />
      </template>
    </NInput>

    <ResponseCodeTypeFilter
      v-model="filters.responseCode"
      @update:modelValue="page.current = 1"
      :report-id="reportId"
    />

    <Card>
      <div class="text-right mb-1">
        <ExportAsCsv :report-id="reportId" />
      </div>

      <Table
        :loading="$apollo.loading"
        :columns="columns"
        :rows="checkResults"
        v-model:sort="sort"
        :placeholder="$t('NO_URL_FOUND')"
      >
        <template #url="{ url, row: { errorReason } }">
          <NEllipsis style="max-width: 15vw">
            <a
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-sm"
            >
              {{
                errorReason === "Redirect URL is not on the same host"
                  ? url
                  : getPathname(url)
              }}
            </a>
          </NEllipsis>
        </template>

        <template #updatedAt="{ updatedAt }">
          {{
            new Date(updatedAt).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "medium"
            })
          }}
        </template>

        <template #responseCode="{ responseCode }">
          <ResponseCode :code="responseCode || 0" />
        </template>

        <template #redirectUrl="{ redirectUrl }">
          <div v-if="redirectUrl" class="flex gap-2">
            <NEllipsis style="max-width: 15vw">
              <a
                :href="redirectUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-sm"
              >
                {{ getPathname(redirectUrl) }}
              </a>
            </NEllipsis>

            <NButton
              quaternary
              circle
              size="tiny"
              @click="redirectionSearch(getPathname(redirectUrl))"
            >
              <RiShareForwardFill />
            </NButton>
          </div>
          <template v-else>-</template>
        </template>

        <template #size="{ size, row: { responseCode } }">
          {{ size && `${responseCode}`[0] !== "3" ? sizeFormatter(size) : "-" }}
        </template>

        <template #duration="{ duration }">
          {{ duration ? secondFormatter(duration) : "-" }}
        </template>

        <template #status="{ status, row: { errorReason } }">
          <Status :status="status" :error-reason="errorReason" />
        </template>

        <template #actions="{ row }">
          <div class="text-right">
            <NButton
              type="primary"
              size="tiny"
              class="p-3"
              @click="recheckUrl = row.url"
            >
              {{ $t("CHECK") }}
            </NButton>
          </div>
        </template>
      </Table>

      <div class="mt-4 flex justify-center">
        <NPagination
          v-model:page="page.current"
          :item-count="totalCount"
          :page-sizes="[10, 20, 30, 40, 50]"
          show-size-picker
          v-model:pageSize="page.size"
          @update:pageSize="page.current = 1"
          class="[&_.n-pagination-item]:font-semibold"
        />
      </div>
    </Card>
  </Loader>

  <RecheckUrl v-model:url="recheckUrl" />
</template>

<script>
import { Loader, Card, Table, ResponseCode, Status } from "@/components";
import ExportAsCsv from "./components/ExportAsCsv/ExportAsCsv.vue";
import reportCheckResultsQuery from "./queries/reportCheckResults.query.gql";
import reportSub from "./queries/report.subscription.gql";
import {
  debounce,
  sizeFormatter,
  secondFormatter,
  getPathname
} from "@/helpers.js";
import ResponseCodeTypeFilter from "./components/ResponseCodeTypeFilter.vue";
import RecheckUrl from "./components/RecheckUrl.vue";

function Filters() {
  return { responseCode: null };
}

function Sort() {
  return { by: "url", order: "ASC" };
}

export default {
  components: {
    Loader,
    Card,
    Table,
    ResponseCode,
    Status,
    ExportAsCsv,
    ResponseCodeTypeFilter,
    RecheckUrl
  },
  props: { reportId: { type: String, required: true } },
  setup: () => ({ sizeFormatter, secondFormatter, getPathname }),
  data: () => ({
    search: "",
    debouncedSearch: "",
    reportStatus: "",
    checkResults: [],
    page: { current: 1, size: 10 },
    totalCount: 0,
    sort: new Sort(),
    filters: new Filters(),
    error: "",
    exporting: false,
    recheckUrl: ""
  }),
  computed: {
    columns: ({ $i18n }) =>
      [
        { key: "url", name: "URL", className: "w-[15vw]" },
        { key: "updatedAt", name: "DATE" },
        { key: "responseCode", name: "CODE" },
        { key: "redirectUrl", name: "REDIRECTION" },
        { key: "size", name: "SIZE" },
        { key: "duration", name: "DURATION" },
        { key: "status", name: "STATUS" },
        { key: "actions", name: "" }
      ].map(({ name, ...rest }) => ({
        ...rest,
        name: name && $i18n.t(name),
        sortable: !!name
      })),
    isConfigured: ({ search, checkResults, sort, filters }) =>
      search ||
      checkResults[0] ||
      JSON.stringify(filters) !== JSON.stringify(new Filters()) ||
      JSON.stringify(sort) !== JSON.stringify(new Sort())
  },
  methods: {
    handleSearch: debounce(function (search) {
      this.debouncedSearch = search;
      this.page.current = 1;
    }, 500),
    redirectionSearch(search) {
      this.page.current = 1;
      Object.assign(this, {
        filters: new Filters(),
        search,
        debouncedSearch: search
      });
    }
  },
  apollo: {
    checkResults: {
      fetchPolicy: "network-only",
      query: reportCheckResultsQuery,
      variables() {
        const { reportId, page, sort, debouncedSearch, filters } = this;

        return { id: reportId, page, sort, search: debouncedSearch, filters };
      },
      update({ report: { checkResults: { totalCount, entries } = {} } }) {
        this.totalCount = totalCount;
        return entries;
      },
      error: (err, vm) => (vm.error = err.toString())
    },
    $subscribe: {
      reportChange: {
        query: reportSub,
        variables() {
          return { id: this.reportId };
        },
        result({ data: { report: { operation, data: { status } } = {} } }) {
          if (operation === "DELETE") return;

          status === "PROCESSING"
            ? this.$apollo.queries.checkResults.startPolling(1000)
            : setTimeout(
                () => this.$apollo?.queries.checkResults.stopPolling(),
                1000
              );
        }
      }
    }
  },
  i18n: {
    messages: {
      "en-US": {
        SEARCH_BY_URL: "Search by URL",
        ALL: "All",
        NO_URL_FOUND: "No URL found"
      },
      "fr-FR": {
        SEARCH_BY_URL: "Rechercher par URL",
        ALL: "Tous",
        NO_URL_FOUND: "Aucune URL trouvée"
      }
    }
  }
};
</script>
