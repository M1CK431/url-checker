<template>
  <div v-if="responseCode" class="flex items-center gap-1">
    <div
      class="inline-block h-3 w-3 rounded-full mr-0.5"
      :style="{ background: responseCode.color }"
    />
    {{ code }}
  </div>

  <template v-else>-</template>
</template>

<script>
import RESPONSE_CODE_TYPES from "@/responseCodeTypes.const.js";

export default {
  props: { code: { type: Number, required: true } },
  setup: () => ({ RESPONSE_CODE_TYPES }),
  computed: { responseCode: ({ code }) => RESPONSE_CODE_TYPES[`${code}`[0]] }
};
</script>
