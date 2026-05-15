<template>
  <div class="flex items-center justify-between mb-10">
    <div class="flex items-center gap-4 text-slate-700">
      <NButton
        type="primary"
        size="tiny"
        @click="$router.push({ name: 'home' })"
      >
        <RiArrowLeftSLine />
      </NButton>

      <h2 class="font-semibold text-base">{{ $t("USERS") }}</h2>
    </div>

    <NButton type="primary" @click="$router.push({ name: 'users.create' })">
      {{ $t("CREATE") }}
    </NButton>
  </div>

  <Error :error="error">
    <Card size="lg" class="grow">
      <Loader
        :loading="!search && !users.totalCount && $apollo.queries.users.loading"
      >
        <NInput
          @update:value="handleSearch"
          clearable
          :placeholder="$t('SEARCH_BY_IDENTIFIER')"
          class="mb-4"
        >
          <template #suffix>
            <RiSearch2Line v-show="!search" class="absolute text-slate-400" />
          </template>
        </NInput>

        <Table
          v-model:sort="sort"
          :rows="users.entries"
          :loading="$apollo.queries.users.loading"
        />

        <div class="mt-4 flex justify-center">
          <NPagination
            v-model:page="page.current"
            :itemCount="users.totalCount"
            :pageSizes="[10, 20, 30, 40, 50]"
            showSizePicker
            v-model:pageSize="page.size"
            @update:pageSize="page.current = 1"
            class="[&_.n-pagination-item]:font-semibold"
          />
        </div>
      </Loader>
    </Card>
  </Error>
</template>

<script>
import { Card, Error, Loader } from "@/components";
import Table from "./children/Table.vue";
import gql from "graphql-tag";
import { debounce } from "@/helpers.js";

export default {
  components: { Card, Error, Loader, Table },
  data: () => ({
    search: "",
    sort: { by: "createdAt", order: "desc" },
    page: { current: 1, size: 10 },
    users: { totalCount: 0, entries: [] },
    error: ""
  }),
  apollo: {
    users: {
      query: gql`
        query (
          $filters: UserFiltersInput
          $sort: UserSortInput
          $page: PageInput!
        ) {
          users(filters: $filters, sort: $sort, page: $page) {
            totalCount
            entries {
              id
              identifier
              enabled
              lastLogin
              createdAt
            }
          }
        }
      `,
      variables() {
        return {
          ...(this.search && {
            filters: { identifier: { contains: this.search } }
          }),
          sort: this.sort,
          page: this.page
        };
      },
      update({ users: { entries, ...rest } }) {
        return {
          ...rest,
          entries: entries.map(u => ({
            ...u,
            unselectable: u.identifier === this.$auth.user.identifier
          }))
        };
      },
      error: (err, vm) => (vm.error = err.toString())
    }
  },
  mounted() {
    this.$subscribe.add(
      { key: "users", evictCache: { fieldName: "users" } },
      {
        query: gql`
          subscription {
            user {
              operation
              data {
                id
                identifier
                enabled
                lastLogin
                createdAt
              }
            }
          }
        `
      }
    );
  },
  methods: {
    handleSearch: debounce(function (search) {
      this.search = search;
      this.page.current = 1;
    }, 500)
  },
  i18n: {
    "en-US": { CREATE: "Create", SEARCH_BY_IDENTIFIER: "Search by identifier" },
    "fr-FR": {
      CREATE: "Créer",
      SEARCH_BY_IDENTIFIER: "Rechercher par identifiant"
    }
  }
};
</script>
