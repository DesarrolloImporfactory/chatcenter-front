import React from "react";
import Swal from "sweetalert2";
import chatApi from "../../../api/chatcenter";
import { Toast, Z_INDEX_FIX } from "../EditorShared";
import { subirMediaCatalogo } from "../catalogoMediaUpload";

import CrearPlantillaModal from "../../../pages/admintemplates/CrearPlantillaModal";

// ModalTemplateCatalogo — reusa TU CrearPlantillaModal, pero guarda la
// plantilla en el CATÁLOGO en vez de mandarla a Meta.
//
// onCreate adaptado:
//   1. Si hay headerFile → lo sube con subirMediaCatalogo (modo template,
//      sin validar peso porque Meta re-transcodifica).
//   2. Inyecta la URL en el HEADER como example.header_handle:[url].
//   3. Guarda { name, language, category, components } en el catálogo.
// ════════════════════════════════════════════════════════════════
const ModalTemplateCatalogo = ({ onClose, onSaved }) => {
  const handleCreate = async (payload) => {
    // payload de CrearPlantillaModal: { name, category, language, components, headerFile? }
    try {
      let components = payload.components || [];

      if (payload.headerFile) {
        const data = await subirMediaCatalogo(payload.headerFile, {
          modo: "template",
        });
        const url = data.url;

        components = components.map((c) =>
          c.type === "HEADER" &&
          ["IMAGE", "VIDEO", "DOCUMENT"].includes(c.format)
            ? { ...c, example: { header_handle: [url] } }
            : c,
        );
      }

      const dataObj = {
        name: payload.name,
        language: payload.language,
        category: payload.category,
        components,
      };

      await chatApi.post("/kanban_plantillas_admin/catalogo_item_crear", {
        tipo: "templates_meta",
        data: dataObj,
      });

      Toast.fire({ icon: "success", title: "Plantilla custom creada" });
      onSaved?.();
      onClose();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e.message ||
        "Error al crear la plantilla";
      Swal.fire({
        icon: "error",
        title: msg,
        confirmButtonColor: "#ef4444",
        ...Z_INDEX_FIX,
      });
      throw e; // que tu modal resetee su loader
    }
  };

  return <CrearPlantillaModal onClose={onClose} onCreate={handleCreate} />;
};

export default ModalTemplateCatalogo;
