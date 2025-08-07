import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const ProductosView = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImagen, setModalImagen] = useState({ abierta: false, url: "" });
  const [form, setForm] = useState({ nombre: "", descripcion: "", tipo: "", precio: "", id_categoria: "", imagen: null });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchData = async () => {
  const idc = localStorage.getItem("id_configuracion");
  if (!idc) {
    return Swal.fire({
      icon: "error",
      title: "Falta configuración",
      text: "No se encontró el ID de configuración"
    });
  }

  try {
    const [prodRes, catRes] = await Promise.all([
      chatApi.post("/productos/listarProductos", { id_configuracion: parseInt(idc) }),
      chatApi.post("/categorias/listarCategorias", { id_configuracion: parseInt(idc) }),
    ]);
    setProductos(prodRes.data.data);
    setCategorias(catRes.data.data);
  } catch {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo cargar la información"
    });
  }
};


  useEffect(fetchData, []);

  const handleSubmit = async (e) => {
  e.preventDefault();
  const idc = parseInt(localStorage.getItem("id_configuracion"));
  const data = new FormData();
  Object.entries(form).forEach(([k, v]) => v && data.append(k, v));
  if (editingId) data.append("id_producto", editingId);
  else data.append("id_configuracion", idc);

  try {
    const url = editingId ? "/productos/actualizarProducto" : "/productos/agregarProducto";
    await chatApi.post(url, data, { headers: { "Content-Type": "multipart/form-data" } });

    Swal.fire({
      icon: "success",
      title: `Producto ${editingId ? "actualizado" : "agregado"}`,
      text: "La operación fue exitosa"
    });

    setModalOpen(false);
    setForm({ nombre: "", descripcion: "", tipo: "", precio: "", id_categoria: "", imagen: null });
    setEditingId(null);
    fetchData();
  } catch {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el producto"
    });
  }
};


  const openModal = (p = null) => {
    if (p) {
      setForm({ ...p, imagen: null });
      setEditingId(p.id);
    } else {
      setForm({ nombre: "", descripcion: "", tipo: "", precio: "", id_categoria: "", imagen: null });
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const handleDelete = async (p) => {
  const result = await Swal.fire({
    title: "¿Eliminar producto?",
    text: p.nombre,
    icon: "warning",
    showCancelButton: true
  });

  if (result.isConfirmed) {
    try {
      await chatApi.delete("/productos/eliminarProducto", { data: { id_producto: p.id } });
      Swal.fire({
        icon: "success",
        title: "Producto eliminado",
        text: p.nombre
      });
      fetchData();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo eliminar el producto"
      });
    }
  }
};


  const filtered = productos.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-4 md:px-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="bg-indigo-700 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Productos o Servicios</h1>
          <button onClick={() => openModal()} className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded-md shadow text-white font-medium transition">+ Agregar Producto</button>
        </header>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <input type="text" placeholder="Buscar producto..." value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} className="border rounded px-3 py-2 w-full sm:w-1/3" />
            <div className="flex gap-2 items-center">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
              <span>Página {currentPage} de {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Siguiente</button>
            </div>
          </div>
          {paginated.length === 0 ? (
            <p className="text-gray-500">No hay productos.</p>
          ) : (
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider">
                <tr>
                  {["ID","Nombre","Precio","Tipo","Categoría","Imagen","Acciones"].map(h => (
                    <th key={h} className="p-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-100 transition">
                    <td className="p-3">{p.id}</td>
                    <td className="p-3">{p.nombre}</td>
                    <td className="p-3">${p.precio}</td>
                    <td className="p-3">{p.tipo}</td>
                    <td className="p-3">{categorias.find(c => c.id === p.id_categoria)?.nombre || "-"}</td>
                    <td className="p-3">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt="" className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80 transition" onClick={() => setModalImagen({ abierta:true, url: p.imagen_url })} />
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button onClick={() => openModal(p)} className="text-yellow-600 hover:underline">Editar</button>
                      <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300 animate-slide-up">
            <h2 className="text-2xl font-semibold mb-4">{editingId ? "Editar Producto" : "Agregar Producto"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nombre" className="w-full border rounded p-3" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              <textarea placeholder="Descripción" className="w-full border rounded p-3" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Tipo" className="w-full border rounded p-3" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} />
                <input required type="number" step="0.01" placeholder="Precio" className="w-full border rounded p-3" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} />
              </div>
              <select required className="w-full border rounded p-3" value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })}>
                <option value="">Seleccione categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, imagen: e.target.files[0] })} className="w-full" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow">{editingId ? "Actualizar" : "Agregar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalImagen.abierta && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setModalImagen({ abierta: false, url: "" })}>
          <img src={modalImagen.url} alt="Vista previa" className="max-h-[90vh] max-w-[90vw] rounded shadow-lg transition-transform duration-300" />
        </div>
      )}
    </div>
  );
};

export default ProductosView;
