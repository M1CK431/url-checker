<template>
  <div class="card" :class="size">
    <slot />
  </div>
</template>

<script>
export default {
  props: {
    size: {
      type: String,
      default: "xl",
      validator: size => ["xl", "lg", "md", "sm"].includes(size)
    }
  }
};
</script>

<style>
.card {
  @apply rounded-xl shadow-xl bg-gradient-to-br;
  @apply p-4 ring-1 ring-white/50 backdrop-blur-2xl;
}

.xl {
  @apply from-white/60 to-white/20;
}

.lg {
  @apply from-white/70 to-white/20;
}

.md {
  @apply from-white/70 to-white/10;
}

.sm {
  @apply from-white/80 to-white/10;
}
</style>
