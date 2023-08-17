<template>
  <NConfigProvider
    abstract
    :locale="$i18n.locale === 'fr-FR' ? frFR : enUS"
    :date-locale="$i18n.locale === 'fr-FR' ? dateFrFR : dateEnUS"
    :theme-overrides="theme"
  >
    <div id="layout" class="h-screen w-screen relative">
      <header>
        <div class="flex items-center">
          <img src="/url-checker.png" alt="logo" class="h-10 mr-3" />
          <h1 class="text-2xl font-semibold text-slate-700 select-none">
            URL Checker
          </h1>
        </div>

        <div class="flex gap-10">
          <div class="switch">
            <RouterLink
              :to="{ name: 'home' }"
              :class="{ 'text-white': $route.name === 'home' }"
            >
              {{ $t("HOME") }}
            </RouterLink>
            <RouterLink
              :to="{ name: 'sites' }"
              :class="{ 'text-white': $route.name !== 'home' }"
            >
              {{ $t("REPORT") }}
            </RouterLink>

            <div class="absolute inset-1 rounded-[0.625rem] overflow-hidden">
              <div
                class="absolute h-full w-1/2 bg-slate-700 left-0 transition-transform duration-300"
                :class="{ 'translate-x-full': $route.name !== 'home' }"
              />
            </div>
          </div>

          <NDropdown
            show-arrow
            :options="[
              {
                label: `Auto (${browserLocale})`,
                key: null
              },
              { label: '🇺🇸 &nbsp; English', key: 'en-US' },
              { label: '🇫🇷 &nbsp; Français', key: 'fr-FR' }
            ]"
            @select="setLocale"
          >
            <span
              class="pt-0.5 cursor-pointer text-slate-700 font-semibold uppercase"
            >
              {{ $i18n.locale.slice(0, 2) }}
              <span class="text-xl align-text-bottom">&#8964;</span>
            </span>
          </NDropdown>
        </div>
      </header>

      <main
        class="h-full overflow-auto p-10 pt-[6.5rem]"
        v-scroll="() => ctx.onScroll && ctx.onScroll()"
      >
        <RouterView />
      </main>
    </div>
  </NConfigProvider>
</template>

<script>
import { slate } from "tailwindcss/colors";
import { enUS, dateEnUS, frFR, dateFrFR } from "naive-ui";
import { setLocale } from "@/plugins/i18n.js";

const theme = {
  common: {
    primaryColor: slate[700],
    primaryColorHover: slate[600],
    primaryColorPressed: slate[800],
    primaryColorSuppl: slate[600],
    heightSmall: "32px",
    heightMedium: "40px",
    borderRadius: "6px",
    heightLarge: "48px"
  },
  Button: { fontWeight: "600" },
  Tabs: {
    tabFontWeight: "600",
    tabFontWeightActive: "600",
    tabTextColorActiveBar: slate[700],
    tabTextColorHoverBar: slate[700],
    tabTextColorBar: slate[700]
  },
  Pagination: {
    // [<] and [>] btns
    buttonColor: "rgba(255, 255, 255, 40%)",
    buttonColorHover: "white",
    buttonBorder: "none",
    buttonBorderHover: "none",
    buttonBorderPressed: "none",
    itemColorDisabled: "rgba(255, 255, 255, 60%)",
    itemBorderDisabled: "none",

    // [1][2][3][...] btns
    itemBorderRadius: "6px",
    itemBorder: "none",
    itemBorderHover: "none",
    itemBorderPressed: "none",
    itemColor: "rgba(255, 255, 255, 40%)",
    itemColorHover: "white",
    itemBorderActive: "1px solid white",
    itemColorActive: "white",
    itemColorActiveHover: "white"
  }
};

export const ctx = reactive({ onScroll: null });

export default {
  name: "Main",
  setup: () => ({ ctx, enUS, dateEnUS, frFR, dateFrFR, theme, setLocale }),
  computed: {
    browserLocale: ({ $i18n }) =>
      ($i18n.availableLocales.includes(navigator.language)
        ? navigator.language
        : "en-US"
      )
        .slice(0, 2)
        .toUpperCase()
  }
};
</script>

<style scoped>
#layout {
  background: linear-gradient(
    145deg,
    rgba(3, 105, 161, 0.6) 25.84%,
    rgba(77, 124, 15, 0.6) 100%
  );
}

header {
  @apply h-14 absolute top-5 inset-x-5 z-10 rounded-xl shadow-xl;
  @apply px-5 flex items-center justify-between ring-1 ring-white/50;
  @apply bg-gradient-to-b from-white/60 to-white/20 backdrop-blur-2xl;
}

.switch {
  @apply relative inline-flex h-10 bg-white/80 rounded-xl;
  @apply text-slate-700 font-semibold;
}
.switch > a {
  @apply w-32 h-full flex items-center justify-center z-10;
  @apply no-underline transition-colors duration-300;
}
</style>
