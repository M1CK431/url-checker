<template>
  <div class="h-0 w-full text-center relative">
    <div
      class="h-10 px-3 bg-white/80 text-slate-700 rounded-md inline-flex items-center gap-2.5 shadow-xl -translate-y-8 opacity-0 transition-opacity duration-300"
      :class="{ 'opacity-100': modelValue.length }"
    >
      <div
        class="p-1 cursor-pointer hover:text-slate-900 transition-colors"
        @click="$emit('update:modelValue', [])"
      >
        <RiCloseLine class="text-lg" />
      </div>

      <div class="pr-2.5 border-r border-slate-400">
        {{ $tc("{N}_SELECTED", modelValue.length) }}
      </div>

      <NButton
        circle
        type="primary"
        size="tiny"
        @click="$emit('bulkDelete', modelValue)"
      >
        <template #icon><RiDeleteBin7Fill /></template>
      </NButton>
    </div>
  </div>
</template>

<script>
export default {
  props: { modelValue: { type: Array, required: true } },
  i18n: {
    messages: {
      "en-US": { "{N}_SELECTED": "{n} selected" },
      "fr-FR": {
        "{N}_SELECTED": "0 sélectionné | 1 sélectionné | {n} sélectionnés"
      }
    }
  }
};
</script>
