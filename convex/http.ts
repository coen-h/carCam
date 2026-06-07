import { api } from "@/convex/_generated/api";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/uplink",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const data = await request.json();

    try {
      await ctx.runMutation(api.function.addLog, {
        carPlate: data.carPlate,
        fileTitle: data.fileTitle,
      });

      return new Response("OK", { status: 200 });
    } catch (e) {
      console.error("Mutation failed:", e);
      return new Response("Internal Error", { status: 500 });
    }
  }),
});

export default http;
