export default [
  {
    path: "/users",
    name: "users",
    component: () => import("./Users.vue")
  },
  {
    path: "/users/create",
    name: "users.create",
    component: () => import("./Create/Create.vue")
  },
  {
    path: "/users/:id",
    name: "user",
    props: true,
    component: () => import("./User/User.vue")
  }
];
