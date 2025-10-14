import React from "react";

export function TooltipIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.694 0 8.5-3.806 8.5-8.5s-3.806-8.5-8.5-8.5-8.5 3.806-8.5 8.5 3.806 8.5 8.5 8.5z"
      />
    </svg>
  );
}

export function ThWithTooltip({ label, tip, className = "" }) {
  return (
    <th className={`py-2 px-4 text-left relative group ${className}`}>
      <div className="inline-flex items-center">
        {label}
        {tip && (
          <span className="ml-1 text-gray-400 hover:text-blue-500 cursor-pointer">
            <TooltipIcon />
          </span>
        )}
      </div>
      {tip && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-md px-2 py-2 shadow-md z-50">
          {typeof tip === "string" ? (
            <p className="text-gray-100">{tip}</p>
          ) : (
            tip
          )}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </th>
  );
}
