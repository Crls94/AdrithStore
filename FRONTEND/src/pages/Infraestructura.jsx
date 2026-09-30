import { useEffect, useRef, useState } from 'react';
import api from '../api/axiosConfig';

const ESTADOS = { MEDIDO: 'Medido', ESTIMADO: 'Estimado', NO_DISPONIBLE: 'No disponible' };
function valor(m) {
  if (m.valor == null) return '—';
  if (m.unidad === 'bytes') return `${(m.valor / 1024 / 1024).toLocaleString('es-PE', { maximumFractionDigits: 1 })} MiB`;
  if (m.unidad === 'ratio') return `${(m.valor * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;
  if (m.id === 'process.start.time') return new Date(m.valor * 1000).toLocaleString('es-PE');
  return `${m.valor.toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${m.unidad}`;
}

export default function Infraestructura() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const solicitud = useRef(null);
  async function cargar(incluirActividad = false) {
    if (solicitud.current) return;
    const controller = new AbortController();
    solicitud.current = controller;
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/infraestructura/metricas', { params: { incluirActividad }, signal: controller.signal });
      setDatos(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.response?.status === 403 ? 'Solo ADMINISTRADOR puede consultar estas métricas.' : 'No fue posible actualizar. La captura anterior puede estar desactualizada.');
    } finally {
      if (solicitud.current === controller) { solicitud.current = null; setCargando(false); }
    }
  }
  useEffect(() => {
    cargar();
    return () => { solicitud.current?.abort(); solicitud.current = null; };
  }, []);

  function descargar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `adrithstore-metricas-${datos.actualizadoEn.replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const boton = 'rounded-lg bg-brand text-white px-4 py-2 text-sm disabled:opacity-50';
  return <main className="p-4 lg:p-7 text-ink dark:text-gray-100 max-w-7xl mx-auto">
    <h1 className="text-2xl font-bold">Infraestructura / Consumo</h1>
    <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">Servidor actual · Solo ADMINISTRADOR · Actualización manual</p>
    <div className="flex flex-wrap gap-2 my-4">
      <button className={boton} disabled={cargando} onClick={() => cargar()}> {cargando ? 'Cargando…' : 'Actualizar métricas'}</button>
      <button className={boton} disabled={cargando} onClick={() => cargar(true)}>Cargar métricas y actividad comercial</button>
      <button className={boton} disabled={!datos || cargando} onClick={descargar}>Descargar captura JSON</button>
    </div>
    {error && <p role="alert" className="p-3 rounded-lg bg-red-100 text-red-900 mb-4">{error}</p>}
    <div aria-live="polite" aria-busy={cargando}>
      {datos && <>
        <div className="p-4 rounded-xl border border-brand/20 mb-4">
          <p className="font-semibold">Estado de la observación: {datos.estadoGeneral === 'DISPONIBLE' ? 'Disponible' : 'Parcial: algunas métricas no están disponibles'}</p>
          <p className="text-sm mt-1">Última captura: {new Date(datos.actualizadoEn).toLocaleString('es-PE')}</p>
          <p className="text-sm mt-2">El pool muestra conexiones, sin comprobar conectividad SQL. Los contadores HTTP y GC se reinician con cada proceso y pertenecen a esta instancia. La latencia es la media acumulada.</p>
          <p className="text-sm mt-1">Para comparar varios días, descarga capturas y conserva la fecha de inicio del proceso. No se conserva historial en el servidor.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {datos.secciones.map(s => <section key={s.id} className="rounded-xl border border-brand/20 bg-white dark:bg-[#14221C] p-4">
            <h2 className="text-lg font-bold mb-3">{s.nombre}</h2>
            <dl className="space-y-3">{s.metricas.map(m => <div key={m.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <dt className="text-sm flex justify-between gap-2">{m.nombre}<span className="text-xs text-gray-500 dark:text-gray-400">{ESTADOS[m.estado] || 'No disponible'}</span></dt>
              <dd className="text-xl font-semibold mt-1">{valor(m)}</dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.detalle}</dd>
            </div>)}</dl>
          </section>)}
        </div>
      </>}
    </div>
    <section className="mt-4 rounded-xl border border-dashed border-gray-400 p-4">
      <h2 className="font-bold">Neon · Pendiente</h2>
      <p className="text-sm mt-1">Proveedor aún no conectado. CU-hours, storage y egress no disponibles.</p>
    </section>
  </main>;
}
