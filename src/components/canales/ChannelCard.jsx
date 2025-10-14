import React from "react";

export default function ChannelCard({
  brand,
  title,
  description,
  tags = [],
  status,
  action,
  footer,
  icon,
}) {
  const bg =
    {
      instagram: "from-pink-600 to-fuchsia-600",
      messenger: "from-blue-600 to-indigo-600",
      whatsapp: "from-emerald-600 to-teal-600",
    }[brand] || "from-slate-700 to-slate-900";

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl border border-gray-100 bg-white">
      <div
        className={`bg-gradient-to-r ${bg} text-white p-5 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div className="text-xl font-bold">{title}</div>
        </div>
        {status}
      </div>
      <div className="p-5">
        <p className="text-gray-700 text-sm">{description}</p>
        {tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2">{action}</div>
      </div>
      {footer && <div className="px-5 pb-5">{footer}</div>}
    </div>
  );
}
