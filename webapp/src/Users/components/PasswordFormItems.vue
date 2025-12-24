<template>
  <NFormItem
    :label="$t('PASSWORD')"
    required
    v-bind="
      modelValue && {
        validationStatus: complexityCheckResult.isValid ? 'success' : 'error',
        ...(complexityCheckResult.isValid || {
          feedback: complexityCheckResult.message
        })
      }
    "
  >
    <NInput
      :value="modelValue"
      @update:value="handlePasswordChange"
      placeholder="TrustNo1"
      type="password"
      showPasswordOn="click"
      clearable
    />
  </NFormItem>

  <NFormItem
    :label="$t('CONFIRM')"
    required
    v-bind="
      confirm && {
        validationStatus: modelValue === confirm ? 'success' : 'error',
        ...(modelValue !== confirm && {
          feedback: $t('PASSWORDS_DO_NOT_MATCH')
        })
      }
    "
  >
    <NInput
      v-model:value="confirm"
      @update:value="checkValidity(modelValue)"
      placeholder="TrustNo1"
      type="password"
      showPasswordOn="click"
      clearable
    />
  </NFormItem>
</template>

<script>
import gql from "graphql-tag";
import { noTypename, error } from "@/helpers.js";

// bcrypt with UTF-8 is safe up to 18 caracteres
const MAX_LENGTH = 18;
const getPwdValidators = (passwordPolicy, t) => ({
  length: pwd => {
    if (pwd.length < passwordPolicy.length)
      return t(
        "PASSWORD_MUST_BE_AT_LEAST_{length}_CHARACTERS_LONG",
        passwordPolicy
      );

    if (pwd.length > MAX_LENGTH)
      return t("PASSWORD_MUST_NOT_EXCEED_{MAX_LENGTH}_CHARACTERS", {
        MAX_LENGTH
      });

    return false;
  },
  upper: pwd =>
    !/[A-Z]/.test(pwd) &&
    t("PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_UPPERCASE_LETTER"),
  lower: pwd =>
    !/[a-z]/.test(pwd) &&
    t("PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_LOWERCASE_LETTER"),
  number: pwd =>
    !/\d/.test(pwd) && t("PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_NUMBER"),
  symbol: pwd =>
    !/[!@#$%^&*()_+\-=[${};':"\\|,.<>/?]/.test(pwd) &&
    t("PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_SPECIAL_CHARACTER")
});

export default {
  props: { modelValue: { type: [String, null], required: true } },
  expose: ["reset"],
  data: () => ({
    passwordPolicy: null,
    complexityCheckResult: { isValid: false },
    confirm: null
  }),
  apollo: {
    _passwordPolicy: {
      query: gql`
        query {
          passwordPolicy {
            length
            lower
            number
            symbol
            upper
          }
        }
      `,
      update({ passwordPolicy }) {
        Object.assign(this, {
          passwordPolicy: noTypename(passwordPolicy),
          pwdValidators: getPwdValidators(passwordPolicy, this.$t)
        });
        this.checkValidity(this.modelValue);
      },
      error() {
        error({ content: this.$t("UNABLE_TO_RETRIEVE_PASSWORD_POLICY") });
      }
    }
  },
  methods: {
    validateComplexity(password) {
      const { $apollo, passwordPolicy, pwdValidators } = this;

      if (!password || $apollo.loading) return { isValid: false };
      if (!passwordPolicy) return { isValid: true };

      for (const constraint in passwordPolicy) {
        if (!passwordPolicy[constraint]) continue;

        const message = pwdValidators[constraint](password);
        if (message) return { isValid: false, message };
      }

      return { isValid: true };
    },
    checkValidity(password) {
      this.complexityCheckResult = this.validateComplexity(password);
      this.$emit(
        "update:isValid",
        this.complexityCheckResult.isValid && password === this.confirm
      );
    },
    handlePasswordChange(password) {
      this.$emit("update:modelValue", password);
      this.checkValidity(password);
    },
    reset() {
      this.$emit("update:modelValue", null);
      Object.assign(this, this.$options.data.apply(this));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        CONFIRM: "Confirm",
        "PASSWORD_MUST_BE_AT_LEAST_{length}_CHARACTERS_LONG":
          "Password must be at least {length} characters long",
        "PASSWORD_MUST_NOT_EXCEED_{MAX_LENGTH}_CHARACTERS":
          "Password must not exceed {MAX_LENGTH} characters",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_UPPERCASE_LETTER:
          "Password must contain at least one uppercase letter",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_LOWERCASE_LETTER:
          "Password must contain at least one lowercase letter",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_NUMBER:
          "Password must contain at least one number",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_SPECIAL_CHARACTER:
          "Password must contain at least one special character",
        PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
        UNABLE_TO_RETRIEVE_PASSWORD_POLICY: "Unable to retrieve password policy"
      },
      "fr-FR": {
        CONFIRM: "Confirmer",
        "PASSWORD_MUST_BE_AT_LEAST_{length}_CHARACTERS_LONG":
          "Le mot de passe doit comporter au moins {length} caractères",
        "PASSWORD_MUST_NOT_EXCEED_{MAX_LENGTH}_CHARACTERS":
          "Le mot de passe ne doit pas dépasser {MAX_LENGTH} caractères",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_UPPERCASE_LETTER:
          "Le mot de passe doit contenir au moins une lettre majuscule",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_LOWERCASE_LETTER:
          "Le mot de passe doit contenir au moins une lettre minuscule",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_NUMBER:
          "Le mot de passe doit contenir au moins un chiffre",
        PASSWORD_MUST_CONTAIN_AT_LEAST_ONE_SPECIAL_CHARACTER:
          "Le mot de passe doit contenir au moins un caractère spécial",
        PASSWORDS_DO_NOT_MATCH: "Les mots de passe ne correspondent pas",
        UNABLE_TO_RETRIEVE_PASSWORD_POLICY:
          "Impossible de récupérer la politique de mot de passe"
      }
    }
  }
};
</script>
