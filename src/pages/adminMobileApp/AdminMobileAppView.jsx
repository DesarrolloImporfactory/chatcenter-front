import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import chatApi from "../../api/chatcenter";
import authService from "../../auth/AuthService";

const BASE = "/mobile/android";

const AdminMobileAppView = () => {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [apk, setApk] = useState(null);
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [error, setError] = useState("");
  const isSuperAdmin =
    authService.getCurrentUser()?.role === "super_administrador";

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await chatApi.get(`${BASE}/latest`, {
        silentError: true,
      });
      setLatest(data);
      setVersionCode(String(Number(data.version_code) + 1));
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setLatest(null);
        setVersionCode("1");
      } else {
        setError(
          requestError.response?.data?.message ||
            "No se pudo consultar la versión publicada.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const publish = async (event) => {
    event.preventDefault();
    if (!apk) return toast.error("Selecciona el APK que vas a publicar.");
    if (!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(versionName)) {
      return toast.error("Escribe la versión con formato 0.1.2.");
    }

    const payload = new FormData();
    payload.append("apk", apk);
    payload.append("version_name", versionName.trim());
    payload.append("version_code", versionCode.trim());
    payload.append("release_notes", releaseNotes.trim());

    setPublishing(true);
    try {
      const { data } = await chatApi.post(`${BASE}/publish`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });
      setLatest(data.data);
      setApk(null);
      setVersionName("");
      setVersionCode(String(Number(data.data.version_code) + 1));
      setReleaseNotes("");
      event.target.reset();
      toast.success(data.message || "Versión publicada.");
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message || "No se pudo publicar el APK.",
      );
    } finally {
      setPublishing(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          Esta pantalla está disponible solo para superadministradores.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-8">
      <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
          Distribución Android
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Imporchat Android</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Publica el APK firmado. Los teléfonos consultan esta versión al abrir
          la app y descargan el instalador desde el API.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Versión disponible
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              El manifiesto público lo sirve{" "}
              <code>chatapi.imporchat.com</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={loadLatest}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>
        {loading ? (
          <p className="mt-5 text-sm text-slate-500">Consultando…</p>
        ) : error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : latest ? (
          <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-slate-500">Versión</p>
              <p className="mt-1 font-bold text-slate-900">
                {latest.version_name} (#{latest.version_code})
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">SHA-256</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                {latest.sha256}
              </p>
            </div>
            {latest.release_notes && (
              <p className="text-slate-600 sm:col-span-3">
                {latest.release_notes}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Aún no se publicó ninguna versión Android.
          </p>
        )}
      </section>

      <form
        onSubmit={publish}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Publicar APK</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usa un APK de producción firmado con la misma clave de las versiones
            anteriores.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">
            Nombre de versión
            <input
              required
              value={versionName}
              onChange={(event) => setVersionName(event.target.value)}
              placeholder="0.1.2"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
            />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">
            Código de versión
            <input
              required
              type="number"
              min="1"
              value={versionCode}
              onChange={(event) => setVersionCode(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
          APK de producción
          <input
            required
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(event) => setApk(event.target.files?.[0] || null)}
            className="block w-full rounded-xl border border-slate-300 p-2 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
          />
          {apk && (
            <span className="block font-normal text-slate-500">
              {apk.name} · {(apk.size / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
        </label>

        <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
          Novedades
          <textarea
            rows={3}
            maxLength={2000}
            value={releaseNotes}
            onChange={(event) => setReleaseNotes(event.target.value)}
            placeholder="Mejoras y correcciones de esta versión."
            className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
          />
        </label>

        <button
          type="submit"
          disabled={publishing || !apk}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishing ? "Subiendo y publicando…" : "Publicar versión"}
        </button>
      </form>
    </div>
  );
};

export default AdminMobileAppView;
