function GlosarioItem({ term, children }) {
  return (
    <div className="py-1.5 border-b border-slate-100 last:border-0">
      <div className="font-bold text-slate-800">{term}</div>
      <div className="text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}

export default function Glosario({ open, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <i className="bx bx-book-open text-cyan-700 text-lg" />
          <span className="font-bold text-slate-900 text-sm">
            Glosario · ¿Qué significa cada término?
          </span>
          <span className="text-xs text-slate-500">(click para abrir)</span>
        </div>
        <i
          className={`bx ${open ? "bx-chevron-up" : "bx-chevron-down"} text-xl text-slate-400`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-slate-100 pt-4">
          <GlosarioItem term="MRR (Monthly Recurring Revenue)">
            Ingreso recurrente mensual. Suma de suscripciones Stripe cobrando
            ahora.
          </GlosarioItem>
          <GlosarioItem term="ARR (Annual Recurring Revenue)">
            MRR × 12. Proyección anual.
          </GlosarioItem>
          <GlosarioItem term="ARPU">
            Ingreso promedio por cliente pagando. = MRR ÷ clientes pagando.
          </GlosarioItem>
          <GlosarioItem term="LTV">
            Valor de vida del cliente. = ARPU ÷ churn mensual.
          </GlosarioItem>
          <GlosarioItem term="Churn">
            % que cancela al mes. Sano: menor a 5%.
          </GlosarioItem>
          <GlosarioItem term="Pagando Stripe">
            Suscripción Stripe en estado{" "}
            <code className="bg-slate-100 px-1 rounded text-[10px]">
              active
            </code>
            . Stripe cobra automático.
          </GlosarioItem>
          <GlosarioItem term="Trial Stripe">
            Tarjeta capturada, en periodo prueba. Stripe cobra al terminar.
          </GlosarioItem>
          <GlosarioItem term="Acceso manual (sin tarjeta)">
            Plan activo SIN tarjeta. Curso Method Ecommerce: 30/90/180 días
            gratis, después capturan tarjeta.
          </GlosarioItem>
          <GlosarioItem term="Cortesía VIP (permanente=1)">
            Acceso perpetuo sin cobro. Equipo, partners.
          </GlosarioItem>
          <GlosarioItem term="Trial uso">
            Estado{" "}
            <code className="bg-slate-100 px-1 rounded text-[10px]">
              trial_usage
            </code>
            . 10 imágenes Insta Landing gratis.
          </GlosarioItem>
          <GlosarioItem term="Código promo">
            Estado{" "}
            <code className="bg-slate-100 px-1 rounded text-[10px]">
              promo_usage
            </code>
            . Canjeó código.
          </GlosarioItem>
          <GlosarioItem term="MRR potencial">
            Si todo el pipeline (trial + manual) pagara hoy.
          </GlosarioItem>
          <GlosarioItem term="Productos del plan">
            <b>ImporChat:</b> chat WhatsApp · <b>Insta Landing:</b> banners IA ·{" "}
            <b>ImporChat + Insta Landing + Dashboard:</b> ecosistema completo.
          </GlosarioItem>
          <GlosarioItem term="Planes TEST">
            Planes creados para pruebas Stripe. Se excluyen automáticamente de
            todos los conteos.
          </GlosarioItem>
        </div>
      )}
    </div>
  );
}
