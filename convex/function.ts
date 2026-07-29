import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllVehicles = query({
  handler: async (ctx) => {
    const [known, unknown] = await Promise.all([
      ctx.db.query("knownCars").collect(),
      ctx.db.query("unknownCars").collect(),
    ]);

    return [
      ...known.map((vehicle) => ({
        ...vehicle,
        type: "known" as const,
      })),
      ...unknown.map((vehicle) => ({
        ...vehicle,
        type: "unknown" as const,
      })),
    ];
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "student"))
      .order("desc")
      .collect(); 
  }
});

export const getAllAlerts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("alerts")
      .order("desc")
      .collect();
  }
})

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

export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
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
      isParked: false,
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

export const getLogsForToday = query({
  args: {
    startOfDay: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("logs")
      .withIndex("by_creation_time", (q) => 
        q.gte("_creationTime", args.startOfDay)
      )
      .collect(); 
  }
});

export const addLog = mutation({
  args: {
    carPlate: v.string(),
    fileTitle: v.string(),
    direction: v.string(),
  },
  handler: async (ctx, args) => {
    const isParking = args.direction === "in";

    const now = new Date();
    const nzDateStr = now.toLocaleString("en-US", { timeZone: "Pacific/Auckland" });
    const nzDate = new Date(nzDateStr);
    
    const currentHour = nzDate.getHours();
    const currentMinute = nzDate.getMinutes();
    const currentDay = nzDate.getDay();
    const isSchoolDay = currentDay >= 1 && currentDay <= 5;

    if (!isParking && isSchoolDay) {
      const isAfterNine = currentHour > 9 || (currentHour === 9 && currentMinute >= 0);
      const isBeforeThreeTen = currentHour < 15 || (currentHour === 15 && currentMinute <= 10);
      
      if (isAfterNine && isBeforeThreeTen) {
        await ctx.db.insert("alerts", {
          carPlate: args.carPlate,
          type: "School Hours Departure",
          severity: "3"
        });
      }
    }
    
    const checkKnown = await ctx.db
      .query("knownCars")
      .withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate))
      .first();

    const isKnown = checkKnown !== null;

    if (isKnown) {
      await ctx.db.patch(checkKnown._id, { isParked: isParking });
    } else {
      const existingUnknown = await ctx.db
        .query("unknownCars")
        .withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate))
        .first();

      if (existingUnknown !== null) {
        await ctx.db.patch(existingUnknown._id, { isParked: isParking });
        } else {
          await ctx.db.insert("unknownCars", { 
          carPlate: args.carPlate, 
          carModel: 'Unknown',
          isParked: isParking
        });
      }
      
      if (isParking && isSchoolDay) {
        const monday = new Date(nzDate);
        monday.setDate(monday.getDate() - (currentDay - 1));
        monday.setHours(0, 0, 0, 0);
        
        const offset = nzDate.getTime() - now.getTime();
        const startOfWeekUTC = monday.getTime() - offset;

        const weeklyLogs = await ctx.db
          .query("logs")
          .withIndex("by_carPlate", (q) => q.eq("carPlate", args.carPlate))
          .filter((q) => q.gte(q.field("_creationTime"), startOfWeekUTC))
          .collect();

        const entryCountThisWeek = weeklyLogs.filter(log => log.direction === "in").length;

        if (entryCountThisWeek === 2) {
          await ctx.db.insert("alerts", {
            carPlate: args.carPlate,
            type: "Frequent Unknown Vehicle",
            severity: "2"
          });
        }
      }
    }

    const logId = await ctx.db.insert("logs", {
      carPlate: args.carPlate,
      fileTitle: args.fileTitle,
      direction: args.direction,
    });

    return { logId, isKnown };
  },
});

export const addUnknown = mutation({
  args: {
    carPlate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("unknownCars", { carPlate: args.carPlate, carModel: 'Unknown', isParked: false });
  },
});

export const getCurrentCapacity = query({
  handler: async (ctx) => {
    const parkedKnown = await ctx.db
      .query("knownCars")
      .filter((q) => q.eq(q.field("isParked"), true))
      .collect();
      
    const parkedUnknown = await ctx.db
      .query("unknownCars")
      .filter((q) => q.eq(q.field("isParked"), true))
      .collect();

    const currentFill = parkedKnown.length + parkedUnknown.length;
    
    const summaryData = await ctx.db.query("summary").first();
    const maxCapacity = summaryData?.parkingCapacity ?? 0;

    return {
      fill: currentFill,
      capacity: maxCapacity,
      available: Math.max(0, maxCapacity - currentFill)
    };
  }
});

export const clearAlert = mutation({
  args: {
    alertId: v.id("alerts"),
    resolvedMsg: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const staffUser = await ctx.db.get(userId);
    const staffIdentifier = staffUser?._id || "Unknown Staff";

    await ctx.db.patch(args.alertId, {
      resolvedStaff: staffIdentifier,
      resolvedMsg: args.resolvedMsg ?? "Alert cleared.",
    });

    return { success: true };
  },
});