import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";

const ProductosView = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImagen, setModalImagen] = useState({ abierta: false, url: "" });
  const [form, setForm] = useState({ nombre: "", descripcion: "", tipo: "", precio: "", id_categoria: "", imagen: null });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    const idc = localStorage.getItem("id_configuracion");
    if (!idc) return Swal.fire("Error", "Falta configuración", "error");
    try {
      const [prodRes, catRes] = await Promise.all([
        chatApi.post("/productos/listarProductos", { id_configuracion: parseInt(idc) }),
        chatApi.post("/categorias/listarCategorias", { id_configuracion: parseInt(idc) }),
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
      await chatApi.post(url, data, { headers: { "Content-Type": "multipart/form-data" } });
      Swal.fire("✅", `Producto ${editingId ? "actualizado" : "agregado"}`, "success");
      setModalOpen(false);
      setForm({ nombre: "", descripcion: "", tipo: "", precio: "", id_categoria: "", imagen: null });
      setEditingId(null);
      fetchData();
    } catch {
      Swal.fire("❌", "No se pudo guardar el producto", "error");
    }
  };

  const openModal = (p = null) => {
    if (p) setForm({ nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo, precio: p.precio, id_categoria: p.id_categoria, imagen: null }), setEditingId(p.id);
    else setForm({ nombre: "", descripcion: "", tipo: "", precio: "", id_categoria: "", imagen: null }), setEditingId(null);
    setModalOpen(true);
  };

  const handleDelete = async (p) => {
    const result = await Swal.fire({ title: "Eliminar producto?", text: p.nombre, icon: "warning", showCancelButton: true });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/productos/eliminarProducto", { data: { id_producto: p.id } });
        Swal.fire("✅ Eliminado", p.nombre, "success");
        fetchData();
      } catch {
        Swal.fire("❌", "Error al eliminar", "error");
      }
    }
  };

  const columns = [
    { name: "ID", selector: (r) => r.id, sortable: true, maxWidth: "80px" },
    { name: "Nombre", selector: (r) => r.nombre, sortable: true },
    { name: "Precio", selector: (r) => `$${r.precio}`, sortable: true },
    { name: "Tipo", selector: (r) => r.tipo },
    {
      name: "Categoría",
      selector: (r) => categorias.find((c) => c.id === r.id_categoria)?.nombre || "-",
    },
    {
      name: "Imagen",
      cell: (r) =>
        r.imagen_url ? (
          <img
            src={r.imagen_url}
            alt={r.nombre}
            className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80 transition"
            onClick={() => setModalImagen({ abierta: true, url: r.imagen_url })}
          />
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      name: "Acciones",
      cell: (r) => (
        <div className="flex gap-2">
          <button onClick={() => openModal(r)} className="text-yellow-600 hover:underline">Editar</button>
          <button onClick={() => handleDelete(r)} className="text-red-600 hover:underline">Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="bg-blue-700 text-white p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Productos</h1>
          <button onClick={() => openModal()} className="bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-md shadow">
            + Nuevo Producto
          </button>
        </header>
        <div className="p-6">
          <DataTable columns={columns} data={productos} pagination highlightOnHover striped noHeader />
        </div>
      </div>

      {/* Modal producto */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {editingId ? "Editar Producto" : "Agregar Producto"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nombre" className="w-full border rounded p-2"
                value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <textarea placeholder="Descripción" className="w-full border rounded p-2"
                value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Tipo" className="w-full border rounded p-2"
                  value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                <input required type="number" step="0.01" placeholder="Precio" className="w-full border rounded p-2"
                  value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </div>
              <select required className="w-full border rounded p-2"
                value={form.id_categoria} onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}>
                <option value="">Seleccione categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, imagen: e.target.files[0] })} />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow">
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
            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default ProductosView;
