const DatosUsuario = ({ opciones, animateOut }) => {
  return (
    <>
      {opciones && (
        <div
          className={`col-span-1 bg-[#171931] text-white p-4 ${
            animateOut ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <h2 className="font-medium mb-4">Opciones</h2>
          <p>Detalles adicionales sobre el chat o usuario.</p>
        </div>
      )}
    </>
  );
};

export default DatosUsuario;
