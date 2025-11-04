import { filter, pipe } from "graphql-yoga";
import { queryFromInfo } from "@pothos/plugin-prisma";
import schemaBuilder from "#src/schemaBuilder.js";
import Model from "#src/Model.js";
import { getPaginatedType, PageInput, getSubscriptionType } from "#src/common.js";
import { getValidatedPage } from "#src/helpers.js";
import { ReportDbModel, getReportsField } from "../report/report.js";
import pubSub from "#src/pubSub.js";

export const {
  WebsiteDbModel,
  WebsiteGqlType,
  WebsiteGqlFiltersType,
  WebsiteGqlSortType
} = new Model("Website", {
  gqlOverrides: { faviconUrl: { type: "URL" } },
  additionalFields: t => ({
    sitemaps: t.field({
      type: ["URL"],
      nullable: false,
      resolve: ({ host }) => ReportDbModel.findMany({
        where: { websiteHost: host },
        distinct: "url",
        select: { url: true }
      }).then(reports => reports.map(r => r.url))
    }),
    maxUrlsCount: t.int({
      nullable: false,
      resolve: ({ host }) => ReportDbModel.aggregate({
        where: { websiteHost: host },
        _max: { totalCount: true }
      }).then(({ _max }) => _max.totalCount)
    }),
    reports: getReportsField(t),
    deleted: undefined
  })
});

// garbage collector: remove deleted (if any) at startup
WebsiteDbModel.deleteMany({ where: { deleted: true } }).catch(() => {});

schemaBuilder.queryFields(t => ({
  websites: t.field({
    type: getPaginatedType("Websites", WebsiteGqlType),
    args: {
      filters: t.arg({ type: WebsiteGqlFiltersType }),
      sort: t.arg({ type: WebsiteGqlSortType }),
      page: t.arg({
        type: PageInput,
        description: "If not provided, all entries will be returned"
      })
    },
    resolve: async (parent, { filters, sort, page }, context, info) => {
      const { current, size } = getValidatedPage(page);
      const { by, order } = sort ?? {};

      const commonQueryOpts = {
        // also list deleted if parent is deleted too (for subscriptions)
        where: { ...filters, ...parent?.deleted || { deleted: false } },
        ...sort && { orderBy: [{ [by]: order }] }
      };

      const [totalCount, entries] = await Promise.all([
        WebsiteDbModel.count(commonQueryOpts),
        WebsiteDbModel.findMany({
          ...commonQueryOpts,
          ...queryFromInfo({ context, info, path: ["entries"] }),
          ...page && { skip: (current - 1) * size, take: size }
        })
      ]).catch(err => { throw err; });

      return { totalCount, entries };
    }
  }),
  website: t.prismaField({
    type: WebsiteGqlType,
    args: { host: t.arg.id({ required: true }) },
    resolve: (query, _parent, { host }) =>
      WebsiteDbModel.findUnique({ ...query, where: { host, deleted: false } })
  })
}));

export const deleteWebsites = async hosts => {
  const query = { where: { host: { in: hosts } } };
  const pending = await WebsiteDbModel.findMany(query);

  await Promise.all([
    WebsiteDbModel.updateMany({ ...query, data: { deleted: true } }),
    ReportDbModel.updateMany({
      where: { websiteHost: { in: hosts } },
      data: { deleted: true }
    })
  ]).catch(err => {
    throw new Error(`Failed to delete website(s): ${err.toString()}`);
  });

  // slightly delay effective deletion for subscription
  setTimeout(() => WebsiteDbModel.deleteMany(query).catch(() => {}), 5000);

  pending.forEach(website => pubSub.publish(
    "website",
    { operation: "DELETE", primaryKey: website.host }
  ));
};

schemaBuilder.mutationField(
  "deleteWebsites",
  t => t.field({
    type: "OperationResult",
    args: { hosts: t.arg.idList({ required: true }) },
    resolve: async (_parent, { hosts }) => {
      await deleteWebsites(hosts);
      return { ok: true, message: `${hosts.length} website(s) deleted` };
    }
  })
);

schemaBuilder.subscriptionField(
  "website",
  t => t.field({
    type: getSubscriptionType("WebsiteSubscription", WebsiteGqlType),
    nullable: false,
    args: { host: t.arg.id() },
    subscribe: (_parent, { host }) => pipe(
      pubSub.subscribe("website"),
      filter(({ primaryKey }) => !host || primaryKey === host)
    ),
    resolve: async (
      { operation, primaryKey },
      _args,
      context,
      info
    ) => {
      // slightly delay subscription to let enough time for mutation return
      await new Promise(res => setTimeout(res, 500));

      const data = await WebsiteDbModel.findUnique({
        ...queryFromInfo({ context, info, path: ["data"] }),
        where: { host: primaryKey }
      });

      return { operation, data };
    }
  })
);
