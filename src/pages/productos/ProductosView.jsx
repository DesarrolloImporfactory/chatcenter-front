import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const ProductosView = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImagen, setModalImagen] = useState({ abierta: false, url: "" });
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: "",
    precio: "",
    id_categoria: "",
    imagen: null,
  });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) return Swal.fire("Error", "Falta configuración", "error");
    try {
      const [prodRes, catRes] = await Promise.all([
        chatApi.post("/productos/listarProductos", {
          id_configuracion: parseInt(idc),
        }),
        chatApi.post("/categorias/listarCategorias", {
          id_configuracion: parseInt(idc),
        }),
      ]);
      setProductos(prodRes.data.data);
      setCategorias(catRes.data.data);
    } catch {
      Swal.fire("Error", "No se pudo cargar la información", "error");
    }
  };

  useEffect(fetchData, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const idc = parseInt(localStorage.getItem("id_configuracion"));
    const data = new FormData();
    data.append("nombre", form.nombre);
    data.append("descripcion", form.descripcion);
    data.append("tipo", form.tipo);
    data.append("precio", form.precio);
    data.append("id_categoria", form.id_categoria);
    if (form.imagen) data.append("imagen", form.imagen);
    if (editingId) data.append("id_producto", editingId);
    else data.append("id_configuracion", idc);

    try {
      const url = editingId ? "/productos/actualizarProducto" : "/productos/agregarProducto";
      await chatApi.post(url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire(`Producto ${editingId ? "actualizado" : "agregado"}`, "success");
      setModalOpen(false);
      setForm({
        nombre: "",
        descripcion: "",
        tipo: "",
        precio: "",
        id_categoria: "",
        imagen: null,
      });
      setEditingId(null);
      fetchData();
    } catch {
      Swal.fire("❌", "No se pudo guardar el producto", "error");
    }
  };

  const openModal = (p = null) => {
    if (p) {
      setForm({
        nombre: p.nombre,
        descripcion: p.descripcion,
        tipo: p.tipo,
        precio: p.precio,
        id_categoria: p.id_categoria,
        imagen: null,
      });
      setEditingId(p.id);
    } else {
      setForm({
        nombre: "",
        descripcion: "",
        tipo: "",
        precio: "",
        id_categoria: "",
        imagen: null,
      });
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const handleDelete = async (p) => {
    const result = await Swal.fire({
      title: "Eliminar producto?",
      text: p.nombre,
      icon: "warning",
      showCancelButton: true,
    });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/productos/eliminarProducto", {
          data: { id_producto: p.id },
        });
        Swal.fire("Producto Eliminado", p.nombre, "success");
        fetchData();
      } catch {
        Swal.fire("❌", "Error al eliminar", "error");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="bg-blue-700 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Productos</h1>
          <button
            onClick={() => openModal()}
            className="bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-md shadow text-white font-medium"
          >
            + Agregar Producto
          </button>
        </header>

        <div className="p-6 overflow-x-auto">
          {productos.length === 0 ? (
            <p className="text-gray-500">No hay productos registrados</p>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead className="bg-gray-50 text-sm text-gray-700">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Precio</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Categoría</th>
                  <th className="p-3 text-left">Imagen</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-100 transition">
                    <td className="p-3">{p.id}</td>
                    <td className="p-3">{p.nombre}</td>
                    <td className="p-3">${p.precio}</td>
                    <td className="p-3">{p.tipo}</td>
                    <td className="p-3">
                      {categorias.find((c) => c.id === p.id_categoria)?.nombre || "-"}
                    </td>
                    <td className="p-3">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80 transition"
                          onClick={() => setModalImagen({ abierta: true, url: p.imagen_url })}
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button onClick={() => openModal(p)} className="text-yellow-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline">
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

      {/* Modal producto */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 animate-slide-up">
            <h2 className="text-2xl font-semibold mb-4">
              {editingId ? "Editar Producto" : "Agregar Producto"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nombre" className="w-full border rounded p-3"
                value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <textarea placeholder="Descripción" className="w-full border rounded p-3"
                value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Tipo" className="w-full border rounded p-3"
                  value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                <input required type="number" step="0.01" placeholder="Precio" className="w-full border rounded p-3"
                  value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </div>
              <select required className="w-full border rounded p-3"
                value={form.id_categoria} onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}>
                <option value="">Seleccione categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, imagen: e.target.files[0] })} className="w-full" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow">
                  {editingId ? "Actualizar" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal imagen */}
      {modalImagen.abierta && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setModalImagen({ abierta: false, url: "" })}
        >
          <img
            src={modalImagen.url}
            alt="Vista previa"
            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg transition-transform duration-300"
          />
        </div>
      )}
    </div>
  );
};

export default ProductosView;
