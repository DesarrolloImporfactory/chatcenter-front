import React from "react";
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import ChartShell from "./ChartShell";
import { formatDuration } from "../../utils/parseEventDef";

export default function FirstResponseChart({ data }) {
  return (
    <ChartShell title="Tiempo promedio de primera respuesta">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 15, bottom: 10, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
          <XAxis
            dataKey="hour"
            stroke="rgba(15,23,42,0.55)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(15,23,42,0.55)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v ? formatDuration(v) : "0s")}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(15,23,42,0.30)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "avgSeconds")
                return [formatDuration(value), "Tiempo promedio"];
              if (name === "chats") return [value, "Chats"];
              return [value, name];
            }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.12)",
              color: "#0f172a",
            }}
          />

          <Area
            yAxisId="right"
            type="monotone"
            dataKey="chats"
            fillOpacity={0.18}
            strokeOpacity={0.3}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgSeconds"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
