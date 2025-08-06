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
        Swal.fire("Categoría actualizada", "success");
      } else {
        await chatApi.post("/categorias/agregarCategoria", {
          id_configuracion: idc,
          ...payload,
        });
        Swal.fire("Categoría agregada", "success");
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
        await chatApi.delete("/categorias/eliminarCategoria", {
          data: { id_categoria: cat.id },
        });
        Swal.fire("Categoría Eliminada", cat.nombre, "success");
        fetchCategorias();
      } catch {
        Swal.fire("❌", "Error al eliminar", "error");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 pt-24 px-6 transition-all duration-300 ease-in-out">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <header className="bg-blue-700 text-white p-6 flex justify-between items-center rounded-t-xl">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Categorías</h1>
          <button
            onClick={() => openModal()}
            className="bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-lg shadow text-white font-medium"
          >
            + Agregar
          </button>
        </header>

        <div className="p-6">
          {categorias.length === 0 ? (
            <p className="text-gray-500">No hay categorías registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 uppercase text-gray-700 text-sm tracking-wider">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat, i) => (
                    <tr
                      key={cat.id}
                      className={`transition hover:bg-gray-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-3">{cat.id}</td>
                      <td className="p-3 font-medium text-gray-800">{cat.nombre}</td>
                      <td className="p-3 text-gray-600">{cat.descripcion}</td>
                      <td className="p-3 text-center space-x-2">
                        <button
                          onClick={() => openModal(cat)}
                          className="text-yellow-600 hover:underline font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Categoría */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 animate-slide-up">
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
                  className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-700">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow"
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
