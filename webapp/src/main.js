import { createApp } from "vue";
import App from "./App.vue";
import router from "./router.js";
import * as plugins from "@/plugins";
import * as mixins from "@/mixins.js";
import * as directives from "@/directives.js";

const app = createApp(App);

import "./assets/tailwind.css";
import "./assets/main.css";

[router, ...Object.values(plugins)].forEach(app.use);
Object.values(mixins).forEach(app.mixin);
Object.entries(directives).forEach(entry => app.directive(...entry));

app.mount("#app");
