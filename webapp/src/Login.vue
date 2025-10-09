<template>
  <div
    v-if="!$auth.token || $auth.loading"
    class="h-screen w-screen flex bg-white dark:bg-slate-900"
  >
    <div class="fixed top-8 right-8 z-10">
      <NDropdown
        showArrow
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

    <div
      class="h-full flex items-center justify-center transition-[width] duration-[400ms]"
      :class="$auth.loading ? 'w-full' : 'w-1/2 xl:w-3/5 2xl:w-2/3'"
    >
      <div>
        <h1 class="text-6xl tracking-wider leading-normal mb-10">
          URL Checker
        </h1>
        <img
          src="/url-checker.png"
          alt="URL Checker logo"
          class="h-72 m-auto rounded-lg"
        />

        <div v-if="$auth.loading" class="mt-12 text-center space-y-6">
          <NSpin size="large" />
          <div class="uppercase">{{ $t("LOADING") }}</div>
        </div>
      </div>
    </div>

    <div
      class="relative h-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center transition-[width] duration-[400ms] overflow-hidden"
      :class="$auth.loading ? 'w-0' : 'w-1/2 xl:2/5 2xl:w-1/3'"
    >
      <form @submit.prevent class="grow flex flex-col p-10">
        <h2 class="text-3xl mb-8">{{ $t("CONNEXION") }}</h2>

        <NFormItem :label="$t('IDENTIFIER')">
          <NInput
            v-model:value="identifier"
            placeholder="Mulder"
            :disabled="loading"
            required
            clearable
          />
        </NFormItem>

        <NFormItem :label="$t('PASSWORD')">
          <NInput
            v-model:value="password"
            type="password"
            showPasswordOn="click"
            placeholder="••••••••"
            :disabled="loading"
            required
            clearable
          />
        </NFormItem>

        <NButton
          attrType="submit"
          type="primary"
          :disabled="!identifier || !password"
          :loading="loading"
          @click="login(identifier, password)"
          class="self-start mt-2"
        >
          {{ $t("CONNEXION") }}
        </NButton>
      </form>
    </div>
  </div>

  <slot v-else />
</template>

<script>
import { login } from "@/plugins/auth.js";
import { setLocale } from "@/plugins/i18n.js";
import { error } from "@/helpers.js";

export default {
  setup: () => ({ setLocale }),
  data: () => ({ identifier: "", password: "", loading: false }),
  computed: {
    browserLocale: ({ $i18n }) =>
      ($i18n.availableLocales.includes(navigator.language)
        ? navigator.language
        : "en-US"
      )
        .slice(0, 2)
        .toUpperCase()
  },
  methods: {
    login() {
      this.loading = true;
      login(this.identifier, this.password)
        .catch(() => error({ content: this.$t("BAD_IDENTIFIER_OR_PASSWORD") }))
        .finally(() => (this.loading = false));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        LOADING: "Loading",
        CONNEXION: "Connexion",
        BAD_IDENTIFIER_OR_PASSWORD: "Bad identifier or password"
      },
      "fr-FR": {
        LOADING: "Chargement",
        CONNEXION: "Connexion",
        BAD_IDENTIFIER_OR_PASSWORD: "Identifiant ou mot de passe incorrect"
      }
    }
  }
};
</script>
