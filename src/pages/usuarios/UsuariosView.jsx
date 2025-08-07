import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";
import { jwtDecode } from 'jwt-decode';

const UsuariosView = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ usuario: "", password: "", email: "", nombre_encargado: "", rol: "" });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchUsuarios = async () => {
    const token = localStorage.getItem("token");
    if (!token) return Swal.fire("Error", "No se encontró token", "error");
    const decoded = jwtDecode(token);
    const id_usuario = decoded.id_usuario;

    try {
      const res = await chatApi.post("/usuarios_chat_center/listarUsuarios", { id_usuario });
      setUsuarios(res.data.data);
    } catch {
      Swal.fire("Error", "No se pudieron cargar los usuarios", "error");
    }
  };

  useEffect(fetchUsuarios, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return Swal.fire("Error", "No se encontró token", "error");
    const decoded = jwtDecode(token);
    const id_usuario = decoded.id_usuario;

    const payload = { ...form };

    try {
      if (editingId) {
        await chatApi.post("/usuarios_chat_center/actualizarUsuario", {
          id_sub_usuario: editingId,
          ...payload,
        });
        Swal.fire("✅", "Usuario actualizado", "success");
      } else {
        await chatApi.post("/usuarios_chat_center/agregarUsuario", {
          id_usuario,
          ...payload,
        });
        Swal.fire("✅", "Usuario creado", "success");
      }
      setModalOpen(false);
      setForm({ usuario: "", password: "", email: "", nombre_encargado: "", rol: "" });
      setEditingId(null);
      fetchUsuarios();
    } catch (error) {
      Swal.fire("❌", error.response?.data?.message || "Error al guardar", "error");
    }
  };

  const openModal = (u = null) => {
    if (u) {
      setForm({ usuario: u.usuario, password: "", email: u.email, nombre_encargado: u.nombre_encargado, rol: u.rol });
      setEditingId(u.id_sub_usuario);
    } else {
      setForm({ usuario: "", password: "", email: "", nombre_encargado: "", rol: "" });
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const handleDelete = async (u) => {
    const result = await Swal.fire({
      title: "Eliminar usuario?",
      text: u.usuario,
      icon: "warning",
      showCancelButton: true,
    });
    if (result.isConfirmed) {
      try {
        await chatApi.delete("/usuarios_chat_center/eliminarSubUsuario", {
          data: { id_sub_usuario: u.id_sub_usuario }
        });
        Swal.fire("✅ Eliminado", u.usuario, "success");
        fetchUsuarios();
      } catch {
        Swal.fire("❌", "Error al eliminar", "error");
      }
    }
  };

  const filtered = usuarios.filter(
    u => u.usuario.toLowerCase().includes(search.toLowerCase()) ||
         u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 pt-24 px-4 md:px-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <header className="bg-indigo-700 text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <button onClick={() => openModal()} className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded-md shadow text-white font-medium transition">+ Nuevo Usuario</button>
        </header>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <input type="text" placeholder="Buscar usuario o email..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="border rounded px-3 py-2 w-full sm:w-1/3" />
            <div className="flex gap-2 items-center text-sm">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100 transition">Anterior</button>
              <span>Página {currentPage} de {totalPages || 1}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100 transition">Siguiente</button>
            </div>
          </div>

          {paginated.length === 0 ? (
            <p className="text-gray-500">No hay usuarios registrados</p>
          ) : (
            <table className="w-full text-left border-collapse">

              <thead>
                <tr className="text-sm text-gray-700">
                  <th className="p-3 text-left">Usuario</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Rol</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((u) => (
                  <tr key={u.id_sub_usuario} className="bg-gray-50 hover:bg-gray-100 transition">
                    <td className="p-3 text-left">{u.usuario}</td>
                    <td className="p-3 text-left">{u.email}</td>
                    <td className="p-3 text-left">{u.nombre_encargado}</td>
                    <td className="p-3 text-left">{u.rol}</td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button onClick={() => openModal(u)} className="text-yellow-600 hover:underline">Editar</button>
                      <button onClick={() => handleDelete(u)} className="text-red-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-2xl font-semibold mb-4">{editingId ? "Editar Usuario" : "Agregar Usuario"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Usuario" className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
              {!editingId && (
                <input required placeholder="Contraseña" type="password" className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              )}
              <input required placeholder="Email" type="email" className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input required placeholder="Nombre Encargado" className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                value={form.nombre_encargado} onChange={(e) => setForm({ ...form, nombre_encargado: e.target.value })} />
              <select required className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-400"
                value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                <option value="">Seleccione rol</option>
                <option value="administrador">Administrador</option>
                <option value="editor">Editor</option>
                <option value="visor">Visor</option>
              </select>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow">
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

export default UsuariosView;
