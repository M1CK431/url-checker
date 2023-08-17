export const refetchQueriesOnCreate = {
  created() {
    Object.values(this.$apollo.queries).forEach(query => query.refetch());
  }
};
