<template>
  <NButton
    text
    type="primary"
    :loading="exporting"
    @click="exportAsCSV"
    class="uppercase text-xs leading-none"
  >
    {{ $t("DOWNLOAD_AS_CSV") }}
  </NButton>
</template>

<script>
import { saveAs } from "file-saver";
import {
  sizeFormatter,
  secondFormatter,
  requestErrorHandler
} from "@/helpers.js";
import reportCheckResultsQuery from "./reportCheckResults.query.gql";

export default {
  props: { reportId: { type: String, required: true } },
  data: () => ({ exporting: false }),
  computed: {
    columns: ({ $i18n }) =>
      [
        { key: "url", name: "URL" },
        {
          key: "createdAt",
          name: "DATE",
          formatter: ts => new Date(ts).toISOString()
        },
        { key: "responseCode", name: "CODE" },
        { key: "redirectUrl", name: "REDIRECTION" },
        { key: "size", name: "SIZE", formatter: sizeFormatter },
        {
          key: "duration",
          name: "DURATION",
          formatter: ms => secondFormatter(ms / 1000)
        },
        { key: "status", name: "STATUS" },
        { key: "errorReason", name: "ERROR_REASON" }
      ].map(({ name, ...rest }) => ({ ...rest, name: $i18n.t(name) }))
  },
  methods: {
    exportAsCSV() {
      this.exporting = true;

      this.$apollo
        .query({
          query: reportCheckResultsQuery,
          variables: { id: this.reportId }
        })
        .then(
          ({
            data: {
              report: { createdAt, url, checkResults: { entries } = {} }
            } = {}
          }) => {
            const { columns } = this;
            const { hostname } = new URL(url);
            createdAt = new Date(createdAt).toISOString();

            const csv = entries.reduce(
              (acc, checkResult) =>
                `${acc}\n${columns.map(
                  ({ key, formatter = v => v }) =>
                    `"${formatter(checkResult[key]) || ""}"`
                )}`,
              columns.map(({ name }) => name)
            );

            saveAs(
              new Blob([csv], { type: "text/csv;charset=utf-8" }),
              `report-${hostname}-${createdAt}.csv`
            );
          }
        )
        .catch(requestErrorHandler)
        .finally(() => (this.exporting = false));
    }
  },
  i18n: {
    messages: {
      "en-US": {
        DOWNLOAD_AS_CSV: "Download as CSV",
        ERROR_REASON: "Error reason"
      },
      "fr-FR": {
        DOWNLOAD_AS_CSV: "Télécharger en CSV",
        ERROR_REASON: "Cause de l'erreur"
      }
    }
  }
};
</script>
