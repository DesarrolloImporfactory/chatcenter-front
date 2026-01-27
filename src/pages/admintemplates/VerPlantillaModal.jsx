// VerPlantillaModal.jsx
import React from "react";

const VerPlantillaModal = ({ plantilla, onClose }) => {
  if (!plantilla) return null;

  const { name, language, category, components } = plantilla;

  // ====== Extraer HEADER / BODY / FOOTER / BUTTONS ======
  const comps = Array.isArray(components) ? components : [];

  let header = {
    format: null, // TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION | UNKNOWN
    text: "",
    mediaUrl: "",
    location: null, // { latitude, longitude, name, address }
  };

  let bodyText = "";
  let footerText = "";
  let buttons = [];

  comps.forEach((comp) => {
    if (!comp || !comp.type) return;

    if (comp.type === "HEADER") {
      const fmt = String(
        comp.format || (comp.text ? "TEXT" : "UNKNOWN"),
      ).toUpperCase();

      header.format = fmt;

      const ex = comp?.example || {};

      if (fmt === "TEXT") {
        header.text =
          comp.text ||
          (Array.isArray(ex?.header_text) ? ex.header_text[0] : "") ||
          "";
      } else if (fmt === "LOCATION") {
        // Meta a veces no envía ejemplo; si viene, lo intentamos leer
        const rawLoc =
          (Array.isArray(ex?.header_location)
            ? ex.header_location[0]
            : ex?.header_location) ||
          (Array.isArray(ex?.location) ? ex.location[0] : ex?.location) ||
          null;

        if (rawLoc && typeof rawLoc === "object") {
          const latitude = rawLoc.latitude ?? rawLoc.lat ?? null;
          const longitude = rawLoc.longitude ?? rawLoc.lng ?? null;
          const locName = rawLoc.name ?? "";
          const address = rawLoc.address ?? "";
          header.location = { latitude, longitude, name: locName, address };
        } else {
          header.location = null;
        }
      } else {
        // Meta suele traer example.header_handle[0] con un URL
        header.mediaUrl =
          (Array.isArray(ex?.header_handle) ? ex.header_handle[0] : "") ||
          (Array.isArray(ex?.header_url) ? ex.header_url[0] : "") ||
          "";
      }
    } else if (comp.type === "BODY") {
      bodyText = comp.text || "";
    } else if (comp.type === "FOOTER") {
      footerText = comp.text || "";
    } else if (comp.type === "BUTTONS") {
      if (Array.isArray(comp.buttons)) {
        buttons = comp.buttons;
      }
    }
  });

  const headerLabel = (() => {
    const fmt = header.format;
    if (!fmt) return "";
    const map = {
      TEXT: "Texto",
      IMAGE: "Imagen",
      VIDEO: "Video",
      DOCUMENT: "Documento",
      LOCATION: "Ubicación",
    };
    return map[fmt] || fmt;
  })();

  const renderHeaderPreview = () => {
    if (!header.format) return null;

    // Badge tipo de header (ahora solo dice "Header: X")
    const Badge = (
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
        Header: {headerLabel}
      </div>
    );

    if (header.format === "TEXT") {
      return (
        <div>
          {Badge}
          {header.text ? (
            <div className="font-bold">{header.text}</div>
          ) : (
            <div className="text-gray-500">—</div>
          )}
        </div>
      );
    }

    if (header.format === "IMAGE") {
      return (
        <div>
          {Badge}
          {header.mediaUrl ? (
            <img
              src={header.mediaUrl}
              alt="Header imagen"
              className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600">
              Imagen (sin ejemplo disponible)
            </div>
          )}
        </div>
      );
    }

    if (header.format === "VIDEO") {
      return (
        <div>
          {Badge}
          {header.mediaUrl ? (
            <video
              controls
              className="w-full max-h-48 rounded-lg border border-gray-200"
              src={header.mediaUrl}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600">
              Video (sin ejemplo disponible)
            </div>
          )}
        </div>
      );
    }

    if (header.format === "DOCUMENT") {
      return (
        <div>
          {Badge}
          <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-lg">📄</span>
              <span className="text-sm">Documento</span>
            </div>
            {header.mediaUrl ? (
              <a
                href={header.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm font-medium hover:underline"
              >
                Ver / Descargar
              </a>
            ) : (
              <span className="text-gray-500 text-sm">Sin ejemplo</span>
            )}
          </div>
        </div>
      );
    }

    if (header.format === "LOCATION") {
      const loc = header.location;

      const mapLink = (() => {
        if (loc?.latitude != null && loc?.longitude != null) {
          return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
        }
        if (loc?.address) {
          return `https://www.google.com/maps?q=${encodeURIComponent(
            loc.address,
          )}`;
        }
        return null;
      })();

      return (
        <div>
          {Badge}

          {/* “Mapa” simulado */}
          <div className="w-full rounded-lg border border-gray-200 overflow-hidden">
            <div
              className="h-32 w-full relative"
              style={{
                background:
                  "linear-gradient(0deg, rgba(240,240,240,1), rgba(250,250,250,1))",
              }}
            >
              {/* grid tipo mapa */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,0,0,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.08) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />

              {/* pin */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <span className="text-xs text-gray-700 font-semibold">
                    Ubicación
                  </span>
                </div>
              </div>
            </div>

            {/* datos */}
            <div className="p-3 bg-white">
              {loc?.name && (
                <div className="text-sm font-semibold text-gray-800">
                  {loc.name}
                </div>
              )}

              {loc?.address && (
                <div className="text-xs text-gray-600 mt-1">{loc.address}</div>
              )}

              {loc?.latitude != null && loc?.longitude != null && (
                <div className="text-[11px] text-gray-500 mt-1">
                  {loc.latitude}, {loc.longitude}
                </div>
              )}

              {!loc && (
                <div className="text-sm text-gray-600">
                  Ubicación (sin ejemplo disponible)
                </div>
              )}

              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-600 text-sm font-medium hover:underline"
                >
                  Abrir en Maps
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Cualquier otro tipo
    return (
      <div>
        {Badge}
        <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600">
          Header tipo: {headerLabel || "Desconocido"}
        </div>
      </div>
    );
  };

  const getButtonTitle = (btn) => {
    if (!btn) return undefined;

    if (btn.type === "URL") {
      // Meta Graph: url + example[0]
      const url = btn.url || "";
      const ex = Array.isArray(btn.example) ? btn.example[0] : "";
      if (ex) return `Ejemplo: ${ex}`;
      if (url) return `URL: ${url}`;

      // Compatibilidad con estructura anterior (si llegara a existir)
      if (btn.linkType === "dynamic") {
        const base = btn.urlBase || "";
        const v = btn.urlVar || "";
        if (base && v) {
          return `Ejemplo: ${base.endsWith("/") ? base + v : base + "/" + v}`;
        }
      }

      return "URL";
    }

    return undefined;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div
        className="
          bg-white
          p-6
          rounded-xl
          shadow-lg
          w-full
          max-w-lg
          relative
        "
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-2">Vista Previa</h2>

        {/* info rápida arriba */}
        <div className="text-sm text-gray-600 mb-4">
          <span className="font-semibold text-gray-800">{name}</span>{" "}
          <span className="mx-1">•</span>
          <span>{category}</span>
        </div>

        {/* Simulación de “chat preview” */}
        <div className="border border-gray-300 rounded overflow-hidden text-sm mb-4">
          <div
            className="
              relative
              w-full
              h-full
              p-3
              flex
              flex-col
              gap-2
              max-h-[300px]
              overflow-y-auto
            "
            style={{
              backgroundColor: "#DAD3CC",
              backgroundImage:
                'url("https://imp-datas.s3.amazonaws.com/images/2026-01-05T17-28-02-060Z-fondo_chat_center.png")',
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundBlendMode: "overlay",
              opacity: 0.8,
            }}
          >
            {(header.format ||
              bodyText ||
              footerText ||
              buttons.length > 0) && (
              <div
                className="
                  self-end
                  bg-white
                  rounded-lg
                  shadow
                  text-black
                  max-w-[80%]
                  p-3
                  flex
                  flex-col
                  gap-2
                  whitespace-pre-wrap
                  break-words
                "
              >
                {/* HEADER (Texto / Imagen / Video / Documento / Ubicación) */}
                {header.format && renderHeaderPreview()}

                {/* BODY */}
                {bodyText && <div>{bodyText}</div>}

                {/* FOOTER */}
                {footerText && (
                  <div className="text-xs text-gray-600">{footerText}</div>
                )}

                {/* BUTTONS */}
                {buttons.length > 0 && (
                  <div className="flex flex-col mt-2">
                    {buttons.map((btn, i) => (
                      <React.Fragment key={i}>
                        <hr className="border-gray-300 my-1" />
                        <div
                          className="
                            text-blue-600
                            text-sm
                            px-3
                            py-2
                            rounded
                            text-center
                            cursor-pointer
                          "
                          title={getButtonTitle(btn)}
                        >
                          {btn?.text || "(sin texto)"}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerPlantillaModal;
