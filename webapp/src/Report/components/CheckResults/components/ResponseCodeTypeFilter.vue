<template>
  <div class="flex flex-nowrap gap-4 justify-between mb-4">
    <div
      class="item"
      :class="modelValue ? 'inactive' : 'bg-white'"
      @click="$emit('update:modelValue', null)"
    >
      <span class="font-semibold text-base">{{ $t("ALL") }}</span>
      <div class="px-1.5 rounded bg-slate-700/20">
        {{ report.processedCount }}
      </div>
    </div>

    <div
      v-for="({ label, color }, key) in responseCodeTypes"
      :key="key"
      class="item"
      :class="
        modelValue?.start === getResponseCodeRange(key).start
          ? 'bg-white'
          : report[`http${key}xxCount`]
            ? 'inactive'
            : 'disabled'
      "
      @click="
        report[`http${key}xxCount`] &&
          $emit('update:modelValue', getResponseCodeRange(key))
      "
    >
      <div
        class="rounded-full h-3.5 w-3.5 shrink-0"
        :style="{ background: color }"
      />
      <span class="font-semibold text-base">{{ label }}</span>
      <div class="px-1.5 rounded bg-slate-700/20">
        {{ report[`http${key}xxCount`] }}
      </div>
    </div>
  </div>
</template>

<script>
import responseCodeTypes from "@/responseCodeTypes.const.js";
import gql from "graphql-tag";

const getResponseCodeRange = responseCodeType => ({
  start: +`${responseCodeType}00`,
  end: +`${responseCodeType}99`
});

export default {
  props: { modelValue: Object, reportId: { type: String, required: true } },
  setup: () => ({ responseCodeTypes, getResponseCodeRange }),
  data: () => ({ report: {} }),
  apollo: {
    report: {
      query: gql`
        query ($id: ID!) {
          report(id: $id) {
            id
            processedCount
            http1xxCount
            http2xxCount
            http3xxCount
            http4xxCount
            http5xxCount
          }
        }
      `,
      variables() {
        return { id: this.reportId };
      }
    }
  },
  i18n: { messages: { "en-US": { ALL: "All" }, "fr-FR": { ALL: "Tous" } } }
};
</script>

<style>
.item {
  @apply w-60 flex items-center justify-center gap-2 p-2 cursor-default;
  @apply rounded-lg ring-1 ring-white/50 backdrop-blur-2xl;
}

.inactive {
  @apply cursor-pointer hover:bg-white transition-colors;
  @apply bg-gradient-to-r from-white/80 to-white/40;
}

.disabled {
  @apply cursor-not-allowed bg-gradient-to-r from-white/40 to-white/10;
}
</style>
