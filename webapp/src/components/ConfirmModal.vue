<template>
  <NConfigProvider :themeOverrides="{ Dialog: { color: 'none' } }">
    <NModal
      v-bind="$attrs"
      preset="dialog"
      :showIcon="false"
      :closable="false"
      :positiveText="$t('CONFIRM')"
      :negativeButtonProps="{ text: true, class: 'mr-8!' }"
      :negativeText="$t('CANCEL')"
      class="w-96! rounded-xl bg-linear-to-br! from-white/90 to-white/70"
    >
      <div class="font-semibold mb-6">
        {{ $t("THIS_ACTION_CANNOT_BE_CANCELED") }}
        <br />
        {{ $t("ARE_YOU_SURE") }}
      </div>
    </NModal>
  </NConfigProvider>
</template>

<script>
export default {
  inheritAttrs: false,
  i18n: {
    "en-US": {
      THIS_ACTION_CANNOT_BE_CANCELED: "This action cannot be canceled.",
      ARE_YOU_SURE: "Are you sure?",
      CONFIRM: "Confirm",
      CANCEL: "Cancel"
    },
    "fr-FR": {
      THIS_ACTION_CANNOT_BE_CANCELED: "Cette action ne pourra être annulée.",
      ARE_YOU_SURE: "Êtes-vous sûr ?",
      CONFIRM: "Confirmer",
      CANCEL: "Annuler"
    }
  }
};
</script>
