import { Op } from "sequelize";
import {
  GraphQLString,
  GraphQLID,
  GraphQLNonNull,
  GraphQLError
} from "graphql";
import { parse, simplify } from "graphql-parse-resolve-info";
import { WebsiteGqlType, WebsiteDbModel } from "./websites.js";
import {
  CheckResultDbModel,
  CheckResultsGqlType,
  checkResultsArgs,
  checkResultsResolver
} from "./checkResults.js";
import {
  getNonNullFields,
  getValidatedPage,
  checkAllowedDomains,
  checkProcessingDomain,
  parallelize
} from "./helpers.js";
import {
  OperationResult,
  PageInput,
  getPaginatedType,
  getSubscriptionType
} from "./common.js";
import Model from "./Model.js";
import { checkUrl } from "./checkUrl.js";
import { extractUrls, getFaviconUrl } from "./urlsExtractor.js";

import { PubSub, withFilter } from "graphql-subscriptions";
const reportPubSub = new PubSub();

export const {
  ReportDbModel,
  ReportGqlType,
  ReportGqlFiltersType,
  ReportDbFilters,
  ReportGqlSortType,
  ReportDbSort
} = new Model("Report", {
  id: { type: "id" },
  createdAt: { type: "date", nullable: false },
  updatedAt: { type: "date", nullable: false },
  url: { type: "string", nullable: false, length: 2083 },
  http5xxCount: { type: "int", defaultValue: 0 },
  http4xxCount: { type: "int", defaultValue: 0 },
  http3xxCount: { type: "int", defaultValue: 0 },
  http2xxCount: { type: "int", defaultValue: 0 },
  http1xxCount: { type: "int", defaultValue: 0 },
  processedCount: { type: "int", defaultValue: 0 },
  totalCount: { type: "int", defaultValue: 0 },
  duration: { type: "int", defaultValue: 0, description: "unit: ms" },
  status: {
    type: "enum",
    name: "ReportStatus",
    values: ["PROCESSING", "ERROR", "DONE", "DELETED"],
    defaultValue: "PROCESSING"
  },
  errorReason: { type: "string" },
  website: {
    gqlOnly: true,
    // type is a closure function to handle mutual gql type dependency
    type: () => new GraphQLNonNull(WebsiteGqlType),
    resolve: (parent, _args, _ctx, info) => {
      const { fields } = simplify(parse(info), WebsiteGqlType);
      delete fields.reports;

      return WebsiteDbModel.findByPk(parent.WebsiteHost, {
        attributes: Object.keys(fields)
      });
    }
  },
  checkResults: {
    gqlOnly: true,
    // type, args & resolve are closure functions to handle mutual gql type dependency
    type: () => new GraphQLNonNull(CheckResultsGqlType),
    args: () => checkResultsArgs,
    resolve: (...args) => checkResultsResolver(...args)
  }
});

export const ReportsGqlType = getPaginatedType("Reports", ReportGqlType);

ReportDbModel.hasMany(CheckResultDbModel, { onDelete: "CASCADE" });
CheckResultDbModel.belongsTo(ReportDbModel, {
  foreignKey: { primaryKey: true }
});

ReportDbModel.afterCreate(report =>
  reportPubSub.publish("REPORT_CREATED", { operation: "CREATE", report })
);
ReportDbModel.afterUpdate(report =>
  reportPubSub.publish("REPORT_UPDATED", { operation: "UPDATE", report })
);
ReportDbModel.afterUpsert((created, report) =>
  reportPubSub.publish(`REPORT_${created ? "CREATED" : "UPDATED"}`, {
    operation: created ? "CREATE" : "UPDATE",
    report
  })
);
ReportDbModel.afterDestroy(report =>
  reportPubSub.publish("REPORT_DELETED", { operation: "DELETE", report })
);

// Because increment/decrement on report db model doesn't trigger any hook...
// See here for details: https://github.com/sequelize/sequelize/issues/4473
CheckResultDbModel.afterUpdate(({ ReportId }) =>
  reportPubSub.publish("REPORT_UPDATED", {
    operation: "UPDATE",
    report: { id: ReportId }
  })
);

CheckResultDbModel.sync();

export const reportsArgs = {
  search: { type: GraphQLString },
  filters: { type: ReportGqlFiltersType },
  sort: { type: ReportGqlSortType },
  page: {
    type: PageInput,
    description: "If not provided, all entries will be returned"
  }
};

