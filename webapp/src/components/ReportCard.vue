<template>
  <Card
    size="sm"
    @click="
      $router.push({
        name: 'report',
        params: { ...(website && { host: website.host }), reportId: id }
      })
    "
    class="w-[21.5rem] cursor-pointer hover:shadow-2xl hover:bg-white/50 transition-colors"
  >
    <div
      v-if="website"
      class="flex items-center gap-1 pb-3 border-b border-slate-400 mb-4"
    >
      <img :src="website.faviconUrl" alt="favicon" class="h-4 w-4 mr-2" />
      <NEllipsis class="grow">{{ website.host }}</NEllipsis>
    </div>

    <div class="text-slate-700 text-xs font-semibold mb-2">
      <NCheckbox
        v-if="$props['onUpdate:checked']"
        @click.stop
        :checked="checked"
        @update:checked="$props['onUpdate:checked']"
      >
        {{ localeCreatedAt }}
      </NCheckbox>
      <div v-else class="text-center">{{ localeCreatedAt }}</div>
    </div>

    <div
      v-if="status === 'PROCESSING'"
      class="h-36 flex items-center justify-center"
    >
      <NProgress
        type="circle"
        class="scale-[1.125]"
        :percentage="Math.round((processedCount / totalCount) * 100)"
      />
    </div>

    <div v-else class="relative h-36">
      <div class="absolute inset-0 z-10" />
      <ReportPieChart v-bind="{ ...$attrs, class: 'transform scale-95' }" />
    </div>

    <div class="flex justify-around text-xs text-slate-700 mt-2">
      <div class="text-center">
        <div class="font-semibold mb-1">{{ $t("VERIFIED_URL") }}</div>
        <span class="text-slate-500">{{ processedCount }}</span>
      </div>

      <div class="text-center">
        <div class="font-semibold mb-1">{{ $t("STATUS") }}</div>
        <Status :status="status" :error-reason="errorReason" />
      </div>
    </div>
  </Card>
</template>

<script>
import Card from "./Card.vue";
import ReportPieChart from "./ReportPieChart.vue";
import Status from "./Status.vue";

export default {
  components: { Card, ReportPieChart, Status },
  props: {
    id: { type: String, required: true },
    createdAt: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    processedCount: { type: Number, required: true },
    status: { type: String, required: true },
    errorReason: String,
    website: Object,
    checked: Boolean,
    // eslint-disable-next-line vue/prop-name-casing, vue/no-unused-properties
    "onUpdate:checked": Function
  },
  computed: {
    localeCreatedAt: ({ createdAt }) =>
      new Date(createdAt).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short"
      })
  },
  i18n: {
    messages: {
      "en-US": { VERIFIED_URL: "Verified URL" },
      "fr-FR": { VERIFIED_URL: "URL vérifiées" }
    }
  }
};
</script>
