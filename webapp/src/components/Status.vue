<template>
  <NTooltip :disabled="!errorReason" class="max-w-sm">
    <template #trigger>
      <div
        class="inline-block px-1.5 rounded-2xl text-xs text-slate-50 select-none"
        :class="statuses[status]?.class"
      >
        {{ statuses[status]?.label }}
      </div>
    </template>

    <pre class="text-sm whitespace-pre-wrap">{{ errorReason }}</pre>
  </NTooltip>
</template>

<script>
export default {
  props: { status: { type: String, required: true }, errorReason: String },
  computed: {
    statuses: ({ $i18n }) => ({
      PROCESSING: { label: $i18n.t("PROCESSING"), class: "bg-blue-700" },
      ERROR: { label: $i18n.t("ERROR"), class: "bg-red-600" },
      DONE: { label: $i18n.t("DONE"), class: "bg-green-600" }
    })
  },
  i18n: {
    messages: {
      "en-US": { PROCESSING: "Processing", ERROR: "Error", DONE: "Done" },
      "fr-FR": { PROCESSING: "En cours", ERROR: "Erreur", DONE: "Terminé" }
    }
  }
};
</script>
