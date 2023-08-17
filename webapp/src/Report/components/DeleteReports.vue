<template>
  <slot v-bind="{ deleteReports: ids => ($data.ids = ids) }" />

  <ConfirmModal
    :show="!!ids.length"
    @update:show="ids = []"
    :positive-button-props="{ loading: deleting }"
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

      Promise.all(
        ids.map(id =>
          $apollo.mutate({
            mutation: gql`
              mutation ($id: ID!) {
                deleteReport(id: $id) {
                  ok
                  message
                }
              }
            `,
            variables: { id }
          })
        )
      )
        .then(deleteReports => {
          const deleted = deleteReports.reduce(
            (acc, { data: { deleteReport: { ok, message } } = {} }, idx) =>
              ok
                ? (acc.push(ids[idx]), acc)
                : (error({ content: message }), acc),
            []
          );
          if (!deleted.length) return;

          success({ content: this.$tc("{n}_REPORT_DELETED", deleted.length) });
          this.$emit("deleted", deleted);
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
        "{n}_REPORT_DELETED": "1 report deleted | {n} reports deleted"
      },
      "fr-FR": {
        "{n}_REPORT_DELETED": "1 rapport supprimé | {n} rapports supprimés"
      }
    }
  }
};
</script>
