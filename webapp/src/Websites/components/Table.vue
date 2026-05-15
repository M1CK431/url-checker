<template>
  <div class="relative">
    <DeleteWebsites v-slot="{ deleteWebsites }" @deleted="handleDeleted">
      <Table
        :modelValue
        v-bind="$attrs"
        :columns
        class="text-slate-700 websites-table"
        @rowClick="
          $router.push({ name: 'site', params: { host: $event.host } })
        "
      >
        <template #host="{ host, row }">
          <div class="flex items-center gap-2">
            <img :src="row.faviconUrl" alt="website favicon" class="h-4 w-4" />
            <NEllipsis style="max-width: 15vw" class="font-semibold text-sm">
              {{ host }}
            </NEllipsis>
          </div>
        </template>

        <template #totalReportsCount="{ row }">
          {{ row.reports.totalCount.toLocaleString() }}
        </template>

        <template #totalUrlsCount="{ row }">
          {{ row.reports.entries[0].totalCount.toLocaleString() }}
        </template>

        <template #updatedAt="{ updatedAt }">
          {{
            new Date(updatedAt).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short"
            })
          }}
        </template>

        <template
          #urlErrorPercent="{ row: { reports: { entries: [report] } = {} } }"
        >
          {{
            getRoundedPercent(
              report.http4xxCount + report.http5xxCount,
              report.totalCount
            )
          }}
        </template>

        <template #actions="{ row }">
          <div
            @click.stop
            class="opacity-0 [.websites-table_tr:hover_&]:opacity-100 transition-opacity duration-300"
          >
            <NTooltip :disabled="!row.activeReports.totalCount">
              <template #trigger>
                <NButton
                  text
                  type="primary"
                  :disabled="!!row.activeReports.totalCount"
                  @click="deleteWebsites([row.host])"
                  class="hover:text-red-600! transition-colors"
                >
                  <RiDeleteBin7Fill />
                </NButton>
              </template>
              {{ $t("A_REPORT_IS_IN_PROGRESS") }}
            </NTooltip>
          </div>
        </template>
      </Table>

      <BulkActions
        :modelValue
        v-bind="$attrs"
        @bulkDelete="deleteWebsites($event.map(({ host }) => host))"
        class="absolute bottom-0"
      />
    </DeleteWebsites>
  </div>
</template>

<script>
import { Table, BulkActions } from "@/components";
import { getRoundedPercent } from "@/helpers.js";
import DeleteWebsites from "./DeleteWebsites.vue";

export default {
  components: { Table, BulkActions, DeleteWebsites },
  inheritAttrs: false,
  props: { modelValue: { type: Array, required: true } },
  setup: () => ({ getRoundedPercent }),
  computed: {
    columns: ({ $t }) => [
      { key: "host", name: $t("WEBSITE"), className: "w-[15vw]" },
      { key: "totalReportsCount", name: $t("NUMBER_OF_REPORTS") },
      { key: "totalUrlsCount", name: $t("NUMBER_OF_URLS") },
      { key: "updatedAt", name: $t("LAST_CHECK") },
      { key: "urlErrorPercent", name: $t("%_URLS_IN_ERROR") },
      { key: "actions", className: "w-5" }
    ]
  },
  methods: {
    handleDeleted(deleted) {
      this.$emit(
        "update:modelValue",
        this.modelValue.filter(({ host }) => !deleted.includes(host))
      );
    }
  },
  i18n: {
    "en-US": {
      WEBSITE: "Website",
      NUMBER_OF_REPORTS: "Nbr of reports",
      NUMBER_OF_URLS: "Nbr of URLs",
      LAST_CHECK: "Last check",
      "%_URLS_IN_ERROR": "% URLs with error"
    },
    "fr-FR": {
      WEBSITE: "Site",
      NUMBER_OF_REPORTS: "Nbr de rapports",
      NUMBER_OF_URLS: "Nbr d'URLs",
      LAST_CHECK: "Dernière vérification",
      "%_URLS_IN_ERROR": "% URLs en erreur"
    }
  }
};
</script>
