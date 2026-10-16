"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS: Record<string, string> = {
  "SEO retainer": "#2f6f62",
  "One-off project": "#b8860b",
  Website: "#5b3a75",
  Ads: "#2d5a80",
  Other: "#6b6b5c",
};

export default function IncomeByTypeChart({
  data,
}: {
  data: { name: string; amount: number }[];
}) {
  if (data.every((d) => d.amount === 0)) {
    return <div className="empty-state">No income logged yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid horizontal={false} stroke="#d8d0bf" />
        <XAxis
          type="number"
          tickFormatter={(v) => `£${v}`}
          tick={{ fontSize: 12, fill: "#6b6b5c" }}
          axisLine={{ stroke: "#d8d0bf" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12, fill: "#232821" }}
          axisLine={{ stroke: "#d8d0bf" }}
        />
        <Tooltip
          formatter={(v: number) => [`£${v.toFixed(2)}`, "Income"]}
          contentStyle={{
            fontSize: 12,
            border: "1px solid #d8d0bf",
            borderRadius: 6,
          }}
        />
        <Bar dataKey="amount" radius={[0, 3, 3, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name] ?? "#2f6f62"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
