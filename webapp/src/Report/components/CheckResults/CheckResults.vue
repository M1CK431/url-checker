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
      :reportId="reportId"
    />

    <Card>
      <div class="text-right mb-1">
        <ExportAsCsv :reportId="reportId" />
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
          <Status :status="status" :errorReason="errorReason" />
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
          :itemCount="totalCount"
          :pageSizes="[10, 20, 30, 40, 50]"
          showSizePicker
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
import { checkResultsQuery, reportSubscription } from "./checkResults.gql";
import {
  debounce,
  sizeFormatter,
  secondFormatter,
  getPathname
} from "@/helpers.js";
import ResponseCodeTypeFilter from "./components/ResponseCodeTypeFilter.vue";
import RecheckUrl from "./components/RecheckUrl.vue";

function Filters() {
  return { responseCode: undefined };
}

function Sort() {
  return { by: "url", order: "asc" };
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
  watch: {
    reportId: {
      immediate: true,
      handler() {
        this.$subscribe.add(
          {
            key: `reportCheckResults:${this.reportId}`,
            evictCache: { on: [], fieldName: "checkResults" },
            clearOnDelete: true
          },
          { query: reportSubscription, variables: { id: this.reportId } }
        );
      }
    }
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
      query: checkResultsQuery,
      variables() {
        const { reportId, page, sort, debouncedSearch, filters } = this;

        return {
          page,
          sort,
          filters: {
            ...filters,
            ...(debouncedSearch && { url: { contains: debouncedSearch } }),
            reportId: { equals: +reportId }
          }
        };
      },
      update({ checkResults: { totalCount, entries } }) {
        this.totalCount = totalCount;
        return entries;
      },
      error: (err, vm) => (vm.error = err.toString())
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
