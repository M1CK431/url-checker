import { Op } from "sequelize";
import {
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from "graphql";
import { parse, simplify } from "graphql-parse-resolve-info";
import {
  ReportDbModel,
  ReportsGqlType,
  reportsArgs,
  reportsResolver
} from "./reports.js";
import { getNonNullFields, getValidatedPage } from "./helpers.js";
import {
  OperationResult,
  PageInput,
  getPaginatedType,
  getSubscriptionType
} from "./common.js";
import Model from "./Model.js";

import { PubSub, withFilter } from "graphql-subscriptions";
const websitePubSub = new PubSub();

export const {
  WebsiteDbModel,
  WebsiteGqlType,
  WebsiteGqlFiltersType,
  WebsiteDbFilters,
  WebsiteGqlSortType,
  WebsiteDbSort
} = new Model("Website", {
  host: { type: "string", length: 260, primaryKey: true },
  faviconUrl: { type: "string", length: 2083 },
  createdAt: { type: "date", nullable: false },
  updatedAt: { type: "date", nullable: false },
  reports: {
    gqlOnly: true,
    // type, args & resolve are closure functions to handle mutual gql type dependency
    type: () => new GraphQLNonNull(ReportsGqlType),
    args: () => reportsArgs,
    resolve: (...args) => reportsResolver(...args)
  },
  sitemaps: {
    gqlOnly: true,
    type: new GraphQLNonNull(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    ),
    resolve: parent =>
      parent.getReports({ attributes: ["url"], group: ["url"] }).then(reports =>
        // reports.map(({ url }) => new URL(url).pathname.slice(1))
        reports.map(({ url }) => url)
      )
  },
  maxUrlsCount: {
    gqlOnly: true,
    type: new GraphQLNonNull(GraphQLInt),
    resolve: parent =>
      ReportDbModel.max("totalCount", { where: { WebsiteHost: parent.host } })
  }
});

export const WebsitesGqlType = getPaginatedType("Websites", WebsiteGqlType);

WebsiteDbModel.hasMany(ReportDbModel, { onDelete: "CASCADE" });
ReportDbModel.belongsTo(WebsiteDbModel);

WebsiteDbModel.afterCreate(website =>
  websitePubSub.publish("WEBSITE_CREATED", { operation: "CREATE", website })
);
WebsiteDbModel.afterUpdate(website =>
  websitePubSub.publish("WEBSITE_UPDATED", { operation: "UPDATE", website })
);
WebsiteDbModel.afterUpsert((created, website) =>
  websitePubSub.publish(`WEBSITE_${created ? "CREATED" : "UPDATED"}`, {
    operation: created ? "CREATE" : "UPDATE",
    website
  })
);
WebsiteDbModel.afterDestroy(website =>
  websitePubSub.publish("WEBSITE_DELETED", { operation: "DELETE", website })
);

WebsiteDbModel.sync();
ReportDbModel.sync();

export const queries = {
  websites: {
    type: WebsitesGqlType,
    args: {
      search: { type: GraphQLString },
      filters: { type: WebsiteGqlFiltersType },
      sort: { type: WebsiteGqlSortType },
      page: {
        type: PageInput,
        description: "If not provided, all entries will be returned"
      }
    },
    resolve: async (_parent, { page, search, filters, sort }, _ctx, info) => {
      const { current, size } = getValidatedPage(page);

      const { fields } = simplify(
        parse(info).fieldsByTypeName.Websites.entries,
        WebsiteGqlType
      );
      delete fields.reports;
      delete fields.sitemaps;
      delete fields.maxUrlsCount;

      const { count, rows } = await WebsiteDbModel.findAndCountAll({
        attributes: Object.keys(fields),
        where: {
          ...(search && { host: { [Op.substring]: search } }),
          ...(filters && WebsiteDbFilters(filters))
        },
        ...(sort && { order: WebsiteDbSort(sort) }),
        ...(page && { offset: (current - 1) * size, limit: size })
      });

      return { totalCount: count, entries: rows };
    }
  },
  website: {
    type: WebsiteGqlType,
    args: getNonNullFields({ host: { type: GraphQLString } }),
    resolve: (_parent, { host }, _ctx, info) => {
      const { fields } = simplify(parse(info), WebsiteGqlType);
      delete fields.reports;
      delete fields.sitemaps;
      delete fields.maxUrlsCount;

      return WebsiteDbModel.findByPk(host, { attributes: Object.keys(fields) });
    }
  }
};

export const mutations = {
  deleteWebsite: {
    type: OperationResult,
    args: getNonNullFields({ host: { type: GraphQLString } }),
    resolve: (_parent, { host }) =>
      WebsiteDbModel.findByPk(host)
        .then(website => {
          if (!website)
            return { ok: false, message: `Website ${host} not found` };

          return website
            .destroy()
            .then(() => ({ ok: true, message: `Website ${host} deleted` }));
        })
        .catch(err => ({ ok: false, message: err.toString() }))
  }
};

export const subscriptions = {
  website: {
    type: getSubscriptionType("SubscribedWebsite", WebsiteGqlType),
    args: { host: { type: GraphQLString } },
    subscribe: withFilter(
      () =>
        websitePubSub.asyncIterator(
          ["CREATED", "UPDATED", "DELETED"].map(e => `WEBSITE_${e}`)
        ),
      ({ website }, { host }) => !host || website.host === host
    ),
    async resolve({ operation, website }, _args, _ctx, info) {
      // slightly delay subscription to let enough time for mutation return
      await new Promise(res => setTimeout(res, 500));

      if (operation === "DELETE") return { operation, data: website.get() };

      const { fields } = simplify(
        parse(info)?.fieldsByTypeName.SubscribedWebsite.data ?? {
          fieldsByTypeName: {}
        },
        WebsiteGqlType
      );
      fields.host ||= {}; // always includes primary key in fields

      delete fields.reports;
      delete fields.sitemaps;
      delete fields.maxUrlsCount;

      const data = await WebsiteDbModel.findByPk(website.instance.host, {
        attributes: Object.keys(fields)
      });

      return { operation, data };
    }
  }
};
