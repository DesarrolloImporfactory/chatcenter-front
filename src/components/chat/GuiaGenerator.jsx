import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";
import chatApi from "../../api/chatcenter";

export default function GuiaGenerator({
  socketRef,
  provincias,
  selectedChat,
  facturaSeleccionada,
  setFacturaSeleccionada,
  setFacturasChatSeleccionado,
  id_plataforma_conf,
  id_usuario_conf,
  id_configuracion,
  dataAdmin,
  buscar_id_recibe,
  agregar_mensaje_enviado,
  onRecargarPedido,
}) {
  const Toast = useMemo(
    () =>
      Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      }),
    [],
  );

  const [generandoGuia, setGenerandoGuia] = useState(false);
  const [ciudades, setCiudades] = useState([]);
  const [tarifas, setTarifas] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);

  const { register, setValue, getValues, watch } = useForm({
    defaultValues: {
      nombreCliente: "",
      telefono: "",
      provincia: "",
      ciudad: "",
      callePrincipal: "",
      calleSecundaria: "",
      referencia: "",
      observacion: "",
      nombre_responsable: "",
      cod_entrega: 1,
      transportadora: "",
      precio_envio: "",
      // extras:
      nombreO: "",
      ciudadO: "",
      direccionO: "",
      celularO: "",
      referenciaO: "",
      provinciaO: "",
      numero_factura: "",
      flete: 0,
      seguro: 0,
      comision: 0,
      otros: 0,
      impuestos: 0,
      url_google_speed_pedido: "",
    },
  });

  const productos = facturaSeleccionada?.productos || [];
  const total = useMemo(
    () =>
      productos.reduce(
        (acc, p) => acc + Number(p.precio_venta || 0) * Number(p.cantidad || 0),
        0,
      ),
    [productos],
  );

  // 1) Precargar form al seleccionar factura
  useEffect(() => {
    if (!facturaSeleccionada) return;

    setValue("nombreCliente", facturaSeleccionada.nombre || "");
    setValue(
      "telefono",
      facturaSeleccionada.celular || facturaSeleccionada.telefono || "",
    );
    setValue("provincia", facturaSeleccionada.provincia || "");
    setValue("ciudad", facturaSeleccionada.ciudad_cot || "");
    setValue("callePrincipal", facturaSeleccionada.c_principal || "");
    setValue("calleSecundaria", facturaSeleccionada.c_secundaria || "");
    setValue("referencia", facturaSeleccionada.referencia || "");
    setValue("observacion", facturaSeleccionada.observacion || "");
    setValue(
      "nombre_responsable",
      facturaSeleccionada.nombre_responsable || "",
    );
    setValue("cod_entrega", facturaSeleccionada.cod_entrega || 1);

    setValue("numero_factura", facturaSeleccionada.numero_factura || "");
    setValue("precio_envio", facturaSeleccionada.precio_envio || "");
    setValue("flete", facturaSeleccionada.flete || 0);
    setValue("seguro", facturaSeleccionada.seguro || 0);
    setValue("comision", facturaSeleccionada.comision || 0);
    setValue("otros", facturaSeleccionada.otros || 0);
    setValue("impuestos", facturaSeleccionada.impuestos || 0);

    setValue("nombreO", facturaSeleccionada.nombreO || "");
    setValue("ciudadO", facturaSeleccionada.ciudadO || "");
    setValue("direccionO", facturaSeleccionada.direccionO || "");
    setValue("celularO", facturaSeleccionada.telefonoO || "");
    setValue("referenciaO", facturaSeleccionada.referenciaO || "");
    setValue("provinciaO", facturaSeleccionada.provinciaO || "");

    // reset selección transportadora al cambiar pedido
    setSelectedImageId(null);
    setValue("transportadora", "");
    setValue("precio_envio", "");
  }, [facturaSeleccionada, setValue]);

  // 2) Cargar ciudades por provincia
  useEffect(() => {
    const prov = getValues("provincia");
    if (!prov || !socketRef.current) return;

    const s = socketRef.current;

    const onCiudades = (data) => setCiudades(Array.isArray(data) ? data : []);

    s.off("DATA_CIUDADES_RESPONSE", onCiudades);
    s.on("DATA_CIUDADES_RESPONSE", onCiudades);

    s.emit("GET_CIUDADES", prov);

    return () => s.off("DATA_CIUDADES_RESPONSE", onCiudades);
  }, [socketRef, getValues, watch("provincia")]); // watch para disparar cuando cambie provincia

  // 3) Pedir tarifas cuando ya tengo provincia+ciudad
  const tarifasListenerRef = useRef(null);
  const serviListenerRef = useRef(null);

  const pedirTarifas = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;

    // cleanup prev
    if (tarifasListenerRef.current)
      s.off("DATA_TARIFAS_RESPONSE", tarifasListenerRef.current);
    if (serviListenerRef.current)
      s.off("DATA_SERVIENTREGA_RESPONSE", serviListenerRef.current);

    const onTarifas = (data) => setTarifas(data);
    const onServi = (data) => {
      // si su backend manda estos campos:
      if (data?.precio_envio != null)
        setValue("precio_envio", data.precio_envio);
      if (data?.flete != null) setValue("flete", data.flete);
      if (data?.seguro != null) setValue("seguro", data.seguro);
      if (data?.comision != null) setValue("comision", data.comision);
      if (data?.otros != null) setValue("otros", data.otros);
      if (data?.impuestos != null) setValue("impuestos", data.impuestos);
    };

    tarifasListenerRef.current = onTarifas;
    serviListenerRef.current = onServi;

    s.on("DATA_TARIFAS_RESPONSE", onTarifas);
    s.on("DATA_SERVIENTREGA_RESPONSE", onServi);

    const ciudad = getValues("ciudad");
    const provincia = getValues("provincia");
    const recaudo = getValues("cod_entrega");

    s.emit("GET_TARIFAS", {
      ciudad,
      provincia,
      id_plataforma: id_plataforma_conf,
      monto_factura: total,
      recaudo,
    });

    s.emit("GET_SERVIENTREGA", {
      ciudadO: getValues("ciudadO"),
      ciudadD: ciudad,
      provinciaD: provincia,
      monto_factura: total,
    });
  }, [socketRef, getValues, id_plataforma_conf, total, setValue]);

  useEffect(() => {
    const prov = getValues("provincia");
    const ciudad = getValues("ciudad");
    if (!prov || !ciudad) return;
    if (!productos.length) return;

    pedirTarifas();
  }, [
    watch("ciudad"),
    watch("provincia"),
    productos.length,
    pedirTarifas,
    getValues,
  ]);

  // 4) Selección transportadora (usted pinta como cards/imágenes)
  const handleSelectTransportadora = useCallback(
    (id, tarifaTexto) => {
      const precioEnvio =
        parseFloat(String(tarifaTexto || "").replace("$", "")) || 0;
      if (!precioEnvio) {
        Swal.fire({
          icon: "warning",
          title: "Tarifa no disponible",
          text: "Seleccione otra opción.",
        });
        return;
      }

      setSelectedImageId(id);
      setValue("transportadora", id);
      setValue("precio_envio", tarifaTexto);
      // si usted necesita calcular guía directa aquí, llame su endpoint:
      // calcularGuiaDirecta(tarifaTexto)
    },
    [setValue],
  );

  // 5) VALIDAR + GENERAR (su lógica, pero ordenada)
  const validarProductosGuia = useCallback(async () => {
    const lista_productos = (productos || []).map((p) => ({
      id_inventario: p.id_inventario,
      cantidad: p.cantidad,
    }));

    await chatApi.post("/pedidos/validar_productos_guia", {
      lista: lista_productos,
      id_plataforma: id_plataforma_conf,
    });

    return lista_productos;
  }, [productos, id_plataforma_conf]);

  const obtener_plantilla = useCallback(async (id_plataforma) => {
    const response = await chatApi.post(
      "/configuraciones/obtener_template_transportadora",
      { id_plataforma },
    );
    return response.data?.data?.template || "";
  }, []);

  const obtenerTextoPlantilla = useCallback(
    async (templateName) => {
      const ACCESS_TOKEN = dataAdmin.token;

      const response = await fetch(
        `https://graph.facebook.com/v17.0/${dataAdmin.id_whatsapp}/message_templates`,
        { method: "GET", headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
      );

      const data = await response.json();
      const plantilla = data?.data?.find((tpl) => tpl.name === templateName);
      const body = plantilla?.components?.find((c) => c.type === "BODY");
      return {
        text: body?.text || null,
        language: plantilla?.language || "es",
      };
    },
    [dataAdmin],
  );

  const enviar_guia_plantilla = useCallback(
    async (guia) => {
      const TEMPLATE_NAME = await obtener_plantilla(id_plataforma_conf);
      if (!TEMPLATE_NAME) return;

      const { text: templateText, language: LANGUAGE_CODE } =
        await obtenerTextoPlantilla(TEMPLATE_NAME);
      if (!templateText) return;

      const nombreCliente = getValues("nombreCliente");
      const numeroDestino = selectedChat.celular_cliente;

      const mensaje = {
        messaging_product: "whatsapp",
        to: numeroDestino,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: LANGUAGE_CODE },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: nombreCliente },
                { type: "text", text: guia },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: guia }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "1",
              parameters: [{ type: "text", text: guia }],
            },
          ],
        },
      };

      const PHONE_NUMBER_ID = dataAdmin.id_telefono;
      const ACCESS_TOKEN = dataAdmin.token;

      const rsp = await fetch(
        `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          body: JSON.stringify(mensaje),
        },
      );

      const out = await rsp.json();
      if (out?.error) throw out.error;

      const wamid = out?.messages?.[0]?.id || null;
      const id_recibe = await buscar_id_recibe(numeroDestino, id_configuracion);

      const ruta_archivo = { 1: nombreCliente, 2: guia };

      agregar_mensaje_enviado(
        templateText,
        "text",
        JSON.stringify(ruta_archivo),
        numeroDestino,
        dataAdmin.id_telefono,
        id_recibe,
        id_configuracion,
        dataAdmin.telefono,
        wamid,
        "",
        "",
      );
    },
    [
      obtener_plantilla,
      obtenerTextoPlantilla,
      getValues,
      selectedChat,
      dataAdmin,
      buscar_id_recibe,
      agregar_mensaje_enviado,
      id_configuracion,
      id_plataforma_conf,
    ],
  );

  const handleGenerarGuia = useCallback(async () => {
    if (!productos.length) {
      Toast.fire({
        title: "ERROR",
        icon: "error",
        text: "No hay productos para generar guía.",
      });
      return;
    }

    const transportadora = getValues("transportadora");
    if (!transportadora) {
      Toast.fire({
        title: "ERROR",
        icon: "error",
        text: "Seleccione una transportadora.",
      });
      return;
    }

    setGenerandoGuia(true);

    try {
      // 1) validar
      let lista_productos;
      try {
        lista_productos = await validarProductosGuia();
      } catch (err) {
        const rsp = err?.response?.data || {};
        const html = `
          <div class="validador-wrap">
            <p class="validador-intro">Revise los siguientes ítems.</p>
            <div class="validador-list">
              ${(rsp?.invalidos || [])
                .map(
                  (it) => `
                <div class="validador-item">
                  <div class="validador-name"><strong>- ${it.nombre}</strong></div>
                  <div class="validador-chips">${(it.motivos || []).map((m) => `<span class="chip">${m}</span>`).join("")}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
        await Swal.fire({
          icon: "error",
          title: rsp?.title || "Producto con problemas",
          html,
        });
        return;
      }

      // 2) validar flete
      const costoFlete = getValues("precio_envio");
      if (!costoFlete || Number(String(costoFlete).replace("$", "")) === 0) {
        await Swal.fire({
          icon: "warning",
          title: "Costo de flete no asignado",
          text: "Vuelva a seleccionar la transportadora.",
        });
        setSelectedImageId(null);
        setValue("transportadora", "");
        setValue("precio_envio", "");
        return;
      }

      // 3) armar formData (pegue su payload completo)
      const formulario = new FormData();
      formulario.append("procedencia", "1");
      formulario.append("id_pedido", facturaSeleccionada.id_factura || "");
      formulario.append("nombre", getValues("nombreCliente") || "");
      formulario.append("telefono", getValues("telefono") || "");
      formulario.append("provincia", getValues("provincia") || "");
      formulario.append("ciudad", getValues("ciudad") || "");
      formulario.append("calle_principal", getValues("callePrincipal") || "");
      formulario.append("calle_secundaria", getValues("calleSecundaria") || "");
      formulario.append("referencia", getValues("referencia") || "");
      formulario.append("observacion", getValues("observacion") || "");
      formulario.append(
        "nombre_responsable",
        getValues("nombre_responsable") || "",
      );
      formulario.append("recaudo", getValues("cod_entrega") || "");
      formulario.append(
        "numero_factura",
        facturaSeleccionada.numero_factura || "",
      );
      formulario.append("total_venta", total || 0);
      formulario.append("transportadora", transportadora);
      formulario.append("costo_flete", getValues("precio_envio"));
      formulario.append("id", id_usuario_conf ? id_usuario_conf : 0);
      formulario.append("id_plataforma", id_plataforma_conf);
      formulario.append("productos", JSON.stringify(lista_productos));

      // contiene
      formulario.append(
        "contiene",
        productos.map((p) => `${p.cantidad} x ${p.nombre_producto}`).join(", "),
      );

      // extras servientrega
      if (Number(transportadora) === 1) {
        formulario.append("flete", getValues("flete") || 0);
        formulario.append("seguro", getValues("seguro") || 0);
        formulario.append("comision", getValues("comision") || 0);
        formulario.append("otros", getValues("otros") || 0);
        formulario.append("impuestos", getValues("impuestos") || 0);
      }

      // 4) endpoint por transportadora
      const endpoint =
        Number(transportadora) === 1
          ? "https://new.imporsuitpro.com/Guias/generarServientrega"
          : Number(transportadora) === 2
            ? "https://new.imporsuitpro.com/Guias/generarLaar"
            : Number(transportadora) === 3
              ? "https://new.imporsuitpro.com/Guias/generarSpeed"
              : "https://new.imporsuitpro.com/Guias/generarGintracom";

      const resp = await fetch(endpoint, { method: "POST", body: formulario });
      const data = await resp.json();

      if (data?.status === 200 || data?.status === "200") {
        const guia = Number(transportadora) === 1 ? data.id : data.guia;

        // 5) enviar plantilla WhatsApp
        await enviar_guia_plantilla(String(guia));

        // 6) sacar la factura del listado
        setFacturasChatSeleccionado((prev) =>
          (prev || []).filter(
            (f) => f.numero_factura !== facturaSeleccionada.numero_factura,
          ),
        );

        setFacturaSeleccionada(null);
        Toast.fire({
          title: "Éxito",
          icon: "success",
          text: "Guía generada correctamente.",
        });

        // 7) recargar pedidos
        onRecargarPedido?.();

        // opcional: marcar chat_center
        try {
          await chatApi.post("/facturas_cot/marcar_chat_center", {
            numero_factura: facturaSeleccionada.numero_factura,
          });
        } catch {}

        return;
      }

      Toast.fire({
        title: "ERROR",
        icon: "error",
        text: data?.message || "No se pudo generar la guía.",
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error de red al generar la guía.",
      });
    } finally {
      setGenerandoGuia(false);
    }
  }, [
    productos,
    getValues,
    validarProductosGuia,
    Toast,
    facturaSeleccionada,
    total,
    id_usuario_conf,
    id_plataforma_conf,
    setFacturasChatSeleccionado,
    setFacturaSeleccionada,
    onRecargarPedido,
    enviar_guia_plantilla,
    setValue,
  ]);

  return (
    <div className="relative">
      {generandoGuia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-black text-center">
            <h1 className="text-xl font-semibold mb-3">Generando Guía</h1>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-3">Espere por favor...</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <b>Factura:</b> {facturaSeleccionada?.numero_factura}
          <div className="text-sm text-gray-600">
            Total: ${total.toFixed(2)}
          </div>
        </div>

        <button
          className="px-3 py-2 rounded bg-gray-200"
          onClick={() => setFacturaSeleccionada(null)}
        >
          Cerrar
        </button>
      </div>

      {/* Form básico (usted pega su UI completa) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Nombre</label>
          <input
            className="p-2 border rounded w-full"
            {...register("nombreCliente")}
          />
        </div>
        <div>
          <label className="text-sm">Teléfono</label>
          <input
            className="p-2 border rounded w-full"
            {...register("telefono")}
          />
        </div>

        <div>
          <label className="text-sm">Provincia</label>
          <select
            className="p-2 border rounded w-full"
            {...register("provincia")}
          >
            <option value="">Seleccione</option>
            {(provincias || []).map((p) => (
              <option key={p.codigo_provincia} value={p.codigo_provincia}>
                {p.provincia}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Ciudad</label>
          <select className="p-2 border rounded w-full" {...register("ciudad")}>
            <option value="">Seleccione</option>
            {(ciudades || []).map((c) => (
              <option key={c.id_cotizacion} value={c.id_cotizacion}>
                {c.ciudad}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transportadoras (ejemplo mínimo; usted lo pinta como cards con tarifas) */}
      <div className="mt-4">
        <div className="text-sm font-semibold mb-2">Transportadora</div>

        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4].map((id) => (
            <button
              key={id}
              className={`px-3 py-2 rounded border ${selectedImageId === id ? "bg-blue-600 text-white" : "bg-white"}`}
              onClick={() => handleSelectTransportadora(id, "$10.00")}
              type="button"
            >
              {id === 1
                ? "Servi"
                : id === 2
                  ? "Laar"
                  : id === 3
                    ? "Speed"
                    : "Gintracom"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded"
          onClick={handleGenerarGuia}
          type="button"
          disabled={generandoGuia}
        >
          Generar Guía
        </button>
      </div>
    </div>
  );
}
