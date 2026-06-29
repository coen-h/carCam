import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  unknownCars: defineTable({ 
    carPlate: v.string(),
    totalEntries: v.optional(v.string()),
  }).index("by_carPlate", ["carPlate"]),

  knownCars: defineTable({
    carModel: v.string(),
    carPlate: v.string(),
    carYear: v.string(),
    totalEntries: v.string(),
  }).index("by_carPlate", ["carPlate"]),

  logs: defineTable({
    carPlate: v.string(),
    fileTitle: v.string(),
  }).index("by_carPlate", ["carPlate"]),

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
    userLicense: v.optional(v.string()),
    carPlate: v.optional(v.string()),
    userYearLevel: v.optional(v.string()),
    role: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("carPlate", ["carPlate"]),

  alerts: defineTable({
    carPlate: v.string(),
    type: v.string(),
    severity: v.string(),
  })
});