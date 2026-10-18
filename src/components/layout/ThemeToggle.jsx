"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme } from "@/features/ui/uiSlice";
import { Button } from "@/components/ui/Button";

const order = ["light", "dark", "system"];
const icons = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const Icon = icons[theme];

  const next = () => {
    const idx = order.indexOf(theme);
    const nextTheme = order[(idx + 1) % order.length] ?? "system";
    dispatch(setTheme(nextTheme));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={next}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}