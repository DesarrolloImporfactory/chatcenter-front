import React, { useEffect, useState } from "react";
import chatApi from "../../api/chatcenter";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";

const ProductosView = () => {
  const [productos, setProductos] = useState([]);
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
      const decoded = jwtDecode(token);
      const id_config = decoded?.id_configuracion;

      if (!id_config) {
        Swal.fire("Token inválido", "No se encontró id_configuracion", "error");
        return;
      }

      setIdConfiguracion(id_config);
      cargarProductos(id_config);
    } catch (error) {
      console.error("Error al decodificar el token:", error);
      Swal.fire("Error", "Token inválido", "error");
    }
  }, []);

  const cargarProductos = async (id_configuracion) => {
    try {
      const res = await chatApi.post("/productos/listarProductos", {
        id_configuracion,
      });
      setProductos(res.data.data || []);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      Swal.fire("Error", "No se pudieron cargar productos", "error");
    }
  };

  const columnas = [
    { name: "ID", selector: (row) => row.id, sortable: true },
    { name: "Nombre", selector: (row) => row.nombre, sortable: true },
    { name: "Descripción", selector: (row) => row.descripcion },
    { name: "Precio", selector: (row) => `$${row.precio}` },
    {
      name: "Imagen",
      cell: (row) =>
        row.imagen_url ? (
          <img
            src={row.imagen_url}
            alt={row.nombre}
            className="h-12 w-12 object-cover"
          />
        ) : (
          "Sin imagen"
        ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Productos</h2>
      {productos.length === 0 ? (
        <p>No hay productos registrados.</p>
      ) : (
        <DataTable
          columns={columnas}
          data={productos}
          pagination
          highlightOnHover
          striped
          responsive
        />
      )}
    </div>
  );
};

export default ProductosView;
