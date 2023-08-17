import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLScalarType,
  Kind,
  GraphQLEnumType
} from "graphql";
import { getNonNullFields } from "./helpers.js";

export const OperationResult = new GraphQLObjectType({
  name: "OperationResult",
  fields: getNonNullFields({
    ok: { type: GraphQLBoolean },
    message: { type: GraphQLString }
  })
});

export const PageInput = new GraphQLInputObjectType({
  name: "PageInput",
  fields: {
    current: {
      type: new GraphQLNonNull(GraphQLInt),
      description: "Starts at 1"
    },
    size: { type: GraphQLInt, defaultValue: 10, description: "Starts at 1" }
  }
});

export const getPaginatedType = (name, gqlType) =>
  new GraphQLObjectType({
    name,
    fields: getNonNullFields({
      totalCount: { type: GraphQLInt },
      entries: { type: new GraphQLList(gqlType) }
    })
  });

const SubscriptionOperation = new GraphQLEnumType({
  name: "SubscriptionOperation",
  values: { CREATE: {}, UPDATE: {}, DELETE: {} }
});

export const getSubscriptionType = (name, gqlType) =>
  new GraphQLObjectType({
    name,
    fields: getNonNullFields({
      operation: { type: SubscriptionOperation },
      data: { type: gqlType }
    })
  });

// src: https://www.apollographql.com/docs/apollo-server/schema/custom-scalars/#example-the-date-scalar
export const GraphQLDateTime = new GraphQLScalarType({
  name: "DateTime",
  description:
    "The `DateTime` scalar type represents a date and a time in UNIX timestamp format",
  serialize(value) {
    if (value instanceof Date) {
      return value.getTime(); // Convert outgoing Date to integer for JSON
    }
    throw Error("GraphQL DateTime Scalar serializer expected a `Date` object");
  },
  parseValue(value) {
    if (typeof value === "number") {
      return new Date(value); // Convert incoming integer to Date
    }
    throw new Error("GraphQL DateTime Scalar parser expected a `number`");
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      // Convert hard-coded AST string to integer and then to Date
      return new Date(parseInt(ast.value, 10));
    }
    // Invalid hard-coded value (not an integer)
    return null;
  }
});

export const [DateTimeRangeInput, IntRangeInput, FloatRangeInput] = [
  { name: "DateTime", type: GraphQLDateTime },
  { name: "Int", type: GraphQLInt },
  { name: "Float", type: GraphQLFloat }
].map(
  ({ name, type }) =>
    new GraphQLInputObjectType({
      name: `${name}RangeInput`,
      fields: { start: { type }, end: { type } }
    })
);

export const getEnumListType = (name, values) =>
  new GraphQLList(
    new GraphQLNonNull(
      new GraphQLEnumType({
        name: `${name}List`,
        values: values.reduce((acc, v) => ({ ...acc, [v]: {} }), {})
      })
    )
  );
