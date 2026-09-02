import { useEffect, useMemo, useState } from "react";
import { getCatalogosVenta } from "../../services/imporsuit";
import chatApi from "../../api/chatcenter";
import { Field, inputCls } from "./ui";
import { ComprobantesUploader } from "./ComprobantesUploader";

/**
 * Campos del alta en MODO VENTAS dentro de ImporChat (el alumno ya pagó).
 *
 * Espejo del bloque equivalente del panel React
 * (`imporsuit-front/src/features/asesor/components/VentaFields.jsx`), con el
 * tema claro de chatcenter. Las reglas de cuotas y validación se replican tal
 * cual porque el back es el mismo (`VentaModel`): si divergieran, el agente le
 * prometería al cliente cifras que la cartera no va a mostrar.
 */

/** Países frecuentes. El back solo acepta el código ISO de 2 letras. */
const PAISES = [
  { code: "EC", label: "Ecuador" },
  { code: "CO", label: "Colombia" },
  { code: "MX", label: "México" },
  { code: "PE", label: "Perú" },
  { code: "CL", label: "Chile" },
  { code: "AR", label: "Argentina" },
  { code: "BO", label: "Bolivia" },
  { code: "PA", label: "Panamá" },
  { code: "US", label: "Estados Unidos" },
  { code: "ES", label: "España" },
];

const ETIQUETA_PASARELA = {
  stripe: "Stripe",
  paypal: "PayPal",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  deposito: "Depósito",
  efectivo: "Efectivo",
  datalink: "Datalink",
  payphone: "PayPhone",
  otro: "Otro",
};

const CREAR_NUEVA_ETIQUETA = "__crear_nueva__";

/**
 * El nombre viaja a Imporsuit, que crea o reutiliza la etiqueta en Ventas
 * (242) y Soporte Importaciones (265) antes de asignarla al contacto.
 */
