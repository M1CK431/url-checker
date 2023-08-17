<template>
  <Card>
    <div class="flex justify-between mb-2">
      <div class="text-slate-700">{{ $t("FILTER_BY") }}</div>
      <NButton
        text
        type="primary"
        class="font-semibold text-xs uppercase"
        :disabled="!isFiltered"
        @click="resetFilters()"
      >
        {{ $t("RESET_FILTERS") }}
      </NButton>
    </div>

    <div class="flex gap-4 mb-4">
      <NDatePicker
        :value="filters.updatedAt"
        @update:value="handleFiltersChange('updatedAt', $event)"
        clearable
        type="daterange"
        :actions="null"
        close-on-select
        class="w-1/4"
      />

      <PopoverSelectSlider
        v-for="(placeholder, key) in {
          processedCount: $t('CHECKED_URLS_COUNT'),
          http4xxCount: $t('CLIENT_ERRORS_COUNT'),
          http5xxCount: $t('SERVER_ERRORS_COUNT'),
          http3xxCount: $t('REDIRECTS_COUNT')
        }"
        :key="key"
        v-model:value="localFilters[key]"
        @update:value="handleFiltersChange(key, $event)"
        :max="defaultFilters[key][1]"
        :description="getFilterRangeDescription(key)"
        :select-props="{
          placeholder,
          class: 'w-1/4',
          onClear: () => resetFilters(key)
        }"
      />
    </div>

    <NInput
      v-model:value="localSearch"
      @update:value="handleSearch"
      clearable
      :placeholder="$t('SEARCH_BY_SITEMAP_URL')"
    >
      <template #suffix>
        <RiSearch2Line v-show="!search" class="absolute text-slate-400" />
      </template>
    </NInput>
  </Card>
</template>

<script>
import { Card } from "@/components";
import { debounce, deepCopy } from "@/helpers.js";
import PopoverSelectSlider from "./components/PopoverSelectSlider.vue";

export default {
  components: { Card, PopoverSelectSlider },
  props: { filters: { type: Object, required: true }, search: String },
  data: ({ filters }) => ({
    // needed because of debounce
    defaultFilters: deepCopy(filters),
    localFilters: deepCopy(filters),
    localSearch: "",
    reseting: ""
  }),
  computed: {
    isFiltered: ({ search, filters, defaultFilters }) =>
      search || JSON.stringify(filters) !== JSON.stringify(defaultFilters)
  },
  methods: {
    handleFiltersChange: debounce(function (key, evt) {
      this.$emit("update:filters", { ...this.filters, [key]: evt });
    }, 500),
    handleSearch: debounce(function (search) {
      this.$emit("update:search", search);
    }, 500),
    resetFilters(key) {
      const blankFilters = deepCopy(
        key ? { [key]: this.defaultFilters[key] } : this.defaultFilters
      );

      this.$emit("update:filters", { ...this.filters, ...blankFilters });
      this.$emit("update:search", "");

      Object.assign(this, {
        localFilters: { ...this.localFilters, ...blankFilters },
        localSearch: ""
      });
    },
    getFilterRangeDescription(key) {
      const [, defaultMax] = this.defaultFilters[key];
      const [min, max] = this.filters[key];
      if (!min && max === defaultMax) return null;

      const i18nVariants = {
        processedCount: "CHECKED",
        http3xxCount: "REDIRECTS",
        http4xxCount: "CLIENT_ERRORS",
        http5xxCount: "SERVER_ERRORS"
      };

      return this.$t(`BETWEEN_{MIN}_AND_{MAX}_${i18nVariants[key]}_URLS`, {
        min,
        max: `${max}${max === defaultMax ? "+" : ""}`
      });
    }
  },
  i18n: {
    messages: {
      "en-US": {
        FILTER_BY: "Filter by",
        RESET_FILTERS: "Reset filters",
        CHECKED_URLS_COUNT: "Checked URLs count",
        ENCOUNTERED_ERRORS_COUNT: "Number of errors encountered",
        REDIRECTS_COUNT: "Redirections count",
        CLIENT_ERRORS_COUNT: "Client errors count",
        SERVER_ERRORS_COUNT: "Server errors count",
        "CLIENT_ERRORS_(4xx)": "Client errors (4xx)",
        "SERVER_ERRORS_(5xx)": "Server errors (5xx)",
        "BETWEEN_{MIN}_AND_{MAX}_CHECKED_URLS":
          "Between <b>{min}</b> and <b>{max}</b> checked URLs",
        "BETWEEN_{MIN}_AND_{MAX}_CLIENT_ERRORS_URLS":
          "Between <b>{min}</b> and <b>{max}</b> client errors URLs",
        "BETWEEN_{MIN}_AND_{MAX}_SERVER_ERRORS_URLS":
          "Between <b>{min}</b> and <b>{max}</b> server errors URLs",
        "BETWEEN_{MIN}_AND_{MAX}_REDIRECTS_URLS":
          "Between <b>{min}</b> and <b>{max}</b> redirects URLs",
        SEARCH_BY_SITEMAP_URL: "Search by sitemap URL"
      },
      "fr-FR": {
        FILTER_BY: "Filtrer par",
        RESET_FILTERS: "Réinitialiser les filtres",
        CHECKED_URLS_COUNT: "Nombre d'URLs vérifiées",
        ENCOUNTERED_ERRORS_COUNT: "Nombre d'erreurs rencontrées",
        REDIRECTS_COUNT: "Nombre de redirections",
        CLIENT_ERRORS_COUNT: "Nombre d'erreurs client",
        SERVER_ERRORS_COUNT: "Nombre d'erreurs serveur",
        "CLIENT_ERRORS_(4xx)": "Erreurs client (4xx)",
        "SERVER_ERRORS_(5xx)": "Erreurs serveur (5xx)",
        "BETWEEN_{MIN}_AND_{MAX}_CHECKED_URLS":
          "Entre <b>{min}</b> et <b>{max}</b> URLs vérifiées",
        "BETWEEN_{MIN}_AND_{MAX}_CLIENT_ERRORS_URLS":
          "Entre <b>{min}</b> et <b>{max}</b> URLs en erreurs client",
        "BETWEEN_{MIN}_AND_{MAX}_SERVER_ERRORS_URLS":
          "Entre <b>{min}</b> et <b>{max}</b> URLs en erreurs serveur",
        "BETWEEN_{MIN}_AND_{MAX}_REDIRECTS_URLS":
          "Entre <b>{min}</b> et <b>{max}</b> URLs redirigées",
        SEARCH_BY_SITEMAP_URL: "Rechercher par URL de sitemap"
      }
    }
  }
};
</script>
