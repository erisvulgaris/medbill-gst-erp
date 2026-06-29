"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { visibleNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function MobileBottomNav() {
  const { view, openView, business } = useAppStore();
  const items = React.useMemo(() => visibleNavItems(business?.modules).filter((i) => i.mobile).slice(0, 5), [business?.modules]);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/60 pb-safe"
      data-testid="mobile-bottom-nav"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => openView(item.key)}
              data-testid={`mnav-${item.key}`}
              className="relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors"
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={cn("w-[21px] h-[21px] transition-colors", active ? "text-primary" : "text-muted-foreground")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn("truncate max-w-full px-1", active ? "text-primary" : "text-muted-foreground")}>
                {item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
