import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  unknownCars: defineTable({ 
    carPlate: v.string() 
  }),

  knownCars: defineTable({
    carModel: v.string(),
    carPlate: v.string(),
    driverLicense: v.string(),
    driverName: v.string(),
    totalEntries: v.string(),
  }),

  logs: defineTable({
    carPlate: v.string(),
    isKnown: v.boolean(),
  }),

  summary: defineTable({
    location: v.string(),
    mostEntries: v.object({}),
    parkingCapacity: v.string(),
    parkingFill: v.string(),
  }),
});