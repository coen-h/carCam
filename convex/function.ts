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

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (userId === null) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

export const getUserForPlate = query({
  args: {
    carPlate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("carPlate", (q) => q.eq("carPlate", args.carPlate))
      .first();

    return user;
  },
});

export const getVehicleFromPlate = query({
  args: {
    carPlate: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db
      .query("knownCars")
      .withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate))
      .first();
      
    return vehicle;
  }
});

export const getLogsForPlate = query({
  args: {
    carPlate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("logs").withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate)).collect();
  }
});

export const updateUser = mutation({
  args: {
    userLicense: v.string(),
    userYearLevel: v.string(),
    carPlate: v.string(),
    carModel: v.string(),
    carYear: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, {
      userYearLevel: args.userYearLevel,
      userLicense: args.userLicense,
      carPlate: args.carPlate,
      role: args.role,
    });

    await ctx.db.insert("knownCars", {
      carPlate: args.carPlate,
      carModel: args.carModel,
      carYear: args.carYear,
      totalEntries: '0'
    });

    return await ctx.db.get(userId);
  }
})

export const getAllLogs = query({
  handler: async (ctx) => {
    return await ctx.db.query("logs").collect(); 
  }
});

export const addLog = mutation({
  args: {
    carPlate: v.string(),
    fileTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const checkKnown = await ctx.db
      .query("knownCars")
      .withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate))
      .first();

    const isKnown = checkKnown !== null;

    if (!isKnown) {
      const existingUnknown = await ctx.db
        .query("unknownCars")
        .withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate))
        .first();

      if (existingUnknown === null) {
        await ctx.db.insert("unknownCars", { carPlate: args.carPlate });
      }
    }

    const logId = await ctx.db.insert("logs", {
      carPlate: args.carPlate,
      fileTitle: args.fileTitle,
    });

    return { logId, isKnown };
  },
});

export const addUnknown = mutation({
  args: {
    carPlate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("unknownCars", { carPlate: args.carPlate });
  },
});