import { useRef, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

// import "@fullcalendar/core/index.css";
// import "@fullcalendar/daygrid/index.css";
// import "@fullcalendar/timegrid/index.css";
// import "@fullcalendar/list/index.css";

export default function Calendario() {
  const calendarRef = useRef(null);
  const [view, setView] = useState("timeGridWeek");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Demo de usuarios (luego lo cargas desde tu API)
  const usuarios = useMemo(
    () => [
      { id: 1, nombre: "Sebastian Ordoñez", color: "#3b82f6", checked: true },
    ],
    []
  );

  // Eventos de ejemplo (luego reemplazas por tu API)
  const events = [
    {
      id: "1",
      title: "Llamada con cliente",
      start: new Date(),
      end: new Date(new Date().getTime() + 60 * 60 * 1000),
    },
  ];

  const api = () => calendarRef.current?.getApi();

  const gotoToday = () => {
    api()?.today();
    setCurrentDate(new Date(api()?.getDate() || new Date()));
  };

  const gotoPrev = () => {
    api()?.prev();
    setCurrentDate(new Date(api()?.getDate() || new Date()));
  };

  const gotoNext = () => {
    api()?.next();
    setCurrentDate(new Date(api()?.getDate() || new Date()));
  };

  const changeView = (v) => {
    setView(v);
    api()?.changeView(v);
  };

  // Mini-calendario (sidebar)
  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const startWeekDay = monthStart.getDay(); // 0=Domingo
  const days = [];
  for (let i = 0; i < startWeekDay; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++)
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));

  const onMiniClick = (d) => {
    if (!d) return;
    api()?.gotoDate(d);
    setCurrentDate(d);
  };

  return (
    <div className="h-full w-full">
      {/* Tabs superiores */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="flex items-center gap-6 h-14">
            <h1 className="text-xl font-semibold">Calendarios</h1>
            <nav className="flex items-center gap-2 text-sm">
              <button className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 font-medium">
                Vista del calendario
              </button>
              <button className="px-3 py-1.5 rounded-md hover:bg-gray-100">
                Vista de lista de Cita
              </button>
              <button className="px-3 py-1.5 rounded-md hover:bg-gray-100">
                Configuración del calendario
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Calendario principal */}
          <div className="col-span-12 lg:col-span-9">
            {/* Barra de controles */}
            <div className="bg-white rounded-md shadow-sm border">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={gotoToday}
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                  >
                    Hoy
                  </button>
                  <div className="flex">
                    <button
                      onClick={gotoPrev}
                      className="px-2 py-1.5 rounded-l border hover:bg-gray-50"
                      title="Anterior"
                    >
                      ‹
                    </button>
                    <button
                      onClick={gotoNext}
                      className="px-2 py-1.5 rounded-r border hover:bg-gray-50"
                      title="Siguiente"
                    >
                      ›
                    </button>
                  </div>
                  <div className="ml-3 font-medium">
                    {/* Rango visible actual */}
                    {api()?.view?.title || ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-1">
                    <button
                      onClick={() => changeView("timeGridDay")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "timeGridDay" ? "bg-gray-100" : ""
                      }`}
                    >
                      Día
                    </button>
                    <button
                      onClick={() => changeView("timeGridWeek")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "timeGridWeek" ? "bg-gray-100" : ""
                      }`}
                    >
                      Semana
                    </button>
                    <button
                      onClick={() => changeView("dayGridMonth")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "dayGridMonth" ? "bg-gray-100" : ""
                      }`}
                    >
                      Mes
                    </button>
                    <button
                      onClick={() => changeView("listWeek")}
                      className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${
                        view === "listWeek" ? "bg-gray-100" : ""
                      }`}
                    >
                      Lista
                    </button>
                  </div>

                  <button
                    onClick={() => alert("Abrir modal: crear cita")}
                    className="ml-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    + Nuevo
                  </button>
                </div>
              </div>

              {/* Calendario */}
              <div className="border-t">
                <FullCalendar
                  ref={calendarRef}
                  locale={esLocale}
                  plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    listPlugin,
                    interactionPlugin,
                  ]}
                  initialView="timeGridWeek"
                  height="calc(100vh - 220px)"
                  headerToolbar={false}
                  selectable={true}
                  selectMirror={true}
                  nowIndicator={true}
                  slotMinTime="06:00:00"
                  slotMaxTime="21:00:00"
                  events={events}
                  select={(info) => {
                    // Aquí abrirás tu modal de creación con info.start/info.end
                    console.log("Seleccionado:", info.start, info.end);
                  }}
                  eventClick={(info) => {
                    // Aquí abrirás tu modal de detalle/edición
                    console.log("Evento:", info.event.id);
                  }}
                  datesSet={(arg) => {
                    setCurrentDate(
                      new Date(arg.start.getTime() + (arg.end - arg.start) / 2)
                    );
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar derecha */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-md shadow-sm border p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">
                  {currentDate.toLocaleString("es-EC", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="flex">
                  <button
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setMonth(d.getMonth() - 1);
                      setCurrentDate(d);
                      api()?.gotoDate(d);
                    }}
                    className="px-2 py-1 rounded border hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setMonth(d.getMonth() + 1);
                      setCurrentDate(d);
                      api()?.gotoDate(d);
                    }}
                    className="ml-1 px-2 py-1 rounded border hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Mini calendario */}
              <div className="grid grid-cols-7 text-xs text-center mb-1">
                {["D", "L", "M", "M", "J", "V", "S"].map((d) => (
                  <div key={d} className="py-1 text-gray-500">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-sm">
                {days.map((d, i) => {
                  const isToday =
                    d && d.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => onMiniClick(d)}
                      className={`h-8 rounded ${
                        !d
                          ? ""
                          : isToday
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      disabled={!d}
                    >
                      {d ? d.getDate() : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtros: Usuarios */}
            <div className="bg-white rounded-md shadow-sm border p-3">
              <div className="font-medium mb-2">Usuarios</div>
              <div className="space-y-2">
                {usuarios.map((u) => (
                  <label key={u.id} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: u.color }}
                      />
                      {u.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
