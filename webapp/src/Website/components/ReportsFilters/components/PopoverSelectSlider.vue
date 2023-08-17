<template>
  <NPopover
    :show="show"
    @clickoutside="show = false"
    placement="bottom"
    width="trigger"
  >
    <template #trigger>
      <NSelect
        v-bind="selectProps"
        :value="description ? 1 : null"
        :options="[{ label: description, value: 1 }]"
        :render-label="renderLabel"
        :show="false"
        clearable
        @focus="show = true"
      />
    </template>

    <slot>
      <NSlider
        v-bind="$attrs"
        range
        :step="10"
        :max="max"
        :marks="{ 0: '0', [max]: `${max}+` }"
      />

      <div v-html="description" class="text-center" />
      <div v-show="!description" class="text-slate-500 text-center">
        {{ $t("ALL_URLS") }}
      </div>
    </slot>
  </NPopover>
</template>

<script>
const renderLabel = ({ label }) => h("span", { innerHTML: label });

export default {
  inheritAttrs: false,
  props: {
    selectProps: Object,
    description: String,
    max: { type: Number, default: 1000 }
  },
  setup: () => ({ renderLabel }),
  data: () => ({ show: false }),
  i18n: {
    messages: {
      "en-US": { ALL_URLS: "All URLs" },
      "fr-FR": { ALL_URLS: "Toutes les URLs" }
    }
  }
};
</script>
