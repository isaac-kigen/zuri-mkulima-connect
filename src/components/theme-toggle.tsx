"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className="min-w-24"
    >
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </Button>
  );
}
