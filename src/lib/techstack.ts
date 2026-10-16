export type TechToolLike = {
  cost: number;
  billingCycle: "MONTHLY" | "ANNUAL" | "ONE_OFF";
  renewsOn: Date | string;
};

// The smoothed monthly figure used for Expenditure and the Tech stack total —
// annual costs are split evenly across 12 months, one-offs don't recur.
export function monthlyEquivalent(tool: TechToolLike): number {
  if (tool.billingCycle === "ANNUAL") return tool.cost / 12;
  if (tool.billingCycle === "ONE_OFF") return 0;
  return tool.cost;
}

// Next occurrence of the renewal date from `from`, based on billing cycle.
// Used only for the "renews in N days" reminder, not for expense timing.
export function nextRenewal(tool: TechToolLike, from = new Date()): Date {
  const anchor = new Date(tool.renewsOn);
  if (tool.billingCycle === "ONE_OFF") return anchor;

  const next = new Date(anchor);
  if (tool.billingCycle === "MONTHLY") {
    while (next.getTime() < from.getTime()) {
      next.setMonth(next.getMonth() + 1);
    }
  } else {
    while (next.getTime() < from.getTime()) {
      next.setFullYear(next.getFullYear() + 1);
    }
  }
  return next;
}

export function daysUntil(date: Date, from = new Date()): number {
  const ms = date.getTime() - from.getTime();
  return Math.ceil(ms / 86_400_000);
}
