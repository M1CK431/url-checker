<template>
  <Loader :loading="$apollo.loading">
    <div class="flex items-center justify-between mb-10">
      <div class="flex items-center gap-4 text-slate-700">
        <NButton
          type="primary"
          size="tiny"
          @click="$router.push({ name: 'users' })"
        >
          <RiArrowLeftSLine />
        </NButton>

        <h2 class="font-semibold text-base">
          {{ $t("USERS") }} / {{ identifier }}
        </h2>
      </div>

      <div>
        <DeleteUsers :to="{ name: 'users' }" v-slot="{ deleteUsers }">
          <NTooltip
            arrowPointToCenter
            :disabled="identifier !== $auth.user.identifier"
          >
            <template #trigger>
              <NButton
                type="primary"
                circle
                :disabled="identifier === $auth.user.identifier"
                @click="deleteUsers([id])"
              >
                <RiDeleteBin7Fill />
              </NButton>
            </template>

            {{ $t("SUICIDAL_IDEATION_REPORTED_TO_IT_SUPPORT_COFFEE_INCOMING") }}
          </NTooltip>
        </DeleteUsers>
      </div>
    </div>

    <div
      v-show="!user.enabled"
      class="font-semibold text-orange-500 bg-orange-100/90 px-4 py-3 rounded-lg mb-10 -mt-2 flex justify-between"
    >
      <div class="flex items-center gap-2">
        <RiAlertFill class="text-lg" />
        {{ $t("THIS_ACCOUNT_IS_DISABLED") }}
      </div>

      <NButton type="warning" text @click="update({ enabled: true })">
        <span class="text-orange-500 font-semibold text-xs uppercase">
          {{ $t("ENABLE") }}
        </span>
      </NButton>
    </div>

    <div class="flex gap-10">
      <Card class="w-1/2">
        <NForm :disabled="updating" class="space-y-2">
          <IdentifierFormItem
            v-model="user.identifier"
            :identifier
            @update:isValid="isIdentifierValid = $event"
          />

          <PasswordFormItems
            ref="passwordFormItems"
            v-model="password"
            @update:isValid="isPasswordValid = $event"
          />

          <div class="mt-6! flex gap-2">
            <NButton
              attrType="submit"
              type="primary"
              :disabled="cantUpdate"
              :loading="updating"
              @click="update()"
            >
              {{ $t("UPDATE") }}
            </NButton>

            <NButton
              v-if="identifier !== $auth.user.identifier"
              :type="user.enabled ? 'warning' : 'success'"
              :loading="togglingEnable"
              @click="update({ enabled: !user.enabled })"
            >
              {{ $t(user.enabled ? "DISABLE" : "ENABLE") }}
            </NButton>
          </div>
        </NForm>
      </Card>

      <div class="w-1/2">
        <Card class="space-y-10">
          <div
            v-for="[key, labelKey] in [
              ['createdAt', 'CREATED_AT'],
              ['lastLogin', 'LAST_LOGIN']
            ]"
            :key
            class="space-y-4"
          >
            <div>{{ $t(labelKey) }}</div>
            <div class="font-semibold">
              {{ user[key] ? $d(user[key]) : "-" }}
            </div>
          </div>
        </Card>
      </div>
    </div>
  </Loader>
</template>

<script>
import { Loader, Card } from "@/components";
import DeleteUsers from "../components/DeleteUsers.vue";
import IdentifierFormItem from "../components/IdentifierFormItem.vue";
import PasswordFormItems from "../components/PasswordFormItems.vue";
import { success, info, requestErrorHandler, noTypename } from "@/helpers.js";
import { userQuery, upsertUserMutation, userSubscription } from "./user.gql";

export default {
  components: {
    Loader,
    Card,
    DeleteUsers,
    IdentifierFormItem,
    PasswordFormItems
  },
  props: { id: { type: [String, Number], required: true } },
  data: () => ({
    identifier: "",
    user: {},
    password: "",
    updating: false,
    togglingEnable: false,
    isIdentifierValid: false,
    isPasswordValid: false
  }),
  apollo: {
    user: {
      query: userQuery,
      variables() {
        return this.$props;
      },
      update({ user }) {
        this.identifier = user.identifier;
        return noTypename(user);
      }
    }
  },
  computed: {
    cantUpdate: vm => !vm.isIdentifierValid && !vm.isPasswordValid
  },
  mounted() {
    this.$subscribe.add(
      { key: "user", clearOnDelete: true },
      { query: userSubscription, variables: this.$props },
      ({ data: { user } }) => {
        const { operation, data: { identifier } = {} } = user;
        const { name, params } = this.$route;
        const isMounted = name === "user" && this.id === params.id;
        if (operation !== "DELETE" || !isMounted) return;

        info({
          title: this.$t("REDIRECTION"),
          content: this.$t("USER_{identifier}_DELETED", { identifier })
        });
        return this.$router.push({ name: "users" });
      }
    );
  },
  methods: {
    update(user) {
      this[user ? "togglingEnable" : "updating"] = true;
      const { $t, $apollo, $router, id, password } = this;

      $apollo
        .mutate({
          mutation: upsertUserMutation,
          variables: {
            id,
            user: user ?? {
              identifier: this.user.identifier,
              ...(password && { password })
            }
          }
        })
        .then(
          ({ data: { upsertUser, upsertUser: { id, identifier } = {} } }) => {
            this.identifier = identifier;
            Object.assign(this.user, upsertUser);
            this.$refs.passwordFormItems.reset();

            success({
              content: $t(
                user
                  ? `USER_{identifier}_${user.enabled ? "ENABLED" : "DISABLED"}`
                  : "USER_{identifier}_UPDATED",
                { identifier }
              )
            });
            $router.push({ name: "user", params: { id } });
          }
        )
        .catch(requestErrorHandler)
        .finally(() => (this[user ? "togglingEnable" : "updating"] = false));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        THIS_ACCOUNT_IS_DISABLED: "This account is disabled",
        UPDATE: "Update",
        ENABLE: "Enable",
        DISABLE: "Disable",
        "USER_{identifier}_UPDATED": 'User "{identifier}" updated',
        "USER_{identifier}_ENABLED": 'User "{identifier}" enabled',
        "USER_{identifier}_DISABLED": 'User "{identifier}" disabled',
        "USER_{identifier}_DELETED": 'User "{identifier}" deleted'
      },
      "fr-FR": {
        THIS_ACCOUNT_IS_DISABLED: "Ce compte est désactivé",
        UPDATE: "Mettre à jour",
        ENABLE: "Activer",
        DISABLE: "Désactiver",
        "USER_{identifier}_UPDATED": 'Utilisateur "{identifier}" mis à jour',
        "USER_{identifier}_ENABLED": 'Utilisateur "{identifier}" activé',
        "USER_{identifier}_DISABLED": 'Utilisateur "{identifier}" désactivé',
        "USER_{identifier}_DELETED": 'Utilisateur "{identifier}" supprimé'
      }
    }
  }
};
</script>
