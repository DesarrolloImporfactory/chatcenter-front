export default function Section({ icon, title, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-center gap-2 text-slate-900 mb-0.5">
          <i className={`bx ${icon} text-lg text-cyan-600`} />
          <h2 className="text-lg md:text-xl font-extrabold">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-slate-500 ml-7">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