function SelectorEtiqueta({ label, opciones, value, onChange, placeholder, disabled }) {
  const [creando, setCreando] = useState(false);

  const seleccionar = (event) => {
    const seleccion = event.target.value;
    if (seleccion === CREAR_NUEVA_ETIQUETA) {
      setCreando(true);
      onChange("");
      return;
    }

    setCreando(false);
    onChange(seleccion);
  };

  return (
    <Field label={label}>
      <select
        className={inputCls}
        value={creando ? CREAR_NUEVA_ETIQUETA : value}
        onChange={seleccionar}
        disabled={disabled}
      >
        <option value="">Sin asignar</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
        <option value={CREAR_NUEVA_ETIQUETA}>+ Crear nueva</option>
      </select>

      {creando && (
        <input
          type="text"
          className={`${inputCls} mt-2`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={120}
          autoFocus
          disabled={disabled}
        />
      )}

      <span className="mt-1 block text-[11px] text-gray-500">
        Opcional. Se crea si no existe.
      </span>
    </Field>
  );
}

const CONFIGURACIONES_ETIQUETAS = [242, 265];

/**
 * Misma fuente que el bloque "Etiquetas adicionales" del chat. Estas son las
 * etiquetas tipadas de asesor/ciclo que usan las columnas id_etiqueta_asesor
 * e id_etiqueta_ciclo; no son las etiquetas genéricas del chat.
 */
async function cargarEtiquetasDelChatCenter() {
  const respuestas = await Promise.all(
    CONFIGURACIONES_ETIQUETAS.flatMap((idConfiguracion) => [
      chatApi.get(
        `/etiquetas_custom_chat_center/listar?tipo=asesor&id_configuracion=${idConfiguracion}`,
      ),
      chatApi.get(
        `/etiquetas_custom_chat_center/listar?tipo=ciclo&id_configuracion=${idConfiguracion}`,
      ),
    ]),
  );

  const nombres = (indice) =>
    [...new Set(
      [respuestas[indice], respuestas[indice + 2]]
        .flatMap((respuesta) => respuesta.data?.data ?? [])
        .map((etiqueta) => String(etiqueta.nombre ?? "").trim())
        .filter(Boolean),
    )].sort((a, b) => a.localeCompare(b, "es"));

  return { asesores: nombres(0), ciclos: nombres(1) };
}

export function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Suma meses sin desbordar el mes corto (31-ene +1 mes → 28/29-feb). */
export function sumarMeses(fechaISO, meses) {
  if (!fechaISO) return "";
  const [y, m, d] = fechaISO.split("-").map(Number);
  if (!y || !m || !d) return "";

  const destino = new Date(y, m - 1 + meses, 1);
  const ultimoDia = new Date(
    destino.getFullYear(),
    destino.getMonth() + 1,
    0,
  ).getDate();
  destino.setDate(Math.min(d, ultimoDia));

  const mm = String(destino.getMonth() + 1).padStart(2, "0");
  const dd = String(destino.getDate()).padStart(2, "0");
  return `${destino.getFullYear()}-${mm}-${dd}`;
}

const INITIAL_VENTA = {
  pais: "EC",
  idProducto: "",
  montoTotal: "",
  cuotas: "1",
  montoPagado: "",
  fechaCompra: hoyISO(),
  idCloser: "",
  pasarela: "transferencia",
  referencia: "",
  // URLs de los comprobantes ya subidos a S3 (uploader.imporfactory.app),
  // igual que en RegistrarPagoForm: al back solo viajan las URLs.
  imagenesUrls: [],
  // Etiquetas de ImporChat. Se aplican en las dos líneas (Ventas y Soporte
  // Importaciones), creándolas si el nombre todavía no existe.
  etiquetaAsesor: "",
  etiquetaCiclo: "",
  // Bienvenida del producto por WhatsApp. Encendida por defecto, igual que en
  // el panel: lo normal después de un pago es que al cliente le llegue su
  // mensaje. Se apaga a mano en una recompra, donde el chat ya existe.
  enviarWhatsapp: true,
};

/**
 * Paquetes con plantilla aprobada en Meta. Espejo de `PLANTILLA_POR_PRODUCTO`
 * en `Class/RegistroImportacionesWhatsApp.php` (imporsutipro): si allá se
 * aprueba una nueva, hay que sumarla acá o el aviso mentirá.
 *
 * `kit_importador` no tiene plantilla propia: reusa `kitdearranque`.
 */
const PAQUETES_CON_PLANTILLA = [
  "ecommerce",
  "importacion",
  "kit",
  "kit_importador",
  "dropsystem",
];

/**
 * El paquete cuya bienvenida sale por el webhook de encuesta y NO como
 * plantilla del producto — el mismo `PAQUETE_ENCUESTA` de `VentaModel`.
 */
const PAQUETE_POR_ENCUESTA = "importacion";

/** null = el producto no dispara WhatsApp; undefined = todavía no eligió. */
function plantillaDelProducto(producto) {
  if (!producto) return undefined;
  return PAQUETES_CON_PLANTILLA.includes(producto.flagPaquete)
    ? producto.flagPaquete
    : null;
}

/** ¿Su bienvenida la manda la encuesta en vez de la plantilla del producto? */
const vaPorEncuesta = (producto) => producto?.flagPaquete === PAQUETE_POR_ENCUESTA;

/** Estado, catálogos y validación del bloque de venta. */
export function useVentaForm(activo) {
  const [venta, setVenta] = useState(INITIAL_VENTA);
  const [catalogos, setCatalogos] = useState({
    productos: [],
    closers: [],
    pasarelas: [],
    etiquetas: { asesores: [], ciclos: [] },
    closerPorDefecto: 0,
  });
  const [cargando, setCargando] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState(null);

  useEffect(() => {
    if (!activo) return undefined;
    let alive = true;
    setCargando(true);
    setErrorCatalogos(null);

    Promise.all([
      getCatalogosVenta(),
      cargarEtiquetasDelChatCenter().catch(() => null),
    ])
      .then(([data, etiquetasDirectas]) => {
        if (!alive) return;
        // El endpoint de Imporsuit conserva los catálogos de venta; asesor y
        // ciclo se leen directo del mismo API de ChatCenter que pinta el panel.
        setCatalogos({ ...data, etiquetas: etiquetasDirectas ?? data.etiquetas });
        // Sin usuario de Imporsuit detrás, el closer se precarga con el asesor
        // de integración; el agente lo cambia por quien cerró de verdad.
        setVenta((prev) =>
          prev.idCloser || !data.closerPorDefecto
            ? prev
            : { ...prev, idCloser: String(data.closerPorDefecto) },
        );
      })
      .catch((err) => alive && setErrorCatalogos(err))
      .finally(() => alive && setCargando(false));

    return () => {
      alive = false;
    };
  }, [activo]);

  const setCampo = (name, value) => {
    setVenta((prev) => {
      const next = { ...prev, [name]: value };
      // De contado, lo pagado es el total: evita el rechazo del back por
      // descuadre y ahorra teclear el mismo número dos veces.
      if (name === "cuotas" && Number(value) === 1) next.montoPagado = next.montoTotal;
      if (name === "montoTotal" && Number(next.cuotas) === 1) next.montoPagado = value;
      return next;
    });
  };

  /**
   * Mismo reparto que el back. Si el pago supera la cuota uniforme, pasa a
   * ser la cuota 1 y el saldo se distribuye entre las restantes.
   */
  const plan = useMemo(() => {
    const total = Number(venta.montoTotal) || 0;
    const n = Math.max(1, Math.min(12, Number(venta.cuotas) || 1));
    if (total <= 0) return [];

    const pagado = Number(venta.montoPagado) || 0;
    const baseNormal = Math.floor((total / n) * 100) / 100;
    const primeraPersonalizada = n > 1 && pagado > baseNormal + 0.009;
    const restante = Math.max(0, Math.round((total - pagado) * 100) / 100);
    const baseRestante =
      primeraPersonalizada && n > 1
        ? Math.floor((restante / (n - 1)) * 100) / 100
        : baseNormal;

    return Array.from({ length: n }, (_, i) => {
      let monto;
      if (primeraPersonalizada) {
        if (i === 0) monto = pagado;
        else if (i === n - 1)
          monto = Math.round((restante - baseRestante * (n - 2)) * 100) / 100;
        else monto = baseRestante;
      } else {
        monto =
          i === n - 1
            ? Math.round((total - baseNormal * (n - 1)) * 100) / 100
            : baseNormal;
      }

      if (i > 0) {
        return { numero: i + 1, monto, vence: sumarMeses(venta.fechaCompra, i) };
      }

      // Cuota 1: la que se cobra en el acto. Si el abono no la cubre, el saldo
      // queda debiendo y el back le corre el vencimiento un mes — si no,
      // mañana figura vencida y el sistema le bloquea el acceso.
      const abonado = Math.min(pagado, monto);
      const saldo = Math.round((monto - abonado) * 100) / 100;

      return {
        numero: 1,
        monto,
        abonado,
        saldo,
        vence: sumarMeses(venta.fechaCompra, saldo > 0.009 ? 1 : 0),
        reprogramada: saldo > 0.009,
      };
    });
  }, [venta.montoTotal, venta.cuotas, venta.fechaCompra, venta.montoPagado]);

  /** Devuelve el mensaje de error, o null si está todo bien. */
  const validar = () => {
    const total = Number(venta.montoTotal);
    const pagado = Number(venta.montoPagado);
    const n = Number(venta.cuotas);

    // El comprobante se exige solo si entró plata: una venta cargada sin
    // pago (todo a cuotas futuras) no tiene qué respaldar todavía.
    if (pagado > 0 && (venta.imagenesUrls ?? []).length === 0)
      return "Adjunta el comprobante del pago";

    if (!venta.idProducto) return "Selecciona el producto vendido";
    if (!venta.pais) return "Selecciona el país";
    if (!venta.idCloser) return "Selecciona el closer que cerró la venta";
    if (!venta.pasarela) return "Selecciona la pasarela de pago";
    if (!venta.fechaCompra) return "Indica la fecha de compra";
    if (venta.fechaCompra > hoyISO()) return "La fecha de compra no puede ser futura";
    if (!Number.isFinite(total) || total <= 0)
      return "El monto total debe ser mayor que 0";
    if (!Number.isFinite(pagado) || pagado < 0) return "Monto pagado inválido";
    if (pagado > total) return "Lo pagado no puede superar al total";
    if (n === 1 && pagado > 0 && Math.abs(pagado - total) > 0.009)
      return "De contado, lo pagado debe ser igual al total (o divide en cuotas)";
    if (n > 1 && total > 0 && Math.abs(pagado - total) <= 0.009)
      return "Si ya pagó el total, selecciona 1 cuota (de contado)";

    return null;
  };

  return { venta, setCampo, catalogos, cargando, errorCatalogos, plan, validar };
}

export function VentaFields({ form, disabled }) {
  const { venta, setCampo, catalogos, cargando, errorCatalogos, plan } = form;

  const productoSel = catalogos.productos.find(
    (p) => String(p.id) === String(venta.idProducto),
  );
  const cuotas = Number(venta.cuotas) || 1;
  const pendiente = (Number(venta.montoTotal) || 0) - (Number(venta.montoPagado) || 0);
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-emerald-800">Datos de la venta</p>
        {cargando && (
          <span className="text-xs text-gray-500">Cargando catálogos…</span>
        )}
      </div>

      {errorCatalogos && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          No se pudieron cargar productos y closers: {errorCatalogos.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Producto vendido">
          <select
            className={inputCls}
            value={venta.idProducto}
            onChange={(e) => setCampo("idProducto", e.target.value)}
            disabled={disabled || cargando}
          >
            <option value="">Seleccionar producto</option>
            {catalogos.productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          {productoSel && (
            <span className="mt-1 block text-[11px] text-gray-500">
              {productoSel.cursoNombre
                ? `Asigna el curso: ${productoSel.cursoNombre}`
                : "Sin curso asociado"}
            </span>
          )}
        </Field>

        <Field label="País">
          <select
            className={inputCls}
            value={venta.pais}
            onChange={(e) => setCampo("pais", e.target.value)}
            disabled={disabled}
          >
            {PAISES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label} ({p.code})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Closer (quien cerró)">
          <select
            className={inputCls}
            value={venta.idCloser}
            onChange={(e) => setCampo("idCloser", e.target.value)}
            disabled={disabled || cargando}
          >
            <option value="">Seleccionar closer</option>
            {catalogos.closers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha de compra">
          <input
            type="date"
            className={inputCls}
            value={venta.fechaCompra}
            max={hoyISO()}
            onChange={(e) => setCampo("fechaCompra", e.target.value)}
            disabled={disabled}
          />
        </Field>

        <Field label="Monto total de la venta">
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={venta.montoTotal}
            onChange={(e) => setCampo("montoTotal", e.target.value)}
            placeholder="0.00"
            disabled={disabled}
          />
        </Field>

        <Field label="Cuotas">
          <select
            className={inputCls}
            value={venta.cuotas}
            onChange={(e) => setCampo("cuotas", e.target.value)}
            disabled={disabled}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 (de contado)" : `${n} cuotas`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Monto pagado ahora">
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={venta.montoPagado}
            onChange={(e) => setCampo("montoPagado", e.target.value)}
            placeholder="0.00"
            disabled={disabled || cuotas === 1}
          />
          <span className="mt-1 block text-[11px] text-gray-500">
            {cuotas === 1
              ? "De contado se iguala al total"
              : "Si supera la cuota normal, este valor será la cuota 1 y el saldo se repartirá"}
          </span>
        </Field>

        <Field label="Pasarela de pago">
          <select
            className={inputCls}
            value={venta.pasarela}
            onChange={(e) => setCampo("pasarela", e.target.value)}
            disabled={disabled}
          >
            {catalogos.pasarelas.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PASARELA[p] ?? p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Referencia (opcional)">
          <input
            type="text"
            className={inputCls}
            value={venta.referencia}
            onChange={(e) => setCampo("referencia", e.target.value)}
            placeholder="N° de transacción"
            disabled={disabled}
          />
        </Field>
      </div>

      {/* Etiquetas de ImporChat. Se aplican en las DOS líneas (Ventas y
          Soporte Importaciones): la misma etiqueta tiene un id distinto en
          cada una, por eso viajan por nombre. */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectorEtiqueta
          label="Asesor (etiqueta de ImporChat)"
          opciones={catalogos.etiquetas?.asesores ?? []}
          value={venta.etiquetaAsesor}
          onChange={(valor) => setCampo("etiquetaAsesor", valor)}
          placeholder="Ej: Adrian Imporfactory"
          disabled={disabled}
        />

        <SelectorEtiqueta
          label="Ciclo"
          opciones={catalogos.etiquetas?.ciclos ?? []}
          value={venta.etiquetaCiclo}
          onChange={(valor) => setCampo("etiquetaCiclo", valor)}
          placeholder="Ej: IMPORT AGOSTO26"
          disabled={disabled}
        />
      </div>

      {/* Comprobante del pago. Mismo bucket que los pagos de cartera y queda
          adjunto a la cuota 1, así se ve igual que cualquier otro pago. */}
      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-gray-600">
          Comprobante del pago
          {Number(venta.montoPagado) > 0 && (
            <span className="ml-0.5 text-red-500">*</span>
          )}
        </p>
        <ComprobantesUploader
          urls={venta.imagenesUrls ?? []}
          onChange={(urls) => setCampo("imagenesUrls", urls)}
          disabled={disabled}
        />
      </div>

      {/* Bienvenida por WhatsApp + alta del hilo en ImporChat. Mismo
          interruptor que el panel: en una recompra el chat ya existe y el
          agente puede querer saltárselo. */}
      <label
        className={`mt-3 flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
          venta.enviarWhatsapp
            ? "border-emerald-300 bg-emerald-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <input
          type="checkbox"
          checked={venta.enviarWhatsapp}
          onChange={(e) => setCampo("enviarWhatsapp", e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600"
        />
        <span>
          <span className="block font-semibold text-gray-800">
            Enviar bienvenida por WhatsApp
          </span>
          <span className="mt-0.5 block text-[11px] text-gray-500">
            Manda la plantilla del producto desde Soporte Importaciones y abre
            el chat en ImporChat.
            {plantillaDelProducto(productoSel) === null && (
              <span className="text-amber-700">
                {" "}
                Este producto no tiene plantilla aprobada: no se enviará nada.
              </span>
            )}
            {/* Con el Club el interruptor no cambia nada: su bienvenida sale
                por el webhook de encuesta, que manda esa misma plantilla. */}
            {vaPorEncuesta(productoSel) && (
              <span className="text-amber-700">
                {" "}
                Su bienvenida sale por el webhook de encuesta, no por acá.
              </span>
            )}
          </span>
        </span>
      </label>

      {/* Plan de cuotas: lo que el agente le va a decir al cliente. Se calcula
          igual que en el back, así que es lo que realmente va a quedar. */}
      {plan.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-gray-700">
              Plan de pago ({plan.length} {plan.length === 1 ? "cuota" : "cuotas"})
            </p>
            {pendiente > 0.009 && (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Queda pendiente: {pendiente.toFixed(2)}
              </span>
            )}
          </div>
          <ul className="space-y-1">
            {plan.map((c, idx) => (
              <li
                key={c.numero}
                className="flex items-center justify-between gap-2 text-[11px] text-gray-600"
              >
                <span>
                  Cuota {c.numero}
                  {idx === 0 && c.abonado > 0 && (
                    <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      {c.saldo > 0.009
                        ? `abona ${c.abonado.toFixed(2)}`
                        : "se paga ahora"}
                    </span>
                  )}
                  {/* Un abono parcial deja saldo. El back le corre el
                      vencimiento un mes para que no figure vencida mañana. */}
                  {idx === 0 && c.saldo > 0.009 && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                      faltan {c.saldo.toFixed(2)} → pasa al mes siguiente
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums">
                  {c.monto.toFixed(2)} · vence {c.vence}
                </span>
              </li>
            ))}
          </ul>

          {plan[0]?.reprogramada && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
              La cuota 1 queda con {plan[0].saldo.toFixed(2)} pendiente y vence
              el {plan[0].vence}, junto con la cuota 2. Así no aparece vencida
              mañana ni se le bloquea el acceso.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
