import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/users(.*)",
  "/signup(.*)",
  "/cars(.*)",
  "/home(.*)",
  "/",
]);

const isAdminOrTeacherRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/users(.*)",
  "/cars(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated();

  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  if (isAuthenticated) {
    const token = await convexAuth.getToken();

    try {
      const user = await fetchQuery(
        api.function.getUser,
        {},
        { token }
      );

      const role = user?.role;

      if (request.nextUrl.pathname === "/login") {
        if (role === "admin" || role === "teacher") {
          return nextjsMiddlewareRedirect(request, "/dashboard");
        } else {
          return nextjsMiddlewareRedirect(request, "/home");
        }
      }
      
      if (role === "student" && isAdminOrTeacherRoute(request)) {
        return nextjsMiddlewareRedirect(request, "/home");
      }

    } catch (error) {
      console.error("Failed to fetch user in middleware:", error);
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};