import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const CategoriasView = () => {
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchCategorias = async () => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) return Swal.fire("Error", "Falta configuración", "error");
    try {
      const res = await chatApi.post("/categorias/listarCategorias", {
        id_configuracion: parseInt(idc),
      });
      setCategorias(res.data.data);
    } catch {
      Swal.fire("Error", "No se pudieron cargar categorías", "error");
    }
  };

  useEffect(fetchCategorias, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { nombre: form.nombre, descripcion: form.descripcion };
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    try {
      if (editingId) {
        await chatApi.post("/categorias/actualizarCategoria", {
          id_categoria: editingId,
          ...payload,
        });
        Swal.fire("✅", "Categoría actualizada", "success");
      } else {
        await chatApi.post("/categorias/agregarCategoria", {
          id_configuracion: idc,
          ...payload,
        });
        Swal.fire("✅", "Categoría agregada", "success");
      }
      setModalOpen(false);
      setForm({ nombre: "", descripcion: "" });
      setEditingId(null);
      fetchCategorias();
    } catch {
      Swal.fire("❌", "No se pudo guardar", "error");
    }
  };

  const openModal = (cat = null) => {
    if (cat) {
      setEditingId(cat.id);
      setForm({ nombre: cat.nombre, descripcion: cat.descripcion });
    } else {
      setEditingId(null);
      setForm({ nombre: "", descripcion: "" });
    }
    setModalOpen(true);
  };

  const handleDelete = async (cat) => {
    const result = await Swal.fire({
      title: "Eliminar categoría?",
      text: cat.nombre,
      icon: "warning",
      showCancelButton: true,
    });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/categorias/eliminarCategoria", { data: { id_categoria: cat.id } });
        Swal.fire("✅ Eliminado", cat.nombre, "success");
        fetchCategorias();
      } catch {
        Swal.fire("❌", "Error al eliminar", "error");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="bg-blue-700 text-white p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Categorías</h1>
          <button
            onClick={() => openModal()}
            className="bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-md shadow"
          >
            + Agregar
          </button>
        </header>

        <div className="p-6">
          {categorias.length === 0 ? (
            <p className="text-gray-500">No hay categorías registradas</p>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Descripción</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-t hover:bg-gray-100 transition"
                  >
                    <td className="p-3">{cat.id}</td>
                    <td className="p-3">{cat.nombre}</td>
                    <td className="p-3">{cat.descripcion}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => openModal(cat)}
                        className="text-yellow-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Categoría */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {editingId ? "Editar Categoría" : "Agregar Categoría"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-gray-700">Nombre</label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border rounded p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-700">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full border rounded p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
                >
                  {editingId ? "Actualizar" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriasView;
