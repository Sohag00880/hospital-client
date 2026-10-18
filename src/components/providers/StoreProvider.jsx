"use client";

import { useEffect, useRef } from "react";
import { setupListeners } from "@reduxjs/toolkit/query";
import { Provider } from "react-redux";
import { makeStore } from "@/store";

export function StoreProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  useEffect(() => setupListeners(storeRef.current.dispatch), []);
  return <Provider store={storeRef.current}>{children}</Provider>;
}
