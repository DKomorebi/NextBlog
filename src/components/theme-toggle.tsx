"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Sun, Moon } from "lucide-react";
import { THEME_KEY, LIGHT_THEME, DARK_THEME } from "@/lib/theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false),
    [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = (theme: string) => {
      document.documentElement.dataset.theme = theme;
      setDark(theme === DARK_THEME);
    };
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch {}
      apply(
        saved === LIGHT_THEME || saved === DARK_THEME
          ? saved
          : media.matches
            ? DARK_THEME
            : LIGHT_THEME,
      );
    };
    sync();
    media.addEventListener("change", sync);
    const storage = (e: StorageEvent) => {
      if (e.key === THEME_KEY || e.key === null) sync();
    };
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (inFlight.current) return;
    const root = document.documentElement;
    const next = root.dataset.theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    const apply = () => {
      root.dataset.theme = next;
      setDark(next === DARK_THEME);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
    };
    if (
      !document.startViewTransition ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      apply();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
    const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
    const radius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );
    inFlight.current = true;
    setBusy(true);
    try {
      const transition = document.startViewTransition(apply);
      // 页面隐藏或其他过渡抢占时 finished 也可能拒绝，及时处理。
      const finished = transition.finished.catch(() => {});
      await transition.ready;
      await root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 580,
          easing: "cubic-bezier(.4,0,.2,1)",
          pseudoElement: "::view-transition-new(root)",
        },
      ).finished;
      await finished;
    } catch {
      apply();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      className="btn btn-ghost btn-circle theme-toggle"
      aria-label={dark ? "切换浅色主题" : "切换深色主题"}
      aria-pressed={dark}
      disabled={busy}
      onClick={toggle}
    >
      {dark ? (
        <Sun size={20} aria-hidden="true" />
      ) : (
        <Moon size={20} aria-hidden="true" />
      )}
    </button>
  );
}
