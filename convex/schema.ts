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
    driverLicense: v.string(),
    driverName: v.string(),
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
});