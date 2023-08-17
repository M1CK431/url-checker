import { Op } from "sequelize";
import { GraphQLString, GraphQLError } from "graphql";
import { parse, simplify } from "graphql-parse-resolve-info";
import Model from "./Model.js";
import { ReportDbModel, ReportGqlType } from "./reports.js";
import { PageInput, getPaginatedType } from "./common.js";
import {
  getNonNullFields,
  checkAllowedDomains,
  getValidatedPage
} from "./helpers.js";
import { checkURLSync } from "./checkUrl.js";

export const {
  CheckResultDbModel,
  CheckResultGqlType,
  CheckResultGqlFiltersType,
  CheckResultDbFilters,
  CheckResultGqlSortType,
  CheckResultDbSort
} = new Model("CheckResult", {
  url: { type: "string", length: 2083, primaryKey: true },
  report: {
    gqlOnly: true,
    // type is a closure function to handle mutual gql type dependency
    type: () => ReportGqlType,
    resolve: (parent, _args, _ctx, info) => {
      const { fields } = simplify(parse(info), ReportGqlType);
      if (fields.website) fields.WebsiteHost = {}; // used by website field resolver
      delete fields.website;
      delete fields.checkResults;

      return ReportDbModel.findByPk(parent.ReportId, {
        attributes: Object.keys(fields)
      });
    }
  },
  createdAt: { type: "date", nullable: false },
  updatedAt: { type: "date", nullable: false },
  responseCode: { type: "int" },
  redirectUrl: { type: "string", length: 2083 },
  size: { type: "int", description: "unit: bytes", defaultValue: 0 },
  duration: { type: "float", description: "unit: second", defaultValue: 0 },
  status: {
    type: "enum",
    name: "CheckResultStatus",
    values: ["PROCESSING", "ERROR", "DONE"],
    defaultValue: "PROCESSING"
  },
  errorReason: { type: "string" }
});

export const CheckResultsGqlType = getPaginatedType(
  "CheckResults",
  CheckResultGqlType
);

export const checkResultsArgs = {
  search: {
    type: GraphQLString,
    description:
      "Case insensitive search by url, ignored if filters.url argument is used"
  },
  filters: { type: CheckResultGqlFiltersType },
  sort: { type: CheckResultGqlSortType },
  page: {
    type: PageInput,
    description: "If not provided, all entries will be returned"
  }
};

export const checkResultsResolver = async (
  parent,
  { search, page, filters, sort },
  _ctx,
  info
) => {
  const { current, size } = getValidatedPage(page);

  const { fields } = simplify(
    parse(info)?.fieldsByTypeName.CheckResults.entries ?? {
      fieldsByTypeName: {}
    },
    CheckResultGqlType
  );
  fields.url ||= {}; // always includes primary key in fields

  if (fields.report) fields.ReportId = {}; // used by report field resolver
  delete fields.report;

  const { count, rows } = await CheckResultDbModel.findAndCountAll({
    attributes: Object.keys(fields),
    where: {
      ...(parent && { reportId: parent.id }),
      ...(search && { url: { [Op.substring]: search } }),
      ...(filters && CheckResultDbFilters(filters))
    },
    ...(sort && { order: CheckResultDbSort(sort) }),
    ...(page && { offset: (current - 1) * size, limit: size })
  });

  return { totalCount: count, entries: rows };
};

export const queries = {
  checkResults: {
    type: CheckResultsGqlType,
    args: checkResultsArgs,
    resolve: checkResultsResolver
  }
};

const { RATE_LIMIT_MS = 1000 } = process.env;
let lastCheckUrl = 0;
const checkRateLimit = () => {
  const now = Date.now();

  if (lastCheckUrl > now - RATE_LIMIT_MS) {
    throw new GraphQLError("Rate limit reached, please try again later.");
  }

  lastCheckUrl = now;
};

export const mutations = {
  checkUrl: {
    type: CheckResultGqlType,
    args: getNonNullFields({ url: { type: GraphQLString } }),
    resolve: (_parent, { url }) => (
      checkRateLimit(), checkAllowedDomains(url), checkURLSync(url)
    )
  }
};
