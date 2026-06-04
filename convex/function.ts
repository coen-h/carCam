import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllKnown = query({
  handler: async (ctx) => {
    return await ctx.db.query("knownCars").collect();
  },
});

export const getAllUnknown = query({
  handler: async (ctx) => {
    return await ctx.db.query("unknownCars").collect(); 
  }
});