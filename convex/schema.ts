import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  unknownCars: defineTable({ 
    carPlate: v.string() 
  }).index("by_carPlate", ["carPlate"]),

  knownCars: defineTable({
    carModel: v.string(),
    carPlate: v.string(),
    totalEntries: v.string(),
  }).index("by_carPlate", ["carPlate"]),

  logs: defineTable({
    carPlate: v.string(),
    isKnown: v.boolean(),
    fileTitle: v.string(),
  }),

  summary: defineTable({
    location: v.string(),
    mostEntries: v.object({}),
    parkingCapacity: v.string(),
    parkingFill: v.string(),
  }),

  users: defineTable({
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    license: v.optional(v.string()),
    plateNumber: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("plateNumber", ["plateNumber"]),
});