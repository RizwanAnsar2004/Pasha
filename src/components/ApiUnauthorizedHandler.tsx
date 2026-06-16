"use client";

import { useEffect } from "react";
import {
  type AuthRealm,
  logoutOnUnauthorized,
  requestMethod,
  requestUrl,
  shouldLogoutOn401,
} from "@/lib/api-unauthorized";

let loggingOut = false;

/**
 * Intercepts `fetch` in authenticated shells. On API 401 (session expired or
 * invalid), signs the user out and sends them to the portal login page.
 */
export function ApiUnauthorizedHandler({ realm }: { realm: AuthRealm }) {
  useEffect(() => {
    const original = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const res = await original(input, init);
      if (res.status === 401 && !loggingOut) {
        const url = requestUrl(input);
        const method = requestMethod(init, input);
        if (shouldLogoutOn401(url, method)) {
          loggingOut = true;
          await logoutOnUnauthorized(realm);
        }
      }
      return res;
    };

    return () => {
      window.fetch = original;
    };
  }, [realm]);

  return null;
}
