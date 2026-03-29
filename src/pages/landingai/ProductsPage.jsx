import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";

import ProductCard from "./components/ProductCard";
import ModalCrudProducto from "./modales/ModalCrudProducto";
import ModalImportarDropi from "./modales/ModalImportarDropi";
import ModalAlimentarNegocio from "./modales/ModalAlimentarNegocio";
import VincularDropiModal from "./modales/VincularDropiModal";
import VincularShopifyModal from "./modales/VincularShopifyModal";
import EnviarShopifyModal from "./modales/EnviarShopifyModal";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const FORM_INIT = {
  nombre: "",
  descripcion: "",
  marca: "",
  moneda: "USD",
  idioma: "es",
  precio_unitario: "",
  combos: [],
};

const ProductsPage = () => {
  const navigate = useNavigate();

  /* ── Productos ── */
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Integración Dropi del usuario ── */
  const [dropiIntegration, setDropiIntegration] = useState(null);
  const [dropiLinkModal, setDropiLinkModal] = useState(false);

  /* ── CRUD ── */
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [portadaFile, setPortadaFile] = useState(null);
  const [portadaPreview, setPortadaPreview] = useState(null);

  /* ── Negocios cache ── */
  const [negocios, setNegocios] = useState([]);
  const [negociosLoading, setNegociosLoading] = useState(false);

  /* ── Modal importar Dropi ── */
  const [dropiModal, setDropiModal] = useState(false);
  const [dropiStep, setDropiStep] = useState(1);
  const [selectedNegocio, setSelectedNegocio] = useState(null);
  const [dropiProductos, setDropiProductos] = useState([]);
  const [dropiLoading, setDropiLoading] = useState(false);
  const [dropiSearch, setDropiSearch] = useState("");
  const [selectedDropiProduct, setSelectedDropiProduct] = useState(null);
  const [dropiImporting, setDropiImporting] = useState(false);

  /* ── Modal alimentar negocio ── */
  const [alimentarModal, setAlimentarModal] = useState(false);
  const [alimentarProducto, setAlimentarProducto] = useState(null);
  const [alimentarNegocio, setAlimentarNegocio] = useState(null);
  const [alimentarLoading, setAlimentarLoading] = useState(false);

  /* ── Integración Shopify ── */
  const [shopifyModal, setShopifyModal] = useState(false);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyShopName, setShopifyShopName] = useState("");

  const [enviarShopifyModal, setEnviarShopifyModal] = useState(false);
  const [enviarShopifyImage, setEnviarShopifyImage] = useState(null); // { url, name }

  /* ════════ FETCHES ════════ */
  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.get("gemini/productos");
      if (res.data?.isSuccess) setProductos(res.data.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDropiIntegration = useCallback(async () => {
    try {
      const res = await chatApi.get("dropi_integrations/my-integration");
      setDropiIntegration(res.data?.data || null);
    } catch {
      /* silencioso */
    }
  }, []);

  const fetchShopifyStatus = useCallback(async () => {
    try {
      const res = await chatApi.get("shopify/status");
      setShopifyConnected(res.data?.connected || false);
      setShopifyShopName(
        res.data?.data?.shop_name || res.data?.data?.shop_domain || "",
      );
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    fetchProductos();
    fetchDropiIntegration();
    fetchShopifyStatus();
  }, [fetchProductos, fetchDropiIntegration, fetchShopifyStatus]);

  const fetchNegocios = async () => {
    if (negocios.length > 0) return negocios;
    setNegociosLoading(true);
    try {
      const res = await chatApi.get("gemini/mis-negocios");
      const data = res.data?.data || [];
      setNegocios(data);
      return data;
    } catch {
      Toast.fire({ icon: "error", title: "Error al cargar negocios" });
      return [];
    } finally {
      setNegociosLoading(false);
    }
  };

  /* ════════ NAVIGATE TO FULL GENERATOR ════════ */
  const goToFullGenerator = (p) => {
    // Parsear combos si viene como string
    let combos = [];
    if (p.combos) {
      try {
        combos = typeof p.combos === "string" ? JSON.parse(p.combos) : p.combos;
        if (!Array.isArray(combos)) combos = [];
      } catch {
        combos = [];
      }
    }

    navigate("/insta_landing", {
      state: {
        fromProducto: true,
        id_producto: p.id,
        nombre: p.nombre || "",
        descripcion: p.descripcion || "",
        marca: p.marca || "",
        moneda: p.moneda || "USD",
        idioma: p.idioma || "es",
        precio_unitario: p.precio_unitario || "",
        combos,
        imagen_portada: p.imagen_portada || null,
      },
    });
  };

  /* ════════ CRUD ════════ */
  const resetForm = () => {
    setForm(FORM_INIT);
    setEditingProduct(null);
    setPortadaFile(null);
    if (portadaPreview?.startsWith("blob:"))
      URL.revokeObjectURL(portadaPreview);
    setPortadaPreview(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (p) => {
    // Parsear combos
    let combos = [];
    if (p.combos) {
      try {
        combos = typeof p.combos === "string" ? JSON.parse(p.combos) : p.combos;
        if (!Array.isArray(combos)) combos = [];
      } catch {
        combos = [];
      }
    }

    setForm({
      nombre: p.nombre || "",
      descripcion: p.descripcion || "",
      marca: p.marca || "",
      moneda: p.moneda || "USD",
      idioma: p.idioma || "es",
      precio_unitario: p.precio_unitario || "",
      combos,
    });
    setEditingProduct(p);
    setPortadaFile(null);
    setPortadaPreview(p.imagen_portada || null);
    setShowModal(true);
  };

  const handlePortadaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (portadaPreview?.startsWith("blob:"))
      URL.revokeObjectURL(portadaPreview);
    setPortadaFile(file);
    setPortadaPreview(URL.createObjectURL(file));
  };

  const removePortada = () => {
    if (portadaPreview?.startsWith("blob:"))
      URL.revokeObjectURL(portadaPreview);
    setPortadaFile(null);
    setPortadaPreview(null);
  };

  const handleSave = async () => {
    if (!form.nombre.trim())
      return Toast.fire({ icon: "error", title: "El nombre es requerido" });
    setSaving(true);
    try {
      // Incluir idioma y combos en el payload
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        marca: form.marca,
        moneda: form.moneda,
        idioma: form.idioma,
        precio_unitario: form.precio_unitario,
        combos: form.combos,
      };

      let productoId = editingProduct?.id;
      if (editingProduct) {
        await chatApi.put(`gemini/productos/${editingProduct.id}`, payload, {
          silentError: true,
        });
      } else {
        const r = await chatApi.post("gemini/productos", payload, {
          silentError: true,
        });
        productoId = r.data?.data?.id;
      }

      if (portadaFile && productoId) {
        const fd = new FormData();
        fd.append("imagen_portada", portadaFile);
        await chatApi.patch(
          `gemini/productos/${productoId}/portada-upload`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      } else if (
        editingProduct &&
        editingProduct.imagen_portada &&
        !portadaPreview
      ) {
        await chatApi.patch(`gemini/productos/${productoId}/portada`, {
          image_url: null,
        });
      }

      Toast.fire({
        icon: "success",
        title: editingProduct ? "Producto actualizado" : "Producto creado",
      });
      setShowModal(false);
      resetForm();
      fetchProductos();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `"${p.nombre}" se desactivará. Las imágenes generadas se conservarán.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    try {
      await chatApi.delete(`gemini/productos/${p.id}`);
      Toast.fire({ icon: "success", title: "Producto eliminado" });
      fetchProductos();
    } catch {
      Toast.fire({ icon: "error", title: "Error al eliminar" });
    }
  };

  /* ════════ DROPI IMPORT ════════ */
  const loadDropiProducts = async (negocio, search = "") => {
    setDropiLoading(true);
    setDropiProductos([]);
    try {
      const payload = negocio?._userIntegration
        ? {
            keywords: search,
            pageSize: 40,
            startData: 0,
            order_by: "id",
            order_type: "desc",
          }
        : {
            id_configuracion: negocio.id,
            keywords: search,
            pageSize: 40,
            startData: 0,
            order_by: "id",
            order_type: "desc",
          };
      const res = await chatApi.post("gemini/dropi/productos", payload);
      const items = res.data?.data?.objects || res.data?.data || [];
      setDropiProductos(Array.isArray(items) ? items : []);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title:
          err?.response?.data?.message || "Error al cargar productos Dropi",
      });
    } finally {
      setDropiLoading(false);
    }
  };

  const openDropiModal = async () => {
    setDropiModal(true);
    setDropiProductos([]);
    setDropiSearch("");
    setSelectedDropiProduct(null);
    if (dropiIntegration) {
      const sentinel = { id: null, _userIntegration: true };
      setSelectedNegocio(sentinel);
      setDropiStep(2);
      await loadDropiProducts(sentinel);
    } else {
      setSelectedNegocio(null);
      setDropiStep(1);
      await fetchNegocios();
    }
  };

  const closeDropiModal = () => {
    setDropiModal(false);
    setDropiStep(1);
    setSelectedNegocio(null);
    setDropiProductos([]);
    setSelectedDropiProduct(null);
    setDropiSearch("");
  };

  const handleSelectNegocioDropi = async (n) => {
    setSelectedNegocio(n);
    setDropiStep(2);
    await loadDropiProducts(n);
  };

  const handleDropiSearch = (e) => {
    e.preventDefault();
    if (selectedNegocio) loadDropiProducts(selectedNegocio, dropiSearch);
  };

  const handleConfirmDropiImport = async () => {
    if (!selectedNegocio || !selectedDropiProduct) return;
    setDropiImporting(true);
    try {
      await chatApi.post("gemini/dropi/importar", {
        id_configuracion: selectedNegocio.id,
        dropi_product_id: selectedDropiProduct.id,
      });
      Toast.fire({
        icon: "success",
        title: "Producto importado desde Dropi ✓",
      });
      closeDropiModal();
      fetchProductos();
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al importar",
      });
    } finally {
      setDropiImporting(false);
    }
  };

  /* ════════ ALIMENTAR NEGOCIO ════════ */
  const openAlimentarModal = async (p) => {
    setAlimentarProducto(p);
    setAlimentarNegocio(null);
    setAlimentarModal(true);
    await fetchNegocios();
  };

  const handleAlimentarNegocio = async () => {
    if (!alimentarNegocio || !alimentarProducto) return;
    setAlimentarLoading(true);
    try {
      const res = await chatApi.post(
        `gemini/productos/${alimentarProducto.id}/alimentar-negocio`,
        { id_configuracion: alimentarNegocio.id },
      );
      Toast.fire({
        icon: res.data?.alreadyExists ? "info" : "success",
        title: res.data?.alreadyExists
          ? "Este producto ya fue exportado a ese negocio"
          : "Producto exportado al negocio ✓",
      });
      setAlimentarModal(false);
      setAlimentarProducto(null);
      setAlimentarNegocio(null);
    } catch (err) {
      Toast.fire({
        icon: "error",
        title: err?.response?.data?.message || "Error al exportar",
      });
    } finally {
      setAlimentarLoading(false);
    }
  };

  /* ════════ RENDER ════════ */
  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* ══ HEADER ══ */}
      <div
        className="relative overflow-hidden rounded-3xl mb-6"
        style={{ background: "#0f1129" }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
            transform: "translate(35%, -45%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
            transform: "translateY(55%)",
          }}
        />

        <div className="relative px-6 sm:px-8 py-6 sm:py-7">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.22)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#a5b4fc" }}
            >
              InstaLanding · Catálogo
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Mis Productos
                <span
                  className="block text-lg sm:text-xl mt-0.5 font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, #a5b4fc 0%, #67e8f9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  para landing pages con IA
                </span>
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Organiza tus productos y genera banners publicitarios. Cada
                producto agrupa sus imágenes.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {/* ── Importar desde Dropi ── */}
              <button
                onClick={openDropiModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: "rgba(249,115,22,0.12)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  color: "#f97316",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(249,115,22,0.18)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(249,115,22,0.12)")
                }
              >
                <i className="bx bx-import text-sm" />
                <span className="hidden sm:inline">Importar desde</span>
                <span className="font-black">Dropi</span>
              </button>

              {/* ── Vincular Dropi ── */}

              <button
                onClick={() => setDropiLinkModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: dropiIntegration
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(249,115,22,0.1)",
                  border: `1px solid ${dropiIntegration ? "rgba(249,115,22,0.3)" : "rgba(249,115,22,0.28)"}`,
                  color: "#f97316",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = dropiIntegration
                    ? "rgba(255,255,255,1)"
                    : "rgba(249,115,22,0.16)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = dropiIntegration
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(249,115,22,0.1)")
                }
              >
                <i
                  className={`bx ${dropiIntegration ? "bx-check-circle" : "bx-plug"} text-sm`}
                />
                <span className="hidden sm:inline">
                  {dropiIntegration
                    ? `Dropi · ${dropiIntegration.store_name}`
                    : "Vincular Dropi"}
                </span>
                <span className="sm:hidden">Dropi</span>
              </button>

              {/* ── Vincular Shopify ── */}
              <button
                onClick={() => setShopifyModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: shopifyConnected
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(149,191,71,0.1)",
                  border: `1px solid ${shopifyConnected ? "rgba(34,197,94,0.3)" : "rgba(149,191,71,0.28)"}`,
                  color: shopifyConnected ? "#86efac" : "#95BF47",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = shopifyConnected
                    ? "rgba(34,197,94,0.18)"
                    : "rgba(149,191,71,0.18)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = shopifyConnected
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(149,191,71,0.1)")
                }
              >
                <i
                  className={`bx ${shopifyConnected ? "bx-check-circle" : "bx-store"} text-sm`}
                />
                <span className="hidden sm:inline">
                  {shopifyConnected
                    ? `Shopify · ${shopifyShopName}`
                    : "Conectar Shopify"}
                </span>
                <span className="sm:hidden">Shopify</span>
              </button>

              {/* ── Nuevo producto ── */}
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
                }}
              >
                <i className="bx bx-plus text-sm" /> Nuevo producto
              </button>
            </div>
          </div>

          {!loading && productos.length > 0 && (
            <div
              className="flex items-center gap-6 mt-5 pt-5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <span className="text-xl font-black text-white">
                  {productos.length}
                </span>
                <span
                  className="text-[11px] ml-1.5"
                  style={{ color: "rgba(255,255,255,0.32)" }}
                >
                  productos
                </span>
              </div>
              <div
                className="w-px h-5"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <div>
                <span className="text-xl font-black text-white">
                  {productos.reduce(
                    (a, p) => a + (p.total_generaciones || 0),
                    0,
                  )}
                </span>
                <span
                  className="text-[11px] ml-1.5"
                  style={{ color: "rgba(255,255,255,0.32)" }}
                >
                  imágenes IA
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ BODY ══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center"
            style={{ background: "rgba(99,102,241,0.08)" }}
          >
            <svg
              className="animate-spin w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="#6366f1"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="#6366f1"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400">
            Cargando productos…
          </p>
        </div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div
            className="w-20 h-20 rounded-3xl grid place-items-center"
            style={{ background: "#f1f5f9", border: "2px dashed #d1d5db" }}
          >
            <i className="bx bx-package text-3xl text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-600">
            Aún no tienes productos
          </p>
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Crea tu primer producto o impórtalo directamente desde tu catálogo
            Dropi
          </p>
          <div className="flex gap-2.5 mt-1">
            <button
              onClick={openDropiModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
              style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.25)",
                color: "#f97316",
              }}
            >
              <i className="bx bx-import text-sm" /> Importar desde Dropi
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95"
              style={{ background: "#0f1129" }}
            >
              <i className="bx bx-plus text-sm" /> Crear producto
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productos.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              shopifyConnected={shopifyConnected}
              onNavigate={() => navigate(`/insta_landing_productos/${p.id}`)}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p)}
              onAlimentar={() => openAlimentarModal(p)}
              onGenerateComplete={() => goToFullGenerator(p)}
              onSendToShopify={() => {
                if (!shopifyConnected) {
                  setShopifyModal(true);
                  return;
                }
                setEnviarShopifyImage({
                  url: p.imagen_portada,
                  name: p.nombre,
                });
                setEnviarShopifyModal(true);
              }}
            />
          ))}
          <button
            onClick={openCreate}
            className="rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md"
            style={{ border: "2px dashed #d1d5db", minHeight: "240px" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center"
              style={{ background: "rgba(99,102,241,0.06)" }}
            >
              <i className="bx bx-plus text-xl" style={{ color: "#a5b4fc" }} />
            </div>
            <span className="text-xs font-bold text-gray-400">
              Nuevo producto
            </span>
          </button>
        </div>
      )}

      {/* ══ MODALES ══ */}
      <ModalCrudProducto
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        editingProduct={editingProduct}
        form={form}
        setForm={setForm}
        portadaPreview={portadaPreview}
        onPortadaChange={handlePortadaChange}
        onRemovePortada={removePortada}
        saving={saving}
        onSave={handleSave}
      />

      <ModalImportarDropi
        open={dropiModal}
        onClose={closeDropiModal}
        dropiStep={dropiStep}
        setDropiStep={setDropiStep}
        selectedNegocio={selectedNegocio}
        negocios={negocios}
        negociosLoading={negociosLoading}
        dropiProductos={dropiProductos}
        dropiLoading={dropiLoading}
        dropiSearch={dropiSearch}
        setDropiSearch={setDropiSearch}
        selectedDropiProduct={selectedDropiProduct}
        dropiImporting={dropiImporting}
        dropiIntegration={dropiIntegration}
        onSelectNegocio={handleSelectNegocioDropi}
        onSearch={handleDropiSearch}
        onSelectProduct={(prod) => {
          setSelectedDropiProduct(prod);
          setDropiStep(3);
        }}
        onConfirmImport={handleConfirmDropiImport}
      />

      <ModalAlimentarNegocio
        open={alimentarModal}
        onClose={() => {
          setAlimentarModal(false);
          setAlimentarProducto(null);
          setAlimentarNegocio(null);
        }}
        producto={alimentarProducto}
        negocios={negocios}
        negociosLoading={negociosLoading}
        selectedNegocio={alimentarNegocio}
        onSelectNegocio={setAlimentarNegocio}
        loading={alimentarLoading}
        onConfirm={handleAlimentarNegocio}
      />

      <VincularDropiModal
        open={dropiLinkModal}
        onClose={() => setDropiLinkModal(false)}
        integration={dropiIntegration}
        onSaved={fetchDropiIntegration}
        Swal={Swal}
      />

      <VincularShopifyModal
        open={shopifyModal}
        onClose={() => setShopifyModal(false)}
        onConnected={() => {
          fetchShopifyStatus();
          setShopifyModal(false);
        }}
        Swal={Swal}
      />
      <EnviarShopifyModal
        open={enviarShopifyModal}
        onClose={() => {
          setEnviarShopifyModal(false);
          setEnviarShopifyImage(null);
        }}
        imageUrl={enviarShopifyImage?.url}
        imageName={enviarShopifyImage?.name}
        Swal={Swal}
      />
    </div>
  );
};

export default ProductsPage;
