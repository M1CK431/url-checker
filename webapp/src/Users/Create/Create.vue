<template>
  <div class="mb-10 flex items-center gap-4 text-slate-700">
    <NButton
      type="primary"
      size="tiny"
      @click="$router.push({ name: 'users' })"
    >
      <RiArrowLeftSLine />
    </NButton>

    <h2 class="font-semibold text-base">
      {{ $t("USERS") }} / {{ $t("NEW_USER") }}
    </h2>
  </div>

  <div class="flex gap-10">
    <Card class="w-1/2">
      <NForm @submit.prevent :disabled="creating" class="space-y-2">
        <IdentifierFormItem
          v-model="identifier"
          @update:isValid="isIdentifierValid = $event"
        />

        <PasswordFormItems
          v-model="password"
          @update:isValid="isPasswordValid = $event"
        />

        <NCheckbox v-model:checked="enabled" class="flex">
          {{ $t("ENABLED") }}
        </NCheckbox>

        <NButton
          attrType="submit"
          type="primary"
          :disabled="cantCreate"
          :loading="creating"
          @click="create"
          class="block! mt-8!"
        >
          {{ $t("CREATE") }}
        </NButton>
      </NForm>
    </Card>

    <Illustration class="m-auto max-h-52 opacity-85 drop-shadow-xl" />
  </div>
</template>

<script>
import gql from "graphql-tag";
import { Card } from "@/components";
import IdentifierFormItem from "../components/IdentifierFormItem.vue";
import PasswordFormItems from "../components/PasswordFormItems.vue";
import Illustration from "./components/Illustration.vue";
import { success, requestErrorHandler } from "@/helpers.js";

export default {
  components: { Card, IdentifierFormItem, PasswordFormItems, Illustration },
  data: () => ({
    identifier: "",
    password: null,
    enabled: true,
    creating: false,
    isIdentifierValid: false,
    isPasswordValid: false
  }),
  computed: { cantCreate: vm => !vm.isIdentifierValid || !vm.isPasswordValid },
  methods: {
    create() {
      this.creating = true;
      const { $t, $apollo, $router, identifier, password, enabled } = this;

      $apollo
        .mutate({
          mutation: gql`
            mutation (
              $identifier: ID!
              $password: String!
              $enabled: Boolean!
            ) {
              upsertUser(
                user: {
                  identifier: $identifier
                  password: $password
                  enabled: $enabled
                }
              ) {
                id
                identifier
              }
            }
          `,
          variables: { identifier, password, enabled },
          update: (_cache, { data }) =>
            this.$subscribe.handleMutation(
              { operation: "CREATE", evictCache: { fieldName: "users" } },
              [data.upsertUser]
            )
        })
        .then(
          ({
            data: {
              upsertUser: { id, identifier }
            }
          }) => {
            success({
              content: $t("USER_{identifier}_CREATED", { identifier })
            });
            $router.push({ name: "user", params: { id } });
          }
        )
        .catch(requestErrorHandler)
        .finally(() => (this.creating = false));
    }
  },
  i18n: {
    "en-US": {
      NEW_USER: "New user",
      ENABLED: "Enabled",
      CREATE: "Create",
      "USER_{identifier}_CREATED": "User {identifier} created"
    },
    "fr-FR": {
      NEW_USER: "Nouvel utilisateur",
      ENABLED: "Actif",
      CREATE: "Créer",
      "USER_{identifier}_CREATED": "Utilisateur {identifier} créé"
    }
  }
};
</script>
