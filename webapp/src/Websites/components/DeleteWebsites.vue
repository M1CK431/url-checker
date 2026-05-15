<template>
  <slot v-bind="{ deleteWebsites: hosts => ($data.hosts = hosts) }" />

  <ConfirmModal
    :show="!!hosts.length"
    @update:show="hosts = []"
    :positiveButtonProps="{ loading: deleting }"
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

      $apollo
        .mutate({
          mutation: gql`
            mutation ($hosts: [ID!]!) {
              deleteWebsites(hosts: $hosts) {
                ok
                message
              }
            }
          `,
          variables: { hosts },
          update: () =>
            this.$subscribe.handleMutation(
              { operation: "DELETE", evictCache: { fieldName: "websites" } },
              hosts.map(host => ({ __typename: "Website", host }))
            )
        })
        .then(({ data: { deleteWebsites: { ok, message } } = {} }) => {
          if (!ok) return error({ content: message });

          success({ content: this.$t("{n}_WEBSITE_DELETED", hosts.length) });
          this.$emit("deleted", hosts);
          this.hosts = [];
          to && $router.push(to);
        })
        .catch(requestErrorHandler)
        .finally(() => (this.deleting = false));
    }
  },
  i18n: {
    "en-US": {
      "{n}_WEBSITE_DELETED": "1 website deleted | {n} websites deleted"
    },
    "fr-FR": {
      "{n}_WEBSITE_DELETED": "1 site supprimé | {n} sites supprimés"
    }
  }
};
</script>
