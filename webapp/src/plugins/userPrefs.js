const defaultUserPrefs = { locale: null, lastCheckResults: [] };

export const userPrefs = reactive({
  ...defaultUserPrefs,
  ...JSON.parse(localStorage.getItem("userPrefs") ?? "{}")
});

watch(userPrefs, () =>
  localStorage.setItem("userPrefs", JSON.stringify(userPrefs))
);

export default ({ config: { globalProperties } }) =>
  (globalProperties.$userPrefs = userPrefs);
