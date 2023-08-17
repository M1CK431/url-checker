<template>
  <div class="relative">
    <div
      v-show="loading"
      class="absolute z-10 flex items-center justify-center bg-white bg-opacity-75 rounded-xl"
      style="top: 0.25rem; right: 0; bottom: 0.25rem; left: 0"
    >
      <NSpin size="large" />
    </div>

    <table class="text-left border-separate w-full text-xs">
      <tr class="text-slate-50 rounded-xl">
        <th
          v-if="selectable"
          class="w-8 bg-slate-700 py-2 pl-6 whitespace-nowrap"
        >
          <NCheckbox
            :disabled="!rows[0]"
            :checked="rows[0] && modelValue.length === rows.length"
            @update:checked="
              $emit(
                'update:modelValue',
                modelValue[0]
                  ? []
                  : rows.filter(({ unselectable }) => !unselectable)
              )
            "
            :indeterminate="
              !!modelValue[0] && modelValue.length !== rows.length
            "
          />
        </th>

        <th
          v-for="{
            key,
            name = '',
            sortable,
            sortKey = key,
            defaultOrder,
            className
          } in columns"
          :key="key"
          class="bg-slate-700 font-normal py-3 px-6 whitespace-nowrap"
          :class="[{ 'hover:text-white': sortable }, className]"
        >
          <div
            class="group"
            :class="{ 'cursor-pointer hover:font-semibold': sortable }"
            @click="sortable && sortBy(sortKey, defaultOrder)"
          >
            <slot name="columnName" v-bind="{ key, name }">
              {{ $tc(name) }}
            </slot>

            <span
              v-if="sortable"
              class="ml-2"
              :class="{
                'opacity-40 group-hover:opacity-100': sort.by !== sortKey
              }"
            >
              <RiSortAsc
                v-show="sort.by !== sortKey || sort.order === 'ASC'"
                class="inline-block align-sub"
              />
              <RiSortDesc
                v-show="sort.by === sortKey && sort.order === 'DESC'"
                class="inline-block align-sub"
              />
            </span>
          </div>
        </th>
      </tr>

      <!-- This empty row is used to double border-spacing after the header -->
      <tr>
        <td :colspan="columnsCount"></td>
      </tr>

      <tr v-show="!rows[0]">
        <td
          :colspan="columnsCount"
          class="py-3 px-6 bg-white/80 text-center text-slate-500"
        >
          <slot name="placeholder">{{ placeholder || $t("NO_DATA") }}</slot>
        </td>
      </tr>

      <template v-for="(row, index) in rows" :key="getKey(row) || index">
        <tr
          class="bg-white/80 text-slate-700"
          :class="[
            { 'cursor-pointer hover:shadow rounded-xl': onRowClick },
            row.className
          ]"
          @click="handleRowClick({ row, index })"
        >
          <td v-if="selectable" class="py-3 pl-6" @click.stop>
            <NCheckbox
              v-if="selectable"
              :disabled="row.unselectable"
              :checked="
                modelValue.some(selected => getKey(selected) === getKey(row))
              "
              @update:checked="toggleSelected(row, $event)"
            />
          </td>

          <td v-for="{ key } in columns" :key="key" class="py-3 px-6">
            <slot :name="key" v-bind="{ row, key, [key]: row[key] }">
              <slot name="cell" v-bind="{ row, key }">
                {{ row[key] === undefined ? "" : row[key] }}
              </slot>
            </slot>
          </td>
        </tr>

        <!-- This empty row is used to double border-spacing between rows -->
        <tr v-show="rows[index + 1]">
          <td :colspan="columnsCount"></td>
        </tr>
      </template>
    </table>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: Array,
    columns: {
      type: Array,
      required: true,
      validator: columns => !columns.some(({ key }) => key === undefined)
    },
    rows: { type: Array, required: true },
    getKey: { type: Function, default: row => row?.id },
    sort: {
      type: Object,
      default: () => ({ by: "", order: "ASC" }),
      validator: ({ by, order }) =>
        by !== undefined && ["ASC", "DESC"].includes(order)
    },
    placeholder: { type: String, default: "" },
    loading: Boolean,

    // events (thanks to vue 3 stupidly remove $listeners and is inconsistant: https://github.com/vuejs/rfcs/discussions/397)
    onRowClick: Function
  },
  computed: {
    selectable: ({ modelValue }) => modelValue !== undefined,
    columnsCount: ({ columns, selectable }) => columns.length + selectable
  },
  methods: {
    sortBy(sortKey, defaultOrder = "ASC") {
      const { by, order } = this.sort;

      this.$emit("update:sort", {
        by: sortKey,
        order:
          sortKey === by ? (order === "ASC" ? "DESC" : "ASC") : defaultOrder
      });
    },
    handleRowClick({ row, index }) {
      this.$emit("rowClick", row, index);

      const { selectable, modelValue } = this;
      if (!selectable || row.unselectable) return;

      const selected = modelValue.some(
        selected => this.getKey(selected) === this.getKey(row)
      );
      this.toggleSelected(row, !selected);
    },
    toggleSelected(row, event) {
      const { modelValue, getKey } = this;
      const selected = event
        ? [...modelValue, row]
        : modelValue.filter(selected => getKey(selected) !== getKey(row));
      this.$emit("update:modelValue", selected);
    }
  }
};
</script>

<style scoped>
table {
  border-spacing: 0 0.25rem;
}

table tr > *:first-child {
  @apply rounded-l-xl;
}

table tr > *:last-child {
  @apply rounded-r-xl;
}
</style>