export const reportsResolver = async (
  parent,
  { page, search, filters, sort },
  _ctx,
  info
) => {
  const { current, size } = getValidatedPage(page);

  const { fields } = simplify(
    parse(info)?.fieldsByTypeName.Reports.entries ?? { fieldsByTypeName: {} },
    ReportGqlType
  );
  fields.id ||= {}; // always includes primary key in fields

  if (fields.website) fields.WebsiteHost = {}; // used by website field resolver
  delete fields.website;
  delete fields.checkResults;

  const { count, rows } = await ReportDbModel.findAndCountAll({
    attributes: Object.keys(fields),
    where: {
      ...(parent && { websiteHost: parent.host }),
      ...(search && { url: { [Op.substring]: search } }),
      ...(filters && ReportDbFilters(filters))
    },
    ...(sort && { order: ReportDbSort(sort) }),
    ...(page && { offset: (current - 1) * size, limit: size })
  });

  return { totalCount: count, entries: rows };
};

export const queries = {
  reports: {
    type: ReportsGqlType,
    args: reportsArgs,
    resolve: reportsResolver
  },
  report: {
    type: ReportGqlType,
    args: getNonNullFields({ id: { type: GraphQLID } }),
    resolve: (_parent, { id }, _ctx, info) => {
      const { fields } = simplify(parse(info), ReportGqlType);
      if (fields.website) fields.WebsiteHost = {}; // used by website field resolver
      delete fields.website;
      delete fields.checkResults;

      return ReportDbModel.findByPk(id, { attributes: Object.keys(fields) });
    }
  }
};

export const mutations = {
  generateReport: {
    type: ReportGqlType,
    args: getNonNullFields({ url: { type: GraphQLString } }),
    resolve: async (_parent, { url }) => {
      checkAllowedDomains(url);
      await checkProcessingDomain(url);

      const createdAt = Date.now();
      const faviconUrl = await getFaviconUrl(url);
      const urls = await extractUrls(url);

      if (!urls[0])
        throw new GraphQLError(`No URL found. Is "${url}" a sitemap?`);

      const [website] = await WebsiteDbModel.upsert({
        host: new URL(url).host,
        faviconUrl
      });
      const report = await website.createReport({
        url,
        websiteHost: website.host,
        totalCount: urls.length
      });

      CheckResultDbModel.bulkCreate(
        urls.map(url => ({ url, ReportId: report.id }))
      )
        .then(checkResults =>
          parallelize(
            checkResults.map(checkResult => () => checkUrl(checkResult))
          )
        )
        .then(() => {
          report
            .countCheckResults({ where: { status: ["ERROR"] } })
            .then(count => {
              report.update({
                status: "DONE",
                duration: Date.now() - createdAt,
                ...(count && {
                  status: "ERROR",
                  errorReason: "At least one URL check failed"
                })
              });
            });
        });

      return report;
    }
  },

  deleteReport: {
    type: OperationResult,
    args: getNonNullFields({ id: { type: GraphQLID } }),
    resolve: (_parent, { id }) =>
      ReportDbModel.findByPk(id)
        .then(report => {
          if (!report) return { ok: false, message: `Report ${id} not found` };

          return report.destroy().then(async () => {
            const website = await report.getWebsite();
            const reportsCount = await website.countReports();
            reportsCount || website.destroy();
          });
        })
        .then(() => ({ ok: true, message: `Report ${id} deleted` }))
        .catch(err => ({ ok: false, message: err.toString() }))
  }
};

export const subscriptions = {
  report: {
    type: getSubscriptionType("SubscribedReport", ReportGqlType),
    args: { id: { type: GraphQLID } },
    subscribe: withFilter(
      () =>
        reportPubSub.asyncIterator(
          ["CREATED", "UPDATED", "DELETED"].map(e => `REPORT_${e}`)
        ),
      ({ report }, { id }) => !id || report.id === +id
    ),
    async resolve({ operation, report }, _args, _ctx, info) {
      // slightly delay subscription to let enough time for mutation return
      await new Promise(res => setTimeout(res, 500));

      if (operation === "DELETE")
        return { operation, data: { ...report.get(), status: "DELETED" } };

      const { fields } = simplify(
        parse(info)?.fieldsByTypeName.SubscribedReport.data ?? {
          fieldsByTypeName: {}
        },
        ReportGqlType
      );
      fields.id ||= {}; // always includes primary key in fields

      if (fields.website) fields.WebsiteHost = {}; // used by website field resolver
      delete fields.website;
      delete fields.checkResults;

      const data = await ReportDbModel.findByPk(report.id, {
        attributes: Object.keys(fields)
      });

      return { operation, data };
    }
  }
};
