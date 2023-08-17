<template>
  <VueApexCharts
    ref="pieChart"
    type="donut"
    :options="options"
    :series="series"
    height="100%"
  />
</template>

<script>
import VueApexCharts from "vue3-apexcharts";
import RESPONSE_CODE_TYPES from "@/responseCodeTypes.const.js";

const { labels, colors } = Object.values(RESPONSE_CODE_TYPES).reduce(
  (acc, { label, color }) => (
    acc.labels.push(label), acc.colors.push(color), acc
  ),
  { labels: [], colors: [] }
);

export default {
  components: { VueApexCharts },
  props: {
    // eslint-disable-next-line vue/no-unused-properties
    http1xxCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http2xxCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http3xxCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http4xxCount: { type: Number, required: true },
    // eslint-disable-next-line vue/no-unused-properties
    http5xxCount: { type: Number, required: true },
    offsetY: { type: Number, default: -10 }
  },
  computed: {
    series: ({ $props }) => Object.values($props).slice(0, -1), // remove offsetY prop
    options: ({ offsetY }) => ({
      labels,
      colors,
      legend: { offsetY },
      stroke: { show: false }
    })
  },
  methods: {
    exportAsPng(opts) {
      const link = document.createElement("a");
      link.download = "url-checker-report-pie-chart.png";

      return this.$refs.pieChart.dataURI(opts).then(({ imgURI }) => {
        link.href = imgURI;
        link.click();
      });
    }
  }
};
</script>
