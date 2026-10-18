"use client";

import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials, clearCredentials } from "@/features/auth/authSlice";
import { publicEnv } from "@/lib/env";

/**
 * Module-level promise that survives React Strict Mode remounts.
 * Ensures exactly one refresh call per page load, even under
 * double-mounting (dev), Suspense retries, or HMR.
 */
let bootstrapPromise = null;

function runBootstrap() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const res = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json?.success && json.data?.accessToken && json.data?.user) {
      return json.data;
    }
    return null;
  })().catch(() => null);

  return bootstrapPromise;
}

export function SessionBootstrap({ children }) {
  const store = useStore();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const startedRef = useRef(false);

  useEffect(() => {
    if (status !== "idle") return;
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const data = await runBootstrap();
      // A login can complete before the initial refresh. Ignore that stale
      // bootstrap result once another action has established session state.
      if (store.getState().auth.status !== "idle") return;
      if (data) {
        dispatch(
          setCredentials({
            user: data.user,
            accessToken: data.accessToken,
            roles: data.roles ?? [],
            permissions: data.permissions ?? [],
            isPlatformAdmin: data.isPlatformAdmin ?? false,
            mustChangePassword: false,
          }),
        );
      } else {
        dispatch(clearCredentials());
      }
    })();
  }, [status, dispatch, store]);

  return <>{children}</>;
}
