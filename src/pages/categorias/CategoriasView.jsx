import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const CategoriasView = () => {
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchCategorias = async () => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) {
      return Swal.fire({
        icon: "error",
        title: "Falta configuración",
        text: "No se encontró el ID de configuración"
      });
    }

    try {
      const res = await chatApi.post("/categorias/listarCategorias", {
        id_configuracion: parseInt(idc),
      });
      setCategorias(res.data.data);
    } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar categorías"
        });
      }

  };

  useEffect(fetchCategorias, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { nombre: form.nombre, descripcion: form.descripcion };
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    try {
      if (editingId) {
        await chatApi.post("/categorias/actualizarCategoria", { id_categoria: editingId, ...payload });
        Swal.fire({
          icon: "success",
          title: "Categoría actualizada",
          text: "Se ha actualizado exitosamente"
        });
      } else {
        await chatApi.post("/categorias/agregarCategoria", { id_configuracion: idc, ...payload });
        Swal.fire({
          icon: "success",
          title: "Categoría agregada",
          text: "Se ha guardado correctamente"
        });
      }
      setModalOpen(false);
      setForm({ nombre: "", descripcion: "" });
      setEditingId(null);
      fetchCategorias();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar la categoría"
      });
    }
  };

  const openModal = (cat = null) => {
    if (cat) { setEditingId(cat.id); setForm({ nombre: cat.nombre, descripcion: cat.descripcion }); }
    else { setEditingId(null); setForm({ nombre: "", descripcion: "" }); }
    setModalOpen(true);
  };

  const handleDelete = async (cat) => {
    const result = await Swal.fire({ title: "Eliminar categoría?", text: cat.nombre, icon: "warning", showCancelButton: true });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/categorias/eliminarCategoria", { data: { id_categoria: cat.id } });
        Swal.fire({
          icon: "success",
          title: "Categoría eliminada",
          text: cat.nombre
        });

        fetchCategorias();
      } catch {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo eliminar la categoría"
        });
      }
    }
  };

  const filtered = categorias.filter((cat) => cat.nombre.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-4 md:px-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="bg-indigo-700 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Categorías</h1>
          <button onClick={() => openModal()} className="bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-md shadow text-white font-medium">+ Agregar</button>
        </header>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <input type="text" placeholder="Buscar categoría..." value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} className="border rounded px-3 py-2 w-full sm:w-1/3" />
            <div className="flex gap-2 items-center">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
              <span>Página {currentPage} de {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Siguiente</button>
            </div>
          </div>
          {paginated.length === 0 ? (
            <p className="text-gray-500 text-center">No hay categorías.</p>
          ) : (
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider">
                <tr>
                  {["ID","Nombre","Descripción","Acciones"].map(h => (
                    <th key={h} className="p-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(cat => (
                  <tr key={cat.id} className="border-t hover:bg-gray-100 transition">
                    <td className="p-3">{cat.id}</td>
                    <td className="p-3">{cat.nombre}</td>
                    <td className="p-3">{cat.descripcion}</td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button onClick={() => openModal(cat)} className="text-yellow-600 hover:underline">Editar</button>
                      <button onClick={() => handleDelete(cat)} className="text-red-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all duration-300 animate-slide-up">
            <h2 className="text-2xl font-semibold mb-4">{editingId ? "Editar Categoría" : "Agregar Categoría"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full border rounded p-3" />
              <textarea placeholder="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="w-full border rounded p-3" />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow">{editingId ? "Actualizar" : "Agregar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriasView;
