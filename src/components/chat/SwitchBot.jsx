const BotSwitch = ({ botActivo, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      className={`w-14 h-7 flex items-center rounded-full px-1 cursor-pointer transition-all duration-300
        ${botActivo ? "bg-emerald-500" : "bg-gray-400"}
        hover:shadow-lg`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center
          ${botActivo ? "translate-x-7" : "translate-x-0"}
        `}
      >
        <i
          className={`bx bx-bot text-gray-600 text-[14px] transition-opacity duration-300 ${
            botActivo ? "opacity-100" : "opacity-70"
          }`}
        ></i>
      </div>
    </div>
  );
};

export default BotSwitch;
