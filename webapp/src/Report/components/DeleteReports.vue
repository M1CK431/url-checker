<template>
  <slot v-bind="{ deleteReports: ids => ($data.ids = ids) }" />

  <ConfirmModal
    :show="!!ids.length"
    @update:show="ids = []"
    :positiveButtonProps="{ loading: deleting }"
    @positiveClick="deleteReports"
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
    deleteReports() {
      const { $apollo, ids, to, $router } = this;
      this.deleting = true;

      $apollo
        .mutate({
          mutation: gql`
            mutation ($ids: [ID!]!) {
              deleteReports(ids: $ids) {
                ok
                message
              }
            }
          `,
          variables: { ids }
        })
        .then(({ data: { deleteReports: { ok, message } } = {} }) => {
          if (!ok) return error({ content: message });

          success({ content: this.$t("{n}_REPORT_DELETED", ids.length) });
          this.$emit("deleted", ids);
          this.ids = [];
          to && $router.push(to);
        })
        .catch(requestErrorHandler)
        .finally(() => (this.deleting = false));
    }
  },
  i18n: {
    "en-US": { "{n}_REPORT_DELETED": "1 report deleted | {n} reports deleted" },
    "fr-FR": {
      "{n}_REPORT_DELETED": "1 rapport supprimé | {n} rapports supprimés"
    }
  }
};
</script>
