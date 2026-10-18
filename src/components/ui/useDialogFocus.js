"use client";
import { useEffect, useRef } from "react";
const dialogs = [];
let overflow = "";
export function useDialogFocus(open, onClose) {
  const ref = useRef(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const panel = ref.current, previous = document.activeElement;
    if (!dialogs.length) { overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    dialogs.push(panel);
    const controls = () => [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter((e) => e.tabIndex >= 0 && e.getClientRects().length);
    const preferred = [...panel.querySelectorAll("[data-autofocus]")].find((element) => !element.disabled && element.getClientRects().length);
    (preferred || controls()[0] || panel).focus();
    const keydown = (event) => {
      if (dialogs.at(-1) !== panel) return;
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "Tab") {
        const items = controls(), first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); panel.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown); const index = dialogs.indexOf(panel); if (index !== -1) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
