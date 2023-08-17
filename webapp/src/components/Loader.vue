<template>
  <div v-if="loading" class="h-full flex items-center justify-center">
    <NSpin size="large" />
  </div>

  <Error v-else v-bind="$attrs">
    <slot />
  </Error>
</template>

<script>
import Error from "./Error.vue";

export default {
  components: { Error },
  inheritAttrs: false,
  props: { loading: Boolean }
};
</script>
