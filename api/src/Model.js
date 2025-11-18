import { models, enums } from "./generated/prisma/dmmf.js";
import schemaBuilder from "./schemaBuilder.js";
import db from "./db.js";

const Order = schemaBuilder.enumType("Order", { values: ["asc", "desc"] });

const lowerFirst = str => str.charAt(0).toLowerCase() + str.slice(1);

const prismaOps = {
  String: ["contains", "startsWith", "endsWith", "equals"],
  Int: ["equals", "gt", "gte", "lt", "lte"],
  Float: ["equals", "gt", "gte", "lt", "lte"],
  Boolean: ["equals"],
  DateTime: ["equals", "gt", "gte", "lt", "lte"]
};

for (const type in prismaOps) {
  schemaBuilder.inputType(`${type}FilterInput`, {
    fields: t =>
      prismaOps[type].reduce(
        (acc, op) => (acc[op] = t.field({ type }), acc),
        {}
      )
  });
}

enums.forEach(({ name, values }) => {
  schemaBuilder.enumType(name, { values: values.map(({ name }) => name) });

  schemaBuilder.inputType(`${name}FilterInput`, {
    fields: t => ({
      ...["equals", "not"].reduce(
        (acc, op) => (acc[op] = t.field({ type: name }), acc),
        {}
      ),
      ...["in", "notIn"].reduce(
        (acc, op) => (acc[op] = t.field({ type: [name] }), acc),
        {}
      )
    })
  });
});

function Model(name, { gqlOverrides = {}, additionalFields = () => {} } = {}) {
  const { fields } = models.find(m => m.name === name);
  const foreignKeys = fields.flatMap(f => f.relationFields ?? []);

  Object.assign(this, {
    [`${name}DbFields`]: fields,

    [`${name}DbModel`]: db[lowerFirst(name)],

    [`${name}GqlType`]: schemaBuilder.prismaObject(name, {
      fields: t => ({
        ...fields.reduce((acc, { name, type, isId, relationName }) => {
          if (foreignKeys.includes(name)) return acc;

          acc[name] = relationName
            ? t.relation(name)
            : t.expose(name, { type: isId ? "ID" : type, ...gqlOverrides[name] });

          return acc;
        }, {}),
        ...additionalFields(t)
      })
    }),

    [`${name}GqlFiltersType`]: schemaBuilder.inputType(`${name}FiltersInput`, {
      fields: t => fields.reduce((acc, { kind, name, type }) => {
        if (["scalar", "enum"].includes(kind))
          acc[name] = t.field({ type: `${type}FilterInput` });

        return acc;
      }, {})
    }),

    [`${name}GqlSortType`]: schemaBuilder.inputType(`${name}SortInput`, {
      fields: t => ({
        by: t.field({
          type: schemaBuilder.enumType(
            `${name}SortBy`,
            {
              values: fields.reduce((acc, { kind, name }) => {
                if (!["scalar", "enum"].includes(kind)) return acc;
                return acc.push(name), acc;
              }, [])
            }
          )
        }),
        order: t.field({ type: Order })
      })
    }),

    [`${name}DbSort`]: ({ by, order }) => [{ [by]: order }]
  });
}

export default Model;
