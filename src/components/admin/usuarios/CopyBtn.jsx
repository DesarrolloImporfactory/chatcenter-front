import { useState } from "react";
import toast from "react-hot-toast";

export default function CopyBtn({ text, label = "Copiado", title = "Copiar" }) {
  const [copied, setCopied] = useState(false);
  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    toast.success(label);
    setTimeout(() => setCopied(false), 1400);
  };
  if (!text) return null;
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition flex-shrink-0"
    >
      <i
        className={`bx ${copied ? "bx-check text-emerald-500" : "bx-copy"} text-sm`}
      />
    </button>
  );
}
