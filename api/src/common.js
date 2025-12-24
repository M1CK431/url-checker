import schemaBuilder from "./schemaBuilder.js";

export const OperationResult = schemaBuilder.objectType("OperationResult", {
  fields: t => ({
    ok: t.boolean({ nullable: false }),
    message: t.string({ nullable: false })
  })
});

export const PageInput = schemaBuilder.inputType("PageInput", {
  description: "If not provided, all entries will be returned",
  fields: t => ({
    current: t.int({ required: true, description: "Starts at 1" }),
    size: t.int({ defaultValue: 10 })
  })
});

export const getPaginatedType = (name, gqlType) =>
  schemaBuilder.objectType(name, {
    fields: t => ({
      totalCount: t.int({ nullable: false }),
      entries: t.field({ type: [gqlType], nullable: false })
    })
  });

const SubscriptionOperation = schemaBuilder.enumType("SubscriptionOperation", {
  values: ["CREATE", "UPDATE", "DELETE"]
});

export const getSubscriptionType = (name, gqlType) =>
  schemaBuilder.objectType(name, {
    fields: t => ({
      operation: t.field({ type: SubscriptionOperation, nullable: false }),
      data: t.field({ type: gqlType, nullable: false })
    })
  });
