import React from "react";

export default function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{right}</div>
    </div>
  );
}
