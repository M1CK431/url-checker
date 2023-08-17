import { DataTypes, Op } from "sequelize";
import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLFloat
} from "graphql";
import { db } from "./db.js";
import {
  GraphQLDateTime,
  DateTimeRangeInput,
  IntRangeInput,
  FloatRangeInput,
  getEnumListType
} from "./common.js";
import { getNonNullFields } from "./helpers.js";

const fnFallback = fn => (typeof fn === "function" ? fn() : fn);

const dbCommon = ({ primaryKey, nullable, defaultValue, description }) => ({
  ...(primaryKey && { primaryKey }),
  ...(nullable !== undefined && { allowNull: nullable }),
  ...(defaultValue !== undefined && { defaultValue }),
  ...(description !== undefined && { comment: description })
});

const gqlCommon = ({
  type,
  primaryKey,
  defaultValue,
  nullable = primaryKey || defaultValue === undefined,
  description
}) => ({ type: nullable ? type : new GraphQLNonNull(type), description });

const Order = new GraphQLEnumType({
  name: "Order",
  values: { ASC: {}, DESC: {} }
});

const types = {
  id: {
    db: () => ({
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }),
    gql: () => ({ type: new GraphQLNonNull(GraphQLID) })
  },
  string: {
    db: ({ length, ...rest }) => ({
      type: length ? DataTypes.STRING(length) : DataTypes.STRING,
      ...dbCommon(rest)
    }),
    gql: field => gqlCommon({ type: GraphQLString, ...field }),
    gqlFilter: () => ({ type: GraphQLString }),
    dbFilter: str => str
  },
  int: {
    db: field => ({ type: DataTypes.INTEGER, ...dbCommon(field) }),
    gql: field => gqlCommon({ type: GraphQLInt, ...field }),
    gqlFilter: () => ({ type: IntRangeInput }),
    dbFilter: ({ start, end }) => ({
      ...(Number.isFinite(start) && { [Op.gte]: start }),
      ...(Number.isFinite(end) && { [Op.lte]: end })
    })
  },
  float: {
    db: field => ({ type: DataTypes.FLOAT, ...dbCommon(field) }),
    gql: field => gqlCommon({ type: GraphQLFloat, ...field }),
    gqlFilter: () => ({ type: FloatRangeInput }),
    dbFilter: ({ start, end }) => ({
      ...(Number.isFinite(start) && { [Op.gte]: start }),
      ...(Number.isFinite(end) && { [Op.lte]: end })
    })
  },
  date: {
    db: field => ({ type: DataTypes.DATE, ...dbCommon(field) }),
    gql: field => gqlCommon({ type: GraphQLDateTime, ...field }),
    gqlFilter: () => ({ type: DateTimeRangeInput }),
    dbFilter: ({ start, end }) => ({
      ...(start && { [Op.gte]: start }),
      ...(end && { [Op.lte]: end })
    })
  },
  enum: {
    db: ({ values, ...rest }) => ({
      type: DataTypes.ENUM(values),
      ...dbCommon(rest)
    }),
    gql: ({ name, values, ...rest }) =>
      gqlCommon({
        type: new GraphQLEnumType({
          name,
          values: values.reduce((acc, v) => ({ ...acc, [v]: {} }), {})
        }),
        ...rest
      }),
    gqlFilter: ({ name, values }) => ({ type: getEnumListType(name, values) }),
    dbFilter: values => values
  }
};

function Model(name, fields) {
  Object.assign(this, {
    [`${name}DbModel`]: db.define(
      name,
      Object.entries(fields).reduce(
        (acc, [k, { type, gqlOnly, ...rest }]) =>
          gqlOnly || ["createdAt", "updatedAt"].includes(k)
            ? acc
            : {
                ...acc,
                [k]: types[type]?.db(rest) ?? { type, ...rest }
              },
        {}
      )
    ),

    [`${name}GqlType`]: new GraphQLObjectType({
      name,
      fields: () =>
        Object.entries(fields).reduce(
          (acc, [k, { type, args, dbOnly, ...rest }]) =>
            dbOnly
              ? acc
              : {
                  ...acc,
                  [k]: types[type]?.gql(rest) ?? {
                    // custom type may be a closure function to handle mutual gql type dependency
                    type: fnFallback(type),
                    // args may be a closure function if shared in a mutual gql dependency
                    args: fnFallback(args),
                    ...rest
                  }
                },
          {}
        )
    }),

    [`${name}GqlFiltersType`]: new GraphQLInputObjectType({
      name: `${name}Filters`,
      fields: () =>
        Object.entries(fields).reduce(
          (acc, [k, { type, name, ...rest }]) =>
            ["id", "errorReason"].includes(k) || !types[type]
              ? acc
              : {
                  ...acc,
                  [k]: types[type].gqlFilter({ name: `${name}Filter`, ...rest })
                },
          {}
        )
    }),

    [`${name}DbFilters`]: filters =>
      Object.entries(filters).reduce(
        (acc, [k, v]) =>
          [undefined, null].includes(v)
            ? acc
            : { ...acc, [k]: types[fields[k].type].dbFilter(v) },
        {}
      ),

    [`${name}GqlSortType`]: new GraphQLInputObjectType({
      name: `${name}Sort`,
      fields: () =>
        getNonNullFields({
          by: {
            type: new GraphQLEnumType({
              name: `${name}SortFields`,
              values: Object.entries(fields).reduce(
                (acc, [k, { gqlOnly }]) =>
                  gqlOnly ? acc : { ...acc, [k]: {} },
                {}
              )
            })
          },
          order: { type: Order }
        })
    }),

    [`${name}DbSort`]: ({ by, order }) => [[by, order]]
  });
}

export default Model;
