const Modales = ({
  numeroModal,
  handleSubmit,
  register,
  handleNumeroModal,
  handleNumeroModalForm,
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
                className="p-2 border rounded"
                {...register("numero", {
                  required: "El número es obligatorio",
                })}
              />
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
