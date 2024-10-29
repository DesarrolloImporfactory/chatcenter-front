import { useState } from "react";

const Modales = ({
  numeroModal,
  handleSubmit,
  register,
  handleNumeroModal,
  handleNumeroModalForm,
  menuSearchTermNumeroCliente,
  searchResultsNumeroCliente,
  handleOptionSelectNumeroTelefono,
  inputRefNumeroTelefono,
  seleccionado,
  handleInputChange_numeroCliente,
}) => {
  return (
    <>
      {/* Modal de numero */}
      {numeroModal && (
        <div className="fixed inset-0 z-10 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl font-medium">Agregar número</h2>
            <form
              className="grid items-center gap-2 my-4"
              onSubmit={handleSubmit(handleNumeroModalForm)}
            >
              <input
                type="text"
                placeholder="Número de teléfono"
                value={menuSearchTermNumeroCliente}
                onChange={handleInputChange_numeroCliente}
                ref={inputRefNumeroTelefono}
                className="p-2 border rounded"
                {...register("numero", {
                  required: "El número es obligatorio",
                })}
              />

              {/* Resultados de la búsqueda numeros clientes */}
              <ul className="space-y-2">
                  {searchResultsNumeroCliente.length > 0  && seleccionado? (
                    searchResultsNumeroCliente.map((result, index) => (
                      <li
                        key={index}
                        onClick={() => handleOptionSelectNumeroTelefono(result.mensaje)}
                        className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                      >
                        {/* Aquí accedes a propiedades específicas del objeto */}
                        <div>
                          <strong>Atajo:</strong> {result.atajo}
                        </div>
                        <div>
                          <strong>Mensaje:</strong> {result.mensaje}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No hay resultados</li>
                  )}
                </ul>
            </form>
            <div className="flex  gap-3">
              <button className="bg-blue-500 text-white px-4 py-2 rounded">
                Agregar
              </button>
              <button
                onClick={handleNumeroModal}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modales;
