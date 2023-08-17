<template>
  <Table :columns="columns">
    <template #url="{ url }">
      <NEllipsis style="max-width: 15vw">
        <a :href="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
      </NEllipsis>
    </template>

    <template #updatedAt="{ updatedAt }">
      {{
        updatedAt
          ? new Date(updatedAt).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "medium"
            })
          : "-"
      }}
    </template>

    <template #responseCode="{ responseCode }">
      <ResponseCode :code="responseCode" />
    </template>

    <template #redirectUrl="{ redirectUrl }">
      <NEllipsis v-if="redirectUrl" style="max-width: 15vw">
        <a :href="redirectUrl" target="_blank" rel="noopener noreferrer">
          {{ redirectUrl }}
        </a>
      </NEllipsis>
      <template v-else>-</template>
    </template>

    <template #size="{ size, row: { responseCode } }">
      {{ size && `${responseCode}`[0] !== "3" ? sizeFormatter(size) : "-" }}
    </template>

    <template #duration="{ duration }">
      {{ duration ? secondFormatter(duration) : "-" }}
    </template>

    <template #status="{ status, row: { errorReason } }">
      <Status :status="status" :error-reason="errorReason" />
    </template>

    <template #actions="{ row }">
      <div class="text-right">
        <NButton
          type="primary"
          size="tiny"
          @click="$emit('recheck', row)"
          :loading="row.status === 'PROCESSING'"
          class="p-3"
        >
          {{ $t("CHECK") }}
        </NButton>
      </div>
    </template>
  </Table>
</template>

<script>
import Table from "./Table.vue";
import ResponseCode from "./ResponseCode.vue";
import Status from "./Status.vue";
import { sizeFormatter, secondFormatter } from "@/helpers.js";

export default {
  components: { Table, ResponseCode, Status },
  setup: () => ({ sizeFormatter, secondFormatter }),
  computed: {
    columns: ({ $i18n }) =>
      [
        { key: "url", name: "URL", className: "w-[15vw]" },
        { key: "updatedAt", name: "DATE" },
        { key: "responseCode", name: "CODE" },
        { key: "redirectUrl", name: "REDIRECTION", className: "w-[15vw]" },
        { key: "size", name: "SIZE" },
        { key: "duration", name: "DURATION" },
        { key: "status", name: "STATUS" },
        { key: "actions", name: "" }
      ].map(({ name, ...rest }) => ({ ...rest, name: name && $i18n.t(name) }))
  }
};
</script>
