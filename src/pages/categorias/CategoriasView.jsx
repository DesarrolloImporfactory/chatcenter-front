import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import Swal from "sweetalert2";

const CategoriasView = () => {
  const [categorias, setCategorias] = useState([]);
  const [idConfiguracion, setIdConfiguracion] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
console.log("TOKEN:", token);

if (token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    console.log("Decoded token:", payload);
  } catch (error) {
    console.error("Error al decodificar el token:", error);
  }
}


    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const id_configuracion = decoded?.id_configuracion;

      if (!id_configuracion) {
        Swal.fire("Token inválido", "No se encontró id_configuracion", "error");
        return;
      }

      setIdConfiguracion(id_configuracion);
      cargarCategorias(id_configuracion);
    } catch (error) {
      console.error("Error al decodificar el token:", error);
      Swal.fire("Error", "Token inválido", "error");
    }
  }, []);

  const cargarCategorias = async (id_configuracion) => {
    try {
      const res = await chatApi.post("/categorias/listarCategorias", {
        id_configuracion,
      });
      setCategorias(res.data.data);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      Swal.fire("Error", "No se pudieron cargar categorías", "error");
    }
  };

  return (
    <div className="p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Categorías</h1>
      {categorias.length === 0 ? (
        <p>No hay categorías registradas.</p>
      ) : (
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.id}</td>
                <td className="p-2">{c.nombre}</td>
                <td className="p-2">{c.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CategoriasView;
