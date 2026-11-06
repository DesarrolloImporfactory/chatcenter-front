import chatApi from "../api/chatcenter";

/* Meta devuelve las plantillas paginadas (máximo 100 por página). Pedir una
   sola página dejaba fuera las plantillas de la 101 en adelante: en cuentas
   con más de 100 el selector "Responder con plantilla" no las mostraba y la
   búsqueda tampoco las encontraba (caso cfg 265, continuar_conversacion era
   la número 101). Aquí se sigue el cursor `after` hasta la última página. */
const MAX_PAGINAS = 20; // tope de seguridad: 2000 plantillas

export async function obtenerTodasLasPlantillas(id_configuracion) {
  const todas = [];
  let after = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data } = await chatApi.post(
      "/whatsapp_managment/obtenerTemplatesWhatsapp",
      { id_configuracion, limit: 100, ...(after ? { after } : {}) },
    );

    const lote = Array.isArray(data?.data) ? data.data : [];
    todas.push(...lote);

    const siguiente = data?.paging?.cursors?.after;
    if (!data?.paging?.next || !siguiente || lote.length === 0) break;
    after = siguiente;
  }

  return todas;
}
