import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
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

export const getAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect(); 
  }
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (userId === null) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});