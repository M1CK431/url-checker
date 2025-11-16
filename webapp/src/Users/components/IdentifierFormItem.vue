<template>
  <NFormItem
    :label="$t('IDENTIFIER')"
    required
    v-bind="
      modelValue &&
      (!identifier || modelValue !== identifier) && {
        validationStatus: availabilityCheckResult.isValid ? 'success' : 'error',
        ...(availabilityCheckResult.isValid || {
          feedback: availabilityCheckResult.message
        })
      }
    "
  >
    <NInput
      :value="modelValue"
      @update:value="handleIdentifierChange"
      placeholder="Mulder"
      clearable
    />
  </NFormItem>
</template>

<script>
import gql from "graphql-tag";
import { error } from "@/helpers.js";

export default {
  props: {
    modelValue: { type: [String, null], required: true },
    identifier: String
  },
  data: () => ({
    usersIdentifiers: null,
    availabilityCheckResult: { isValid: false }
  }),
  apollo: {
    _users: {
      query: gql`
        query {
          users {
            entries {
              id
              identifier
            }
          }
        }
      `,
      update({ users: { entries } }) {
        this.usersIdentifiers = entries.map(u => u.identifier);
        // $nextTick allow props update (from subscription) before checkValidity
        this.$nextTick(() => this.checkValidity(this.modelValue));
      },
      error() {
        error({
          content: this.$t("UNABLE_TO_RETRIEVE_UNAVAILABLE_IDENTIFIERS")
        });
      }
    }
  },
  methods: {
    validateAvailability(identifier) {
      const { $apollo, usersIdentifiers } = this;

      if (!identifier || $apollo.loading) return { isValid: false };
      if (!usersIdentifiers) return { isValid: true };

      const isValid = !usersIdentifiers.includes(identifier);
      return {
        isValid,
        ...(isValid || { message: this.$t("IDENTIFIER_NOT_AVAILABLE") })
      };
    },
    checkValidity(identifier) {
      this.availabilityCheckResult = this.validateAvailability(identifier);
      this.$emit("update:isValid", this.availabilityCheckResult.isValid);
    },
    handleIdentifierChange(identifier) {
      this.$emit("update:modelValue", identifier);
      this.checkValidity(identifier);
    }
  },
  i18n: {
    messages: {
      "en-US": {
        UNABLE_TO_RETRIEVE_UNAVAILABLE_IDENTIFIERS:
          "Unable to retrieve unavailable identifiers",
        IDENTIFIER_NOT_AVAILABLE: "Identifier not available"
      },
      "fr-FR": {
        UNABLE_TO_RETRIEVE_UNAVAILABLE_IDENTIFIERS:
          "Impossible de récupérer les identifiants indisponibles",
        IDENTIFIER_NOT_AVAILABLE: "Identifiant non disponible"
      }
    }
  }
};
</script>
