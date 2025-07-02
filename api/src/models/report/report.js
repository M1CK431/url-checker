import { filter, pipe } from "graphql-yoga";
import { queryFromInfo } from "@pothos/plugin-prisma";
import schemaBuilder from "#src/schemaBuilder.js";
import Model from "#src/Model.js";
import { getPaginatedType, getSubscriptionType, PageInput } from "#src/common.js";
import {
  getValidatedPage,
  checkAllowedDomains,
  checkProcessingDomain,
  parallelize
} from "#src/helpers.js";
import { extractUrls, getFaviconUrl } from "#src/urlsExtractor.js";
import { checkUrl } from "#src/checkUrl.js";
import { WebsiteDbModel } from "../website/website.js";
import { CheckResultDbModel, getCheckResultsField } from "../checkResult/checkResult.js";
import pubSub from "#src/pubSub.js";

export const {
  ReportDbModel,
  ReportGqlType,
  ReportGqlFiltersType,
  ReportGqlSortType
} = new Model("Report", {
  gqlOverrides: {
    url: { type: "URL" },
    duration: { description: "unit: ms" }
  },
  additionalFields: t => ({ checkResults: getCheckResultsField(t) })
});

const reportsPaginatedType = getPaginatedType("Reports", ReportGqlType);

export const getReportsField = t => t.field({
  type: reportsPaginatedType,
  args: {
    filters: t.arg({ type: ReportGqlFiltersType }),
    sort: t.arg({ type: ReportGqlSortType }),
    page: t.arg({
      type: PageInput,
      description: "If not provided, all entries will be returned"
    })
  },
  resolve: async (parent, { filters, sort, page }, context, info) => {
    const { current, size } = getValidatedPage(page);
    const { by, order } = sort ?? {};

    parent && (filters = { ...filters, websiteHost: parent.host });

    const commonQueryOpts = {
      ...filters && { where: filters },
      ...sort && { orderBy: [{ [by]: order }] }
    };

    const [totalCount, entries] = await Promise.all([
      ReportDbModel.count(commonQueryOpts),
      ReportDbModel.findMany({
        ...commonQueryOpts,
        ...queryFromInfo({ context, info, path: ["entries"] }),
        ...page && { skip: (current - 1) * size, take: size }
      })
    ]).catch(err => { throw err; });

    return { totalCount, entries };
  }
});

schemaBuilder.queryFields(t => ({
  reports: getReportsField(t),

  report: t.prismaField({
    type: ReportGqlType,
    args: { id: t.arg.id({ required: true }) },
    resolve: (query, _parent, { id }) =>
      ReportDbModel.findUnique({ ...query, where: { id: +id } })
  })
}));

schemaBuilder.mutationFields(t => ({
  generateReport: t.field({
    type: ReportGqlType,
    args: { url: t.arg({ type: "URL", required: true }) },
    resolve: async (_parent, { url }) => {
      checkAllowedDomains(url);
      await checkProcessingDomain(url);

      const faviconUrl = await getFaviconUrl(url);
      const urls = await extractUrls(url);

      if (!urls[0]) throw `No URL found. Is "${url}" a sitemap?`;

      const website = await WebsiteDbModel
        .upsert({
          where: { host: url.host },
          create: { host: url.host, faviconUrl },
          update: {}
        })
        .then(website => {
          pubSub.publish("website", {
            operation:
              +website.createdAt === +website.updatedAt ? "CREATE" : "UPDATE",
            primaryKey: website.host
          });

          return website;
        });

      const report = await ReportDbModel
        .create({
          data: {
            url: url.href,
            totalCount: urls.length,
            website: { connect: { host: website.host } }
          }
        })
        .then(report => {
          pubSub.publish(
            "report",
            { operation: "CREATE", primaryKey: report.id }
          );

          return report;
        });

      ReportDbModel.update({
        data: { checkResults: { create: urls.map(url => ({ url })) } },
        include: { checkResults: true },
        where: { id: report.id }
      })
        .then(({ checkResults }) => {
          pubSub.publish(
            "report",
            { operation: "UPDATE", primaryKey: report.id }
          );

          return parallelize(
            checkResults.map(checkResult => () => checkUrl(checkResult))
          );
        })
        .then(() => CheckResultDbModel.count({
          where: { reportId: report.id, status: "ERROR" }
        }))
        .then(count => ReportDbModel.update({
          data: {
            status: "DONE",
            duration: Date.now() - report.createdAt,
            ...count && {
              status: "ERROR",
              errorReason: "At least one URL check failed"
            }
          },
          where: { id: report.id }
        }))
        .catch(err => ReportDbModel.update({
          data: { status: "ERROR", errorReason: err.toString() },
          where: { id: report.id }
        }))
        .finally(() => pubSub.publish(
          "report",
          { operation: "UPDATE", primaryKey: report.id }
        ));

      return report;
    }
  }),

  deleteReports: t.field({
    type: "OperationResult",
    args: { ids: t.arg.idList({ required: true }) },
    resolve: async (_parent, { ids }) => {
      const query = { where: { id: { in: ids.map(id => +id) } } };
      const pending = await ReportDbModel.findMany(query);

      return ReportDbModel.deleteMany(query)
        .then(() =>
          WebsiteDbModel.deleteMany({ where: { reports: { none: {} } } }))
        .then(() =>
          pending.forEach(report => pubSub.publish(
            "report",
            { operation: "DELETE", primaryKey: report.id, report }
          )))
        .then(() => ({ ok: true, message: `${ids.length} report(s) deleted` }))
        .catch(err => ({ ok: false, message: err.toString() }));
    }
  })
}));

schemaBuilder.subscriptionField(
  "report",
  t => t.field({
    type: getSubscriptionType("ReportSubscription", ReportGqlType),
    nullable: false,
    args: { id: t.arg.id() },
    subscribe: (_parent, { id }) => pipe(
      pubSub.subscribe("report"),
      filter(({ primaryKey }) => !id || primaryKey === +id)
    ),
    resolve: async (
      { operation, primaryKey, report },
      _args,
      context,
      info
    ) => {
      // slightly delay subscription to let enough time for mutation return
      await new Promise(res => setTimeout(res, 500));

      if (operation === "DELETE")
        return { operation, data: { ...report, status: "DELETED" } };

      const data = ReportDbModel.findUnique({
        ...queryFromInfo({ context, info, path: ["data"] }),
        where: { id: primaryKey }
      });

      return { operation, data };
    }
  })
);
