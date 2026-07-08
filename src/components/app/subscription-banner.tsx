"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Clock, AlertTriangle, X } from "lucide-react";

interface SubscriptionData {
  subscription: {
    status: string;
    endDate: string;
    trialEndsAt: string | null;
    daysRemaining: number;
    trialDaysRemaining: number | null;
  } | null;
  plan: {
    displayName: string;
    priceYearly: number;
  } | null;
}

export function SubscriptionBanner() {
  const [data, setData] = React.useState<SubscriptionData | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    api("/api/subscription").then(setData).catch(() => {});
  }, []);

  if (!data || !data.subscription || dismissed) return null;

  const { subscription, plan } = data;
  const isTrial = subscription.status === "trial";
  const isExpired = subscription.status === "expired";
  const isGrace = subscription.status === "grace";
  const isSuspended = subscription.status === "suspended";
  const daysLeft = isTrial ? subscription.trialDaysRemaining ?? 0 : subscription.daysRemaining;

  // Only show banner for trial (≤7 days left), expired, grace, or suspended
  if (subscription.status === "active" && daysLeft > 7) return null;

  let config: { bg: string; icon: any; title: string; desc: string } | null = null;

  if (isTrial && daysLeft <= 7) {
    config = {
      bg: "bg-blue-500/10 border-blue-500/20",
      icon: Clock,
      title: `Trial ending in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      desc: `Upgrade to ${plan?.displayName || "a paid plan"} to keep all features after your trial ends.`,
    };
  } else if (isTrial && daysLeft <= 0) {
    config = {
      bg: "bg-amber-500/10 border-amber-500/20",
      icon: AlertTriangle,
      title: "Trial expired",
      desc: "Upgrade now to continue using MedBill.",
    };
  } else if (isExpired || isGrace) {
    config = {
      bg: "bg-amber-500/10 border-amber-500/20",
      icon: AlertTriangle,
      title: isGrace ? "Grace period active" : "Subscription expired",
      desc: isGrace ? "Your subscription has expired. You have limited time to renew." : "Renew your subscription to restore full access.",
    };
  } else if (isSuspended) {
    config = {
      bg: "bg-red-500/10 border-red-500/20",
      icon: AlertTriangle,
      title: "Account suspended",
      desc: "Contact admin to reactivate your subscription.",
    };
  }

  if (!config) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn("border-b px-4 py-2.5 flex items-center gap-3", config.bg)}
        data-testid="subscription-banner"
      >
        <Icon className="w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[12.5px] font-semibold">{config.title}</span>
          <span className="text-[12px] text-muted-foreground ml-2 hidden sm:inline">{config.desc}</span>
        </div>
        {plan && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 shrink-0">
            <Crown className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] font-semibold text-emerald-700">{plan.displayName}</span>
            <span className="text-[9px] text-emerald-600/60">₹{plan.priceYearly}/yr</span>
          </div>
        )}
        <button onClick={() => setDismissed(true)} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
