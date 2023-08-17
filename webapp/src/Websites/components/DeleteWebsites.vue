<template>
  <slot v-bind="{ deleteWebsites: hosts => ($data.hosts = hosts) }" />

  <ConfirmModal
    :show="!!hosts.length"
    @update:show="hosts = []"
    :positive-button-props="{ loading: deleting }"
    @positiveClick="deleteWebsites"
  />
</template>

<script>
import { ConfirmModal } from "@/components";
import { success, error, requestErrorHandler } from "@/helpers";
import gql from "graphql-tag";

export default {
  components: { ConfirmModal },
  props: { to: [String, Object] },
  data: () => ({ hosts: [], deleting: false }),
  methods: {
    deleteWebsites() {
      const { $apollo, hosts, to, $router } = this;
      this.deleting = true;

      Promise.all(
        hosts.map(host =>
          $apollo.mutate({
            mutation: gql`
              mutation ($host: String!) {
                deleteWebsite(host: $host) {
                  ok
                  message
                }
              }
            `,
            variables: { host }
          })
        )
      )
        .then(deleteWebsites => {
          const deleted = deleteWebsites.reduce(
            (acc, { data: { deleteWebsite: { ok, message } } = {} }, idx) =>
              ok
                ? (acc.push(hosts[idx]), acc)
                : (error({ content: message }), acc),
            []
          );
          if (!deleted.length) return;

          success({ content: this.$tc("{n}_WEBSITE_DELETED", deleted.length) });
          this.$emit("deleted", deleted);
          this.hosts = [];
          to && $router.push(to);
        })
        .catch(requestErrorHandler)
        .finally(() => (this.deleting = false));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        "{n}_WEBSITE_DELETED": "1 website deleted | {n} websites deleted"
      },
      "fr-FR": {
        "{n}_WEBSITE_DELETED": "1 site supprimé | {n} sites supprimés"
      }
    }
  }
};
</script>
