import { useState } from "react";
import toast from "react-hot-toast";

export default function CopyBtn({
  text,
  label = "Copiado",
  icon = "bx-copy",
  title = "Copiar",
}) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard?.writeText(text);
    setCopied(true);
    toast.success(label);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-slate-200 text-slate-400 hover:text-cyan-600 transition flex-shrink-0"
    >
      <i
        className={`bx ${copied ? "bx-check text-emerald-500" : icon} text-sm`}
      />
    </button>
  );
}
