import React, { useEffect, useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaDollarSign,
} from "react-icons/fa";

import Swal from "sweetalert2";
import chatApi from "../../api/chatcenter";
import ModalCrearPlan from "../../components/planes/modales/ModalCrearPlan";
import ModalEditarPlan from "../../components/planes/modales/ModalEditarPlan";
import ModalEditarPrecio from "../../components/planes/modales/ModalEditarPrecio";

const ListaPlanes = () => {
  const [planes, setPlanes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    tipo_membresia: "",
    n_conversaciones: "",
    n_conexiones: "",
    max_subusuarios: "",
    max_conexiones: "",
    id_producto: "",
  });

  const [modalPrecioOpen, setModalPrecioOpen] = useState(false);

  const [formPrecio, setFormPrecio] = useState({
    id_price: "",
    id_producto: "",
    new_amount: "",
    tipo_membresia: "",
  });

  const obtenerPlanes = async () => {
    try {
      const res = await chatApi.get("/stripepro/listar_productos");
      setPlanes(res.data.data);
    } catch (error) {
      console.error("Error al obtener planes:", error);
    }
  };

  useEffect(() => {
    obtenerPlanes();
  }, []);

  // =====================
  // FILTRO DE BÚSQUEDA
  // =====================
  const planesFiltrados = planes.filter((plan) =>
    plan.nombre_plan.toLowerCase().includes(busqueda.toLowerCase())
  );

  // =====================
  // ESTADÍSTICAS
  // =====================
  const totalPlanes = planes.length;
  const activos = planes.filter((p) => p.activo === 1).length;
  const inactivos = planes.filter((p) => p.activo === 0).length;

  // =====================
  // CREAR PLAN
  // =====================
  const abrirModalCrear = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      tipo_membresia: "",
      n_conversaciones: "",
      n_conexiones: "",
      max_subusuarios: "",
      max_conexiones: "",
      id_producto: "",
    });
    setModalCrearOpen(true);
  };

  const submitCrear = async () => {
    try {
      const res = await chatApi.post("/stripepro/crear_producto", {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: formData.precio,
        tipo_membresia: formData.tipo_membresia,
        n_conversaciones: formData.n_conversaciones,
        n_conexiones: formData.n_conexiones,
        max_subusuarios: formData.max_subusuarios,
        max_conexiones: formData.max_conexiones,
      });

      if (res.data?.status === true) {
        Swal.fire({
          icon: "success",
          title: "Producto creado",
          text: "El plan se registró correctamente.",
          confirmButtonColor: "#2563eb",
        });
      }

      setModalCrearOpen(false);
      obtenerPlanes();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo crear el producto", "error");
    }
  };

  // =====================
  // EDITAR PLAN
  // =====================
  const abrirModalEditar = (plan) => {
    setFormData({
      nombre: plan.nombre_plan,
      descripcion: plan.descripcion_plan,
      n_conversaciones: plan.n_conversaciones,
      n_conexiones: plan.n_conexiones,
      max_subusuarios: plan.max_subusuarios,
      max_conexiones: plan.max_conexiones,
      id_producto: plan.id_product_stripe,
    });
    setModalEditarOpen(true);
  };

  const submitEditar = async () => {
    try {
      const res = await chatApi.patch("/stripepro/editar_producto", {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        n_conversaciones: formData.n_conversaciones,
        n_conexiones: formData.n_conexiones,
        max_subusuarios: formData.max_subusuarios,
        max_conexiones: formData.max_conexiones,
        id_producto: formData.id_producto,
      });

      if (res.data?.status === true) {
        Swal.fire({
          icon: "success",
          title: "Cambios guardados",
          text: "El plan se actualizó correctamente.",
          confirmButtonColor: "#2563eb",
        });
      }

      setModalEditarOpen(false);
      obtenerPlanes();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo editar el producto", "error");
    }
  };

  // =====================
  // EDITAR PRECIO PLAN
  // =====================

  const abrirModalPrecio = (plan) => {
    setFormPrecio({
      id_price: plan.id_price,
      id_producto: plan.id_product_stripe,
      new_amount: "",
      tipo_membresia: plan.tipo_membresia || "",
    });

    setModalPrecioOpen(true);
  };

  const submitEditarPrecio = async () => {
    try {
      const res = await chatApi.delete("/stripepro/editar_precio", {
        data: {
          id_price: formPrecio.id_price,
          id_producto: formPrecio.id_producto,
          new_amount: formPrecio.new_amount,
          tipo_membresia: formPrecio.tipo_membresia,
        },
      });

      if (res.data?.status === true) {
        Swal.fire({
          icon: "success",
          title: "Precio actualizado",
          text: "El precio del plan se actualizó correctamente.",
          confirmButtonColor: "#2563eb",
        });
      }

      setModalPrecioOpen(false);
      obtenerPlanes();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo actualizar el precio", "error");
    }
  };

  // =====================
  // ELIMINAR PLAN
  // =====================
  const handleEliminar = (id) => {
    Swal.fire({
      title: "¿Eliminar este plan?",
      text: "Esta acción no se puede revertir.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (r) => {
      if (r.isConfirmed) {
        try {
          await chatApi.delete("/stripepro/eliminar_producto", {
            data: {
              id_producto: id,
            },
          });
          Swal.fire("Eliminado", "Plan eliminado", "success");
          obtenerPlanes();
        } catch {
          Swal.fire("Error", "No se pudo eliminar", "error");
        }
      }
    });
  };

  //activar producto

  const activarProducto = async (id_producto) => {
    try {
      const res = await chatApi.put("/stripepro/activar_producto", {
        id_producto,
      });

      if (res.data?.status === true) {
        Swal.fire({
          icon: "success",
          title: "Producto activado",
          text: "El plan fue activado correctamente.",
          confirmButtonColor: "#2563eb",
        });
      }

      obtenerPlanes();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo activar el producto", "error");
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* ===========================
          CARDS DE ESTADÍSTICAS
      ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl shadow-md p-5">
          <p className="text-green-600 text-sm">Planes activos</p>
          <h2 className="text-2xl font-bold text-green-700">{activos}</h2>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl shadow-md p-5">
          <p className="text-red-600 text-sm">Planes inactivos</p>
          <h2 className="text-2xl font-bold text-red-700">{inactivos}</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-md p-5">
          <p className="text-blue-600 text-sm">Planes registrados</p>
          <h2 className="text-2xl font-bold text-blue-700">{totalPlanes}</h2>
        </div>
      </div>

      {/* ===========================
              TÍTULO + BOTÓN + BUSCADOR
      ============================ */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-xl font-bold text-gray-800 tracking-wide">
          Planes disponibles
        </h1>

        {/* BUSCADOR */}
        <div className="flex items-center bg-white px-4 py-2 rounded-xl shadow-md border w-full md:w-72">
          <FaSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Buscar plan..."
            className="ml-3 outline-none w-full"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* BOTÓN NUEVO */}
        <button
          onClick={abrirModalCrear}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg transition-all"
        >
          <FaPlus />
          Nuevo Plan
        </button>
      </div>

      {/* ===========================
                  TABLA
      ============================ */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">NOMBRE</th>
              <th className="p-4">PRECIO</th>
              <th className="p-4">DESCRIPCIÓN</th>
              <th className="p-4">CONVERSACIONES</th>
              <th className="p-4">CONEXIONES</th>
              <th className="p-4">USUARIOS</th>
              <th className="p-4">ACTIVO</th>
              <th className="p-4 text-center">ACCIONES</th>
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {planesFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  className="p-6 text-center text-gray-400 italic"
                >
                  No hay planes que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              planesFiltrados.map((plan) => (
                <tr
                  key={plan.id_plan}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-4">{plan.id_plan}</td>
                  <td className="p-4 font-medium">{plan.nombre_plan}</td>
                  <td className="p-4">${plan.precio_plan}</td>
                  <td className="p-4">{plan.descripcion_plan}</td>
                  <td className="p-4">{plan.n_conversaciones}</td>
                  <td className="p-4">{plan.max_conexiones}</td>
                  <td className="p-4">{plan.max_subusuarios}</td>
                  {plan.activo === 1 ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                      Activo
                    </span>
                  ) : (
                    <button
                      onClick={() => activarProducto(plan.id_product_stripe)}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white shadow hover:opacity-90 transition"
                    >
                      Activar
                    </button>
                  )}

                  <td className="p-4">
                    <div className="flex justify-center gap-5">
                      {/* EDITAR */}
                      <button
                        onClick={() => abrirModalEditar(plan)}
                        className="text-blue-600 hover:text-blue-800 transition"
                      >
                        <FaEdit size={18} />
                      </button>

                      {/* ELIMINAR SOLO SI ACTIVO === 0 */}
                      {plan.activo === 1 && (
                        <>
                          <button
                            onClick={() =>
                              handleEliminar(plan.id_product_stripe)
                            }
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <FaTrash size={18} />
                          </button>

                          <button
                            onClick={() => abrirModalPrecio(plan)}
                            className="text-yellow-600 hover:text-yellow-800 transition"
                            title="Editar precio"
                          >
                            <FaDollarSign size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ModalCrearPlan
        open={modalCrearOpen}
        onClose={() => setModalCrearOpen(false)}
        data={formData}
        setData={setFormData}
        onSubmit={submitCrear}
      />

      <ModalEditarPlan
        open={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        data={formData}
        setData={setFormData}
        onSubmit={submitEditar}
      />

      <ModalEditarPrecio
        open={modalPrecioOpen}
        onClose={() => setModalPrecioOpen(false)}
        data={formPrecio}
        setData={setFormPrecio}
        onSubmit={submitEditarPrecio}
      />
    </div>
  );
};

export default ListaPlanes;
