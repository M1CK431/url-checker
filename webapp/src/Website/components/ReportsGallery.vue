<template>
  <div class="flex items-end justify-between" :class="$attrs.class">
    <NCheckbox
      :checked="!!selected.length && selected.length === reports.length"
      @update:checked="selected = $event ? reports.map(({ id }) => id) : []"
      :indeterminate="!!selected.length && selected.length < reports.length"
    >
      {{ $t("SELECT_ALL") }}
    </NCheckbox>

    <div class="flex gap-2">
      <NSelect
        :value="sort.by"
        @update:value="$emit('update:sort', { ...sort, by: $event })"
        :options="[
          { label: $t('SORT_BY_DATE'), value: 'updatedAt' },
          { label: $t('SORT_BY_STATUS'), value: 'status' }
        ]"
        size="small"
      />
      <NSelect
        :value="sort.order"
        @update:value="$emit('update:sort', { ...sort, order: $event })"
        :options="[
          { label: $t('ASCENDING'), value: 'ASC' },
          { label: $t('DESCENDING'), value: 'DESC' }
        ]"
        size="small"
      />
    </div>
  </div>

  <DeleteReports v-slot="{ deleteReports }" @deleted="selected = []">
    <Loader
      :loading="!reports[0] && loading"
      :error="error"
      as="div"
      class="mt-6 relative grid gap-6 justify-between"
      style="grid-template-columns: repeat(auto-fill, 21.5rem)"
    >
      <ReportCard
        v-for="report in reports"
        :key="report.id"
        v-bind="report"
        :checked="selected.includes(report.id)"
        @update:checked="toggleSelected(report.id, $event)"
      />
    </Loader>

    <BulkActions
      v-model="selected"
      @bulkDelete="deleteReports"
      class="absolute bottom-0"
    />
  </DeleteReports>

  <div v-show="reports[0] && loading" class="text-center mt-6">
    <NSpin size="large" />
  </div>

  <div v-show="!loading && noMatch" class="mt-6 text-center text-slate-600">
    {{ $t("NO_REPORT_CORRESPONDS_TO_YOUR_CRITERIA") }}
  </div>
</template>

<script>
import { Loader, ReportCard, BulkActions } from "@/components";
import DeleteReports from "@/Report/components/DeleteReports.vue";

export function Sort() {
  return { by: "updatedAt", order: "DESC" };
}

export default {
  components: { Loader, ReportCard, BulkActions, DeleteReports },
  inheritAttrs: false,
  props: {
    loading: Boolean,
    error: String,
    noMatch: Boolean,
    sort: { type: Object, default: Sort },
    reports: { type: Array, default: () => [] }
  },
  data: () => ({ selected: [] }),
  methods: {
    toggleSelected(id, evt) {
      const { selected } = this;

      this.selected = evt
        ? [...selected, id]
        : selected.filter(selectedId => selectedId !== id);
    }
  },
  i18n: {
    messages: {
      "en-US": {
        SELECT_ALL: "Select all",
        SORT_BY_DATE: "Sort by date",
        SORT_BY_STATUS: "Sort by status",
        ASCENDING: "Ascending",
        DESCENDING: "Descending",
        NO_REPORT_CORRESPONDS_TO_YOUR_CRITERIA:
          "No report corresponds to your criteria"
      },
      "fr-FR": {
        SELECT_ALL: "Sélectionner tout",
        SORT_BY_DATE: "Trier par date",
        SORT_BY_STATUS: "Trier par statut",
        ASCENDING: "Croissant",
        DESCENDING: "Décroissant",
        NO_REPORT_CORRESPONDS_TO_YOUR_CRITERIA:
          "Aucun rapport ne correspond à vos critères"
      }
    }
  }
};
</script>
