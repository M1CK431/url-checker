import { filter, pipe } from "graphql-yoga";
import { queryFromInfo } from "@pothos/plugin-prisma";
import Model from "#src/Model.js";
import schemaBuilder from "#src/schemaBuilder.js";
import pubSub from "#src/pubSub.js";
import { getValidatedPage, passwordPolicy, validatePasswordComplexity } from "#src/helpers.js";
import { getPaginatedType, PageInput, getSubscriptionType } from "#src/common.js";
import bcrypt from "bcryptjs";
import { generateToken, invalidatedTokens } from "#src/auth.js";
import { GraphQLError } from "graphql";

export const {
  UserDbModel,
  UserGqlType,
  UserGqlFiltersType,
  UserGqlSortType
} = new Model(
  "User",
  { additionalFields: () => ({ password: undefined, deleted: undefined }) }
);

// garbage collector: remove deleted (if any) at startup
UserDbModel.deleteMany({ where: { deleted: true } }).catch(() => {});

schemaBuilder.queryFields(t => ({
  me: t.prismaField({
    type: UserGqlType,
    resolve: (query, _parent, _args, { user }) =>
      UserDbModel.findUnique({
        ...query,
        where: { identifier: user.identifier }
      })
  }),

  users: t.field({
    type: getPaginatedType("Users", UserGqlType),
    args: {
      filters: t.arg({ type: UserGqlFiltersType }),
      sort: t.arg({ type: UserGqlSortType }),
      page: t.arg({
        type: PageInput,
        description: "If not provided, all entries will be returned"
      })
    },
    resolve: async (parent, { filters, sort, page }, context, info) => {
      const { current, size } = getValidatedPage(page);
      const { by, order } = sort ?? {};

      const commonQueryOpts = {
        where: { ...filters, deleted: false },
        ...sort && { orderBy: [{ [by]: order }] }
      };

      const [totalCount, entries] = await Promise.all([
        UserDbModel.count(commonQueryOpts),
        UserDbModel.findMany({
          ...commonQueryOpts,
          ...queryFromInfo({ context, info, path: ["entries"] }),
          ...page && { skip: (current - 1) * size, take: size }
        })
      ]);

      return { totalCount, entries };
    }
  }),

  user: t.prismaField({
    type: UserGqlType,
    args: { id: t.arg.id({ required: true }) },
    resolve: (query, _parent, { id }) =>
      UserDbModel.findUnique({ ...query, where: { id: +id, deleted: false } })
  }),

  passwordPolicy: t.field({
    type: schemaBuilder.objectType("PasswordPolicy", {
      fields: t => ({
        length: t.int({ nullable: false }),
        ...["upper", "lower", "number", "symbol"].reduce((acc, f) =>
          (acc[f] = t.boolean({ nullable: false }), acc), {})
      })
    }),
    resolve: () => passwordPolicy
  })
}));

schemaBuilder.mutationFields(t => ({
  upsertUser: t.field({
    type: UserGqlType,
    args: {
      id: t.arg.id(),
      user: t.arg({
        type: schemaBuilder.inputType("UserInput", {
          fields: t => ({
            identifier: t.id(),
            password: t.string(),
            enabled: t.boolean()
          })
        }),
        required: true
      })
    },
    resolve: async (_parent, { id, user }) => {
      if (user.password) {
        const { isValid, message } = validatePasswordComplexity(user.password);
        if (!isValid) throw new GraphQLError(message);

        user.password = await bcrypt.hash(user.password, 10);
      } else if (!id)
        throw new GraphQLError("A password is required for user creation");

      return (
        id
          ? UserDbModel.update({ where: { id: +id }, data: user })
          : UserDbModel.create({ data: user })
      )
        .then(user => {
          pubSub.publish(
            "user",
            {
              operation: id ? "UPDATE" : "CREATE",
              primaryKey: user.id,
              user
            }
          );

          return user;
        });
    }
  }),

  deleteUsers: t.field({
    type: "OperationResult",
    args: { ids: t.arg.idList({ required: true }) },
    resolve: async (_parent, { ids }) => {
      const query = { where: { id: { in: ids.map(id => +id) } } };
      const pending = await UserDbModel.findMany(query);

      await UserDbModel.updateMany({ ...query, data: { deleted: true } })
        .catch(err => {
          throw new GraphQLError(`Failed to delete user(s): ${err.message}`);
        });

      // slightly delay effective deletion for subscription
      setTimeout(() => UserDbModel.deleteMany(query).catch(() => {}), 5000);

      // Publier l'événement de suppression
      pending.forEach(user => pubSub.publish(
        "user",
        { operation: "DELETE", primaryKey: user.id }
      ));

      return { ok: true, message: `${ids.length} user(s) deleted` };
    }
  }),

  login: t.field({
    skipTypeScopes: true,
    type: schemaBuilder.objectType("AuthResult", {
      fields: t => ({
        user: t.field({ type: UserGqlType, nullable: false }),
        token: t.string({ nullable: false })
      })
    }),
    args: {
      identifier: t.arg.id({ required: true }),
      password: t.arg.string({ required: true })
    },
    resolve: async (_parent, { identifier, password }) => {
      const lastLogin = new Date();
      const userCount = await UserDbModel.count();

      // create first user
      if (userCount === 0) {
        const { isValid, message } = validatePasswordComplexity(password);
        if (!isValid)
          throw new GraphQLError(`Cannot create first user. ${message}`);

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await UserDbModel.create({
          data: { identifier, password: hashedPassword, lastLogin }
        });

        const token = generateToken(identifier);
        return { user, token };
      }

      const user = await UserDbModel.findUnique({
        where: { identifier, deleted: false }
      });
      if (!user) throw new GraphQLError("Invalid credentials");

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new GraphQLError("Invalid credentials");
      if (!user.enabled) throw new GraphQLError("Account disabled");

      UserDbModel.update({ data: { lastLogin }, where: { identifier } });
      const token = generateToken(identifier);

      return { user, token };
    }
  }),

  logout: t.field({
    type: "OperationResult",
    resolve: (_parent, _args, { user }) => {
      invalidatedTokens.add(user.token);
      return { ok: true, message: "Successfully logged out" };
    }
  })
}));

schemaBuilder.subscriptionField(
  "user",
  t => t.field({
    type: getSubscriptionType("UserSubscription", UserGqlType),
    nullable: false,
    args: { id: t.arg.id() },
    subscribe: (_parent, { id }) => pipe(
      pubSub.subscribe("user"),
      filter(({ primaryKey }) => !id || primaryKey === +id)
    ),
    resolve: async (
      { operation, primaryKey },
      _args,
      context,
      info
    ) => {
      // slightly delay subscription to let enough time for mutation return
      await new Promise(res => setTimeout(res, 500));

      const data = await UserDbModel.findUnique({
        ...queryFromInfo({ context, info, path: ["data"] }),
        where: { id: primaryKey }
      });

      return { operation, data };
    }
  })
);
