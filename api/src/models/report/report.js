import { filter, pipe } from "graphql-yoga";
import { queryFromInfo } from "@pothos/plugin-prisma";
import db from "#src/db.js";
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
import { WebsiteDbModel, deleteWebsites } from "../website/website.js";
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
  additionalFields: t => ({
    checkResults: getCheckResultsField(t),
    deleted: undefined
  })
});

// garbage collector: remove deleted (if any) at startup
ReportDbModel.deleteMany({ where: { deleted: true } }).catch(() => {});

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
      // also list deleted if parent is deleted too (for subscriptions)
      where: { ...filters, ...parent?.deleted || { deleted: false } },
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
      ReportDbModel.findUnique({ ...query, where: { id: +id, deleted: false } })
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

      const websiteCreated = await WebsiteDbModel
        .create({ data: { host: url.host, faviconUrl } })
        .then(() => true)
        .catch(err => {
          // P2002 is "Unique constraint failed on the {constraint}"
          // meanings website with that host already exist
          // src: https://www.prisma.io/docs/orm/reference/error-reference#p2002
          if (err.code === "P2002") return false;
          else throw err;
        });

      const report = await ReportDbModel
        .create({
          data: {
            url: url.href,
            totalCount: urls.length,
            website: { connect: { host: url.host } }
          }
        })
        .then(report => {
          pubSub.publish("website", {
            operation: websiteCreated ? "CREATE" : "UPDATE",
            primaryKey: url.host
          });
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
            "website",
            { operation: "UPDATE", primaryKey: url.host }
          );
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
        .finally(() => {
          pubSub.publish(
            "website",
            { operation: "UPDATE", primaryKey: url.host }
          );
          pubSub.publish(
            "report",
            { operation: "UPDATE", primaryKey: report.id }
          );
        });

      return report;
    }
  }),

  deleteReports: t.field({
    type: "OperationResult",
    args: { ids: t.arg.idList({ required: true }) },
    resolve: async (_parent, { ids }) => {
      ids = ids.map(id => +id);
      const pendings = await ReportDbModel.findMany({
        where: { id: { in: ids } },
        select: { id: true, websiteHost: true }
      });

      // TODO: to handle PSQL, replace `?` with `$1`, `$2`, etc... like this
      // const placeholders = `${ids.map((_, i) => `$${i+1}`)}`;
      const placeholders = `${ids.map(() => "?")}`;
      const orphanedWebsitesHosts = await db.$queryRawUnsafe(
        `SELECT w.host
        FROM Website w
        LEFT JOIN Report r ON r.websiteHost = w.host AND r.id NOT IN (${placeholders})
        WHERE w.host IN (
          SELECT websiteHost FROM Report WHERE id IN (${placeholders})
        )
        GROUP BY w.host
        HAVING COUNT(r.id) = 0`,
        ...ids,
        ...ids
      ).then(websites => websites.map(w => w.host));

      orphanedWebsitesHosts[0] && await deleteWebsites(orphanedWebsitesHosts);

      const remainingReports = pendings
        .filter(r => !orphanedWebsitesHosts.includes(r.websiteHost));

      if (remainingReports[0]) {
        const query = {
          where: { id: { in: remainingReports.map(r => r.id) } }
        };
        await ReportDbModel.updateMany({ ...query, data: { deleted: true } })
          .catch(err => {
            throw new Error(`Failed to delete report(s): ${err.toString()}`);
          });

        // slightly delay effective deletion for subscription
        setTimeout(
          () => ReportDbModel.deleteMany(query).catch(() => {}),
          5000
        );

        remainingReports.forEach(report => pubSub.publish(
          "website",
          { operation: "UPDATE", primaryKey: report.websiteHost }
        ));
      }

      pendings.forEach(report => pubSub.publish(
        "report",
        { operation: "DELETE", primaryKey: report.id }
      ));

      return { ok: true, message: `${ids.length} report(s) deleted` };
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
      { operation, primaryKey },
      _args,
      context,
      info
    ) => {
      // slightly delay subscription to let enough time for mutation return
      await new Promise(res => setTimeout(res, 500));

      const data = await ReportDbModel.findUnique({
        ...queryFromInfo({ context, info, path: ["data"] }),
        where: { id: primaryKey }
      });

      return { operation, data };
    }
  })
);
