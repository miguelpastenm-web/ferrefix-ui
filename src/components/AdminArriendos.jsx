import { useMemo, useRef, useState } from 'react';
import {
  listarArriendos,
  actualizarArriendo,
  devolverArriendo,
  eliminarArriendo
} from '../api/arriendos';
import { useCarga } from '../hooks/useCarga';
import { clasificarErrorAdmin } from '../utils/errorAdmin';
import { formatearCLP } from '../utils/formato';
import { REGIONES_CHILE, REGION_POR_DEFECTO, normalizarRegion, obtenerComunas, obtenerComunaPorDefecto } from '../data/chile';
import { IndicadorCarga } from './EsperarSesion';
import ErrorCarga from './ErrorCarga';
import ModalConfirmacion from './ModalConfirmacion';

/** Gestión de arriendos en el panel Admin (carga bajo demanda con filtro por estado). */
export default function AdminArriendos({ onNotificar }) {
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const { ultimos, cargando, error, recargar } = useCarga(
    () => listarArriendos(filtroEstado === 'TODOS' ? {} : { estado: filtroEstado }),
    `admin-arriendos-${filtroEstado}`
  );
  const arriendos = useMemo(() => ultimos ?? [], [ultimos]);

  // Modal editar contacto/faena (solo VIGENTE)
  const [arriendoAEditar, setArriendoAEditar] = useState(null);
  const [formEdit, setFormEdit] = useState({
    telefono: '',
    region: REGION_POR_DEFECTO,
    comuna: obtenerComunaPorDefecto(REGION_POR_DEFECTO),
    direccionFaena: ''
  });
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [errorEdit, setErrorEdit] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});

  // Confirmación devolución
  const [arriendoADevolver, setArriendoADevolver] = useState(null);
  const [devolviendo, setDevolviendo] = useState(false);
  const [errorDevolver, setErrorDevolver] = useState('');
  const devolviendoRef = useRef(false);

  // Confirmación eliminar
  const [arriendoAEliminar, setArriendoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const eliminandoRef = useRef(false);

  const abrirEditar = (arr) => {
    const regionNorm = normalizarRegion(arr.regionFaena || REGION_POR_DEFECTO);
    const comunas = obtenerComunas(regionNorm);
    const comunaValida = arr.comunaFaena && comunas.includes(arr.comunaFaena) ? arr.comunaFaena : (comunas[0] || '');
    setFormEdit({
      telefono: arr.telefonoContacto || '',
      region: regionNorm,
      comuna: comunaValida,
      direccionFaena: arr.direccionFaena || ''
    });
    setErrorEdit('');
    setErroresCampo({});
    setArriendoAEditar(arr);
  };

  const cambiarRegion = (nuevaRegion) => {
    const regionNorm = normalizarRegion(nuevaRegion);
    setFormEdit((prev) => ({
      ...prev,
      region: regionNorm,
      comuna: obtenerComunaPorDefecto(regionNorm)
    }));
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!arriendoAEditar || guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    setErrorEdit('');
    setErroresCampo({});
    try {
      await actualizarArriendo(arriendoAEditar.id, formEdit);
      const codigo = arriendoAEditar.codigo;
      setArriendoAEditar(null);
      recargar();
      onNotificar?.(`Arriendo ${codigo} actualizado.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorEdit(caso.mensaje);
      setErroresCampo(caso.campos);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar' || caso.tipo === 'conflicto') recargar();
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const confirmarDevolucion = async () => {
    if (!arriendoADevolver || devolviendoRef.current) return;
    devolviendoRef.current = true;
    setDevolviendo(true);
    setErrorDevolver('');
    try {
      await devolverArriendo(arriendoADevolver.id);
      const codigo = arriendoADevolver.codigo;
      setArriendoADevolver(null);
      recargar();
      onNotificar?.(`Devolución de ${codigo} registrada. La unidad volvió a estar disponible.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorDevolver(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar' || caso.tipo === 'conflicto') recargar();
    } finally {
      devolviendoRef.current = false;
      setDevolviendo(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!arriendoAEliminar || eliminandoRef.current) return;
    eliminandoRef.current = true;
    setEliminando(true);
    setErrorEliminar('');
    try {
      await eliminarArriendo(arriendoAEliminar.id);
      const codigo = arriendoAEliminar.codigo;
      setArriendoAEliminar(null);
      recargar();
      onNotificar?.(`Arriendo ${codigo} eliminado.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorEliminar(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargar();
    } finally {
      eliminandoRef.current = false;
      setEliminando(false);
    }
  };

  if (cargando && ultimos === null) return <IndicadorCarga etiqueta="Cargando arriendos…" />;
  if (error && ultimos === null) {
    return <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar los arriendos" />;
  }

  return (
    <div className="admin-box p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
        <div>
          <h2 className="admin-section-title mb-0">Registro de Arriendos</h2>
          <span className="admin-muted">Contratos de maquinaria en faena, devoluciones y edición de contacto</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm rounded-1"
            aria-label="Filtrar arriendos por estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="VIGENTE">Vigentes</option>
            <option value="FINALIZADO">Finalizados</option>
          </select>
          <span className="admin-badge-soft">{arriendos.length} arriendos</span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table admin-table align-middle mb-0">
          <thead>
            <tr>
              <th>Código / Unidad</th>
              <th>Máquina</th>
              <th>Cliente</th>
              <th>Faena y Contacto</th>
              <th>Período</th>
              <th className="admin-ta-end">Total</th>
              <th>Estado</th>
              <th className="admin-ta-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {arriendos.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-ta-center admin-muted py-4">
                  No se encontraron arriendos para el filtro seleccionado.
                </td>
              </tr>
            ) : (
              arriendos.map((arr) => (
                <tr key={arr.id} data-testid="fila-arriendo">
                  <td>
                    <div className="admin-cell-price">{arr.codigo}</div>
                    <div className="admin-order-email">{arr.unidadCodigo}</div>
                  </td>
                  <td>
                    <div className="admin-cell-strong">{arr.maquina?.nombre ?? '—'}</div>
                    <div className="admin-item-brand">{arr.maquina?.marca ?? ''}</div>
                  </td>
                  <td>
                    <div className="admin-cell-strong">{arr.cliente?.nombre ?? '—'}</div>
                    <div className="admin-order-email">{arr.cliente?.rut} · {arr.cliente?.email}</div>
                  </td>
                  <td className="admin-muted">
                    <div>{arr.direccionFaena}, {arr.comunaFaena}</div>
                    <div className="admin-order-email">{arr.telefonoContacto}</div>
                  </td>
                  <td className="admin-muted">
                    <div>{arr.dias} días</div>
                    <div className="admin-order-email">{arr.fechaInicio} al {arr.fechaFin}</div>
                  </td>
                  <td className="admin-ta-end admin-cell-price">{formatearCLP(arr.total)}</td>
                  <td>
                    <span className={arr.estado === 'VIGENTE' ? 'badge bg-success-subtle text-success border border-success-subtle' : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle'}>
                      {arr.estado === 'VIGENTE' ? 'Vigente' : 'Finalizado'}
                    </span>
                  </td>
                  <td className="admin-ta-end">
                    <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                      {arr.estado === 'VIGENTE' && (
                        <>
                          <button type="button" className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2" onClick={() => abrirEditar(arr)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success rounded-1 py-0 px-2"
                            onClick={() => {
                              setErrorDevolver('');
                              setArriendoADevolver(arr);
                            }}
                          >
                            Devolver
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger rounded-1 py-0 px-2"
                        onClick={() => {
                          setErrorEliminar('');
                          setArriendoAEliminar(arr);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Contacto y Faena */}
      {arriendoAEditar && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" role="dialog" aria-modal="true">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  Editar Faena — {arriendoAEditar.codigo}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => !guardando && setArriendoAEditar(null)}></button>
              </div>
              <form onSubmit={guardarEdicion}>
                <div className="modal-body p-3">
                  {errorEdit && <div className="alert alert-danger py-2 small" role="alert">{errorEdit}</div>}

                  <div className="row g-2">
                    <div className="col-12">
                      <label htmlFor="arr-tel" className="form-label small mb-1">Teléfono de contacto *</label>
                      <input
                        id="arr-tel"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.telefono ? 'is-invalid' : ''}`}
                        value={formEdit.telefono}
                        onChange={(e) => setFormEdit({ ...formEdit, telefono: e.target.value })}
                        required
                      />
                      {erroresCampo.telefono && <div className="invalid-feedback">{erroresCampo.telefono}</div>}
                    </div>
                    <div className="col-6">
                      <label htmlFor="arr-region" className="form-label small mb-1">Región *</label>
                      <select
                        id="arr-region"
                        className="form-select form-select-sm rounded-1"
                        value={formEdit.region}
                        onChange={(e) => cambiarRegion(e.target.value)}
                      >
                        {REGIONES_CHILE.map((r) => (
                          <option key={r.region} value={r.region}>{r.region}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label htmlFor="arr-comuna" className="form-label small mb-1">Comuna *</label>
                      <select
                        id="arr-comuna"
                        className={`form-select form-select-sm rounded-1 ${erroresCampo.comuna ? 'is-invalid' : ''}`}
                        value={formEdit.comuna}
                        onChange={(e) => setFormEdit({ ...formEdit, comuna: e.target.value })}
                      >
                        {obtenerComunas(formEdit.region).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {erroresCampo.comuna && <div className="invalid-feedback">{erroresCampo.comuna}</div>}
                    </div>
                    <div className="col-12">
                      <label htmlFor="arr-dir" className="form-label small mb-1">Dirección de faena *</label>
                      <input
                        id="arr-dir"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.direccionFaena ? 'is-invalid' : ''}`}
                        value={formEdit.direccionFaena}
                        onChange={(e) => setFormEdit({ ...formEdit, direccionFaena: e.target.value })}
                        required
                      />
                      {erroresCampo.direccionFaena && <div className="invalid-feedback">{erroresCampo.direccionFaena}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer admin-modal-foot border-top py-2 px-3">
                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-1" onClick={() => setArriendoAEditar(null)} disabled={guardando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-ambar admin-btn-strong rounded-1 px-3" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {arriendoADevolver && (
        <ModalConfirmacion
          titulo="¿Registrar devolución?"
          mensaje={
            <>
              El arriendo <strong>{arriendoADevolver.codigo}</strong> ({arriendoADevolver.unidadCodigo}) pasará a estado{' '}
              <strong>FINALIZADO</strong> y la unidad quedará disponible.
            </>
          }
          textoConfirmar="Confirmar devolución"
          variante="success"
          procesando={devolviendo}
          error={errorDevolver}
          onConfirmar={confirmarDevolucion}
          onCancelar={() => setArriendoADevolver(null)}
        />
      )}

      {arriendoAEliminar && (
        <ModalConfirmacion
          titulo="¿Eliminar arriendo?"
          mensaje={
            <>
              Se eliminará el arriendo <strong>{arriendoAEliminar.codigo}</strong>. Si aún estaba vigente, la unidad quedará libre.
            </>
          }
          textoConfirmar="Eliminar"
          procesando={eliminando}
          error={errorEliminar}
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setArriendoAEliminar(null)}
        />
      )}
    </div>
  );
}

