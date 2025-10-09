<template>
  <slot v-bind="{ deleteUsers: ids => ($data.ids = ids) }" />

  <ConfirmModal
    :show="!!ids.length"
    @update:show="ids = []"
    :positiveButtonProps="{ loading: deleting }"
    @positiveClick="deleteUsers"
  />
</template>

<script>
import { ConfirmModal } from "@/components";
import { success, error, requestErrorHandler } from "@/helpers";
import gql from "graphql-tag";

export default {
  components: { ConfirmModal },
  props: { to: [String, Object] },
  emits: ["deleted"],
  data: () => ({ ids: [], deleting: false }),
  methods: {
    deleteUsers() {
      const { $apollo, ids, to, $router } = this;
      this.deleting = true;

      $apollo
        .mutate({
          mutation: gql`
            mutation ($ids: [ID!]!) {
              deleteUsers(ids: $ids) {
                ok
                message
              }
            }
          `,
          variables: { ids },
          update: () =>
            this.$subscribe.handleMutation(
              { operation: "DELETE" },
              ids.map(id => ({ __typename: "User", id }))
            )
        })
        .then(({ data: { deleteUsers: { ok, message } } = {} }) => {
          if (!ok) return error({ content: message });

          success({
            content: this.$t("{n}_USERS_DELETED", ids.length)
          });
          this.$emit("deleted", ids);
          this.ids = [];
          to && $router.push(to);
        })
        .catch(requestErrorHandler)
        .finally(() => (this.deleting = false));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        "{n}_USERS_DELETED": "1 user deleted | {n} users deleted"
      },
      "fr-FR": {
        "{n}_USERS_DELETED":
          "1 utilisateur supprimé | {n} utilisateurs supprimés"
      }
    }
  }
};
</script>
