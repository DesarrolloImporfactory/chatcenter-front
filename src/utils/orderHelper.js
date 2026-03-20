export const NO_IMAGE = "https://app.dropi.ec/assets/utils/no-image.jpg";
const CLOUDFRONT = "https://d39ru7awumhhs2.cloudfront.net";

// ── identificadores / estado ──
export const showOrderId = (o) =>
  o?.id || o?.order_id || o?.pedido_id || o?.numero_orden || "—";

export const showOrderStatus = (o) => o?.status || o?.estado || "Sin estado";

export const showOrderDate = (o) =>
  o?.created_at || o?.createdAt || o?.fecha || "";

export const normalizeStatus = (st = "") =>
  String(st || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");

export const isCancelled = (o) =>
  normalizeStatus(showOrderStatus(o)) === "CANCELADO";

export const isPendingConfirm = (o) =>
  normalizeStatus(showOrderStatus(o)) === "PENDIENTE CONFIRMACION";

export const canEditOrder = (o) => isPendingConfirm(o);

// ── fechas ──
export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── estilos por estado ──
export const statusStyle = (st = "") => {
  const s = String(st).toUpperCase();
  if (s === "ENTREGADO")
    return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
  if (s === "PENDIENTE")
    return "bg-amber-500/20 text-amber-200 border-amber-400/30";
  if (s === "CONFIRMADO") return "bg-sky-500/20 text-sky-200 border-sky-400/30";
  if (s === "ENVIADO")
    return "bg-indigo-500/20 text-indigo-200 border-indigo-400/30";
  if (s === "CANCELADO")
    return "bg-rose-500/20 text-rose-200 border-rose-400/30";
  return "bg-white/10 text-white/80 border-white/10";
};

// ── getters de detalle ──
export const getFirstDetail = (o) => o?.orderdetails?.[0] || null;
export const getProduct = (o) => getFirstDetail(o)?.product || null;
export const getProductName = (o) => getProduct(o)?.name || "—";
export const getProductSku = (o) => getProduct(o)?.sku || "—";
export const getQty = (o) => getFirstDetail(o)?.quantity ?? "—";

export const getWarehouseName = (o) => {
  return (
    getFirstDetail(o)?.warehouse_product?.[0]?.warehouse?.[0]?.name ||
    o?.warehouse?.name ||
    "—"
  );
};

export const getPhone = (o, selectedChat) =>
  o?.phone || selectedChat?.celular_cliente || selectedChat?.celular || "—";

export const getTransportadora = (o) =>
  o?.shipping_company ||
  o?.distribution_company?.name ||
  o?.shippingCompany ||
  "—";

export const getShippingAmount = (o) => o?.shipping_amount ?? "—";

export const getTotal = (o) =>
  o?.total_order ?? o?.total ?? o?.monto ?? o?.valor ?? "—";

export const getCityState = (o) => {
  const city = o?.city || o?.city_name || "";
  const st = o?.state || o?.state_name || "";
  return [city, st].filter(Boolean).join(", ") || "—";
};

// ── imagen de producto (CloudFront) ──
export const resolveProductImage = (p) => {
  if (!p) return null;

  // 1) galería con main flag o primer item
  const gallery = Array.isArray(p?.gallery) ? p.gallery : [];
  const mainGalleryItem = gallery.find((g) => g.main) || gallery[0] || null;

  if (mainGalleryItem) {
    const raw = mainGalleryItem.url || mainGalleryItem.urlS3;
    if (raw) {
      if (/^https?:\/\//i.test(String(raw))) return String(raw);
      return `${CLOUDFRONT}/${String(raw).replace(/^\/+/, "")}`;
    }
  }

  // 2) campos directos del producto
  const direct =
    p?.imageUrl ||
    p?.image_url ||
    p?.image ||
    p?.url ||
    p?.photo ||
    p?.main_image ||
    null;

  if (direct && /^https?:\/\//i.test(String(direct))) return String(direct);

  // 3) urlS3 suelto
  const urlS3 = p?.urlS3 || p?.url_s3 || null;
  if (urlS3) {
    return `${CLOUDFRONT}/${String(urlS3).replace(/^\/+/, "")}`;
  }

  return null;
};

export const getProductImage = (o) => {
  const p = getProduct(o);
  return resolveProductImage(p) || NO_IMAGE;
};

// ── helpers para crear orden ──
export const pickSupplierId = (p) =>
  Number(p?.user?.id || p?.user_id || 0) || null;

export const pickWarehouseId = (p) =>
  Number(
    p?.warehouse_product?.[0]?.warehouse_id ||
      p?.warehouse_product?.[0]?.warehouse?.id ||
      0,
  ) || null;

export const pickRemitCodDaneFromProduct = (rawProduct) => {
  if (!rawProduct) return "";
  const cod = rawProduct?.warehouse_product?.[0]?.warehouse?.city?.cod_dane;
  return String(cod || "").trim();
};

export const pickDistributionCompanyFromQuote = (q) => {
  if (!q) return null;

  if (q?.distributionCompany?.id && q?.distributionCompany?.name) {
    return {
      id: Number(q.distributionCompany.id),
      name: String(q.distributionCompany.name),
    };
  }

  const id =
    Number(q?.transportadora_id || q?.distribution_company_id || 0) || null;
  const name =
    q?.transportadora ||
    q?.distribution_company?.name ||
    q?.shipping_company ||
    q?.name ||
    "";

  if (id && String(name).trim()) return { id, name: String(name).trim() };
  return null;
};
