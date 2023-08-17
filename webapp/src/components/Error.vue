<template>
  <div v-if="error" class="rounded-xl border-l-4 border-red-700 p-3 bg-white">
    <div class="text-base font-semibold mb-3">
      {{ $t("OUPS_SOMETHING_GOES_WRONG") }}
    </div>
    <pre class="text-sm text-slate-600">{{ error }}</pre>
  </div>

  <component v-else-if="as" :is="as" v-bind="$attrs">
    <slot />
  </component>

  <slot v-else />
</template>

<script>
export default {
  inheritAttrs: false,
  props: { error: [Error, String], as: [String, Object, Function] },
  i18n: {
    messages: {
      "en-US": { OUPS_SOMETHING_GOES_WRONG: "Oups! Someting goes wrong..." },
      "fr-FR": {
        OUPS_SOMETHING_GOES_WRONG: "Oups! Quelque chose s'est mal passé..."
      }
    }
  }
};
</script>
