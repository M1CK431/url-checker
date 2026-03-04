import { createRouter, createWebHistory } from "vue-router";
import usersRoutes from "./Users/routes.js";

const isProdEnv = import.meta.env.MODE === "production";

export const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("@/Dashboard/Dashboard.vue")
  },
  {
    path: "/sites",
    name: "sites",
    component: () => import("@/Websites/Websites.vue")
  },
  {
    path: "/sites/:host/",
    name: "site",
    props: true,
    component: () => import("@/Website/Website.vue")
  },
  {
    path: "/sites/:host/:reportId",
    name: "report",
    props: true,
    component: () => import("@/Report/Report.vue")
  },
  ...usersRoutes,
  isProdEnv || {
    path: "/devtools",
    name: "devtools",
    component: () => import("@/DevTools/DevTools.vue")
  }
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
