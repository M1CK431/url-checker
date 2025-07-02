import { queryFromInfo } from "@pothos/plugin-prisma";
import schemaBuilder from "#src/schemaBuilder.js";
import Model from "#src/Model.js";
import { getPaginatedType, PageInput } from "#src/common.js";
import { getValidatedPage, checkAllowedDomains } from "#src/helpers.js";
import { checkURLSync } from "#src/checkUrl.js";

const gqlOverrides = {
  url: { type: "URL" },
  redirectUrl: { type: "URL" },
  size: { description: "unit: bytes" },
  duration: { description: "unit: second" }
};

export const {
  CheckResultDbModel,
  CheckResultGqlType,
  CheckResultGqlFiltersType,
  CheckResultGqlSortType,
  CheckResultDbFields
} = new Model("CheckResult", { gqlOverrides });

const checkResultsPaginatedType =
  getPaginatedType("CheckResults", CheckResultGqlType);

export const getCheckResultsField = t => t.field({
  type: checkResultsPaginatedType,
  args: {
    filters: t.arg({ type: CheckResultGqlFiltersType }),
    sort: t.arg({ type: CheckResultGqlSortType }),
    page: t.arg({
      type: PageInput,
      description: "If not provided, all entries will be returned"
    })
  },
  resolve: async (parent, { filters, sort, page }, context, info) => {
    const { current, size } = getValidatedPage(page);
    const { by, order } = sort ?? {};

    parent && (filters = { ...filters, reportId: parent.id });

    const commonQueryOpts = {
      ...filters && { where: filters },
      ...sort && { orderBy: [{ [by]: order }] }
    };

    const [totalCount, entries] = await Promise.all([
      CheckResultDbModel.count(commonQueryOpts),
      CheckResultDbModel.findMany({
        ...commonQueryOpts,
        ...queryFromInfo({ context, info, path: ["entries"] }),
        ...page && { skip: (current - 1) * size, take: size }
      })
    ]).catch(err => { throw err; });

    return { totalCount, entries };
  }
});

schemaBuilder.queryField("checkResults", getCheckResultsField);

const { RATE_LIMIT_MS = 1000 } = process.env;
let lastCheckUrl = 0;
const checkRateLimit = () => {
  const now = Date.now();

  if (lastCheckUrl > now - RATE_LIMIT_MS) {
    throw new Error("Rate limit reached, please try again later.");
  }

  lastCheckUrl = now;
};

schemaBuilder.mutationField(
  "checkUrl",
  t => t.field({
    type: schemaBuilder.objectType(
      "CheckUrlResult",
      {
        fields: t => CheckResultDbFields.reduce(
          (acc, { name, type }) =>
            ["id", "reportId", "report"].includes(name)
              ? acc
              : (acc[name] = t.field({ type, ...gqlOverrides[name] }), acc),
          {}
        )
      }
    ),
    args: { url: t.arg({ type: "URL", required: true }) },
    resolve: (_parent, { url }) =>
      (checkRateLimit(), checkAllowedDomains(url), checkURLSync(url.href))
  })
);
