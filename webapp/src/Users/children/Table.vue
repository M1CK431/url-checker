<template>
  <div class="relative">
    <DeleteUsers v-slot="{ deleteUsers }" @deleted="handleDeleted">
      <Table
        v-model="selected"
        v-bind="$attrs"
        :columns
        @rowClick="$router.push({ name: 'user', params: { id: $event.id } })"
        class="text-slate-700 users-table"
      >
        <template #identifier="{ identifier }">
          <strong>{{ identifier }}</strong>
        </template>

        <template #enabled="{ enabled }">
          <RiCheckFill v-if="enabled" class="text-green-600 text-base" />
          <RiCloseFill v-else class="text-base" />
        </template>

        <template #createdAt="{ createdAt }">
          {{ $d(createdAt) }}
        </template>

        <template #lastLogin="{ lastLogin }">
          {{ lastLogin ? $d(lastLogin) : "-" }}
        </template>

        <template #actions="{ row }">
          <div
            @click.stop
            class="opacity-0 [.users-table_tr:hover_&]:opacity-100 transition-opacity duration-300"
          >
            <NTooltip
              arrowPointToCenter
              :disabled="row.identifier !== $auth.user.identifier"
            >
              <template #trigger>
                <NButton
                  text
                  type="primary"
                  @click="deleteUsers([row.id])"
                  :disabled="row.identifier === $auth.user.identifier"
                  class="hover:text-red-600! transition-colors"
                >
                  <RiDeleteBin7Fill />
                </NButton>
              </template>

              {{
                $t("SUICIDAL_IDEATION_REPORTED_TO_IT_SUPPORT_COFFEE_INCOMING")
              }}
            </NTooltip>
          </div>
        </template>
      </Table>

      <BulkActions
        v-model="selected"
        v-bind="$attrs"
        @bulkDelete="deleteUsers($event.map(({ id }) => id))"
        class="absolute bottom-0"
      />
    </DeleteUsers>
  </div>
</template>

<script>
import { Table, BulkActions } from "@/components";
import DeleteUsers from "../components/DeleteUsers.vue";

export default {
  components: { Table, BulkActions, DeleteUsers },
  inheritAttrs: false,
  data: () => ({ selected: [] }),
  computed: {
    columns: ({ $t }) =>
      [
        {
          key: "identifier",
          name: $t("IDENTIFIER"),
          className: "w-[15vw]"
        },
        { key: "enabled", name: $t("ENABLED") },
        { key: "createdAt", name: $t("CREATED_AT") },
        { key: "lastLogin", name: $t("LAST_LOGIN") },
        { key: "actions", className: "w-5" }
      ].map(c => ({ ...c, sortable: c.key !== "actions" }))
  },
  methods: {
    handleDeleted(deleted) {
      this.selected = this.selected.filter(({ id }) => !deleted.includes(id));
    }
  },
  i18n: { "en-US": { ENABLED: "Enabled" }, "fr-FR": { ENABLED: "Activé" } }
};
</script>
