import { useMemo, useRef, useState } from 'react';
import {
  listarMaquinas,
  crearMaquina,
  actualizarMaquina,
  eliminarMaquina,
  listarUnidadesMaquina,
  agregarUnidadesMaquina,
  eliminarUnidadMaquina
} from '../api/maquinas';
import { useCarga } from '../hooks/useCarga';
import { clasificarErrorAdmin } from '../utils/errorAdmin';
import { formatearCLP } from '../utils/formato';
import { IndicadorCarga } from './EsperarSesion';
import ErrorCarga from './ErrorCarga';
import ModalConfirmacion from './ModalConfirmacion';

const FORM_VACIO = {
  codigo: '',
  nombre: '',
  marca: '',
  categoria: '',
  tarifaDia: '',
  incluye: '',
  imagenUrl: ''
};

/** Gestión de máquinas y sus unidades en el panel Admin (carga bajo demanda). */
export default function AdminMaquinas({ onNotificar }) {
  const { ultimos, cargando, error, recargar } = useCarga(listarMaquinas, 'admin-maquinas');
  const maquinas = useMemo(() => ultimos ?? [], [ultimos]);
  const [busqueda, setBusqueda] = useState('');

  // Modal crear / editar máquina
  const [modalForm, setModalForm] = useState(null); // null | { maquina: obj|null }
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [errorForm, setErrorForm] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});

  // Modal unidades
  const [maquinaUnidades, setMaquinaUnidades] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);
  const [errorUnidades, setErrorUnidades] = useState('');
  const [cantidadAlta, setCantidadAlta] = useState(1);
  const [agregandoUnidades, setAgregandoUnidades] = useState(false);
  const agregandoRef = useRef(false);

  // Confirmación eliminar unidad
  const [unidadAEliminar, setUnidadAEliminar] = useState(null);
  const [eliminandoUnidad, setEliminandoUnidad] = useState(false);
  const [errorEliminarUnidad, setErrorEliminarUnidad] = useState('');
  const eliminandoUnidadRef = useRef(false);

  // Confirmación eliminar máquina
  const [maquinaAEliminar, setMaquinaAEliminar] = useState(null);
  const [eliminandoMaquina, setEliminandoMaquina] = useState(false);
  const [errorEliminarMaquina, setErrorEliminarMaquina] = useState('');
  const eliminandoMaquinaRef = useRef(false);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return maquinas;
    return maquinas.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.marca.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q)
    );
  }, [maquinas, busqueda]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setErrorForm('');
    setErroresCampo({});
    setModalForm({ maquina: null });
  };

  const abrirEditar = (maq) => {
    setForm({
      codigo: maq.codigo || '',
      nombre: maq.nombre || '',
      marca: maq.marca || '',
      categoria: maq.categoria || '',
      tarifaDia: String(maq.tarifaDia ?? ''),
      incluye: maq.incluye || '',
      imagenUrl: maq.imagenUrl || ''
    });
    setErrorForm('');
    setErroresCampo({});
    setModalForm({ maquina: maq });
  };

  const guardarMaquina = async (e) => {
    e.preventDefault();
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    setErrorForm('');
    setErroresCampo({});

    const esEdicion = Boolean(modalForm?.maquina);
    const dto = {
      codigo: (esEdicion ? modalForm.maquina.codigo : form.codigo).trim(),
      nombre: form.nombre.trim(),
      marca: form.marca.trim(),
      categoria: form.categoria.trim(),
      tarifaDia: Number(form.tarifaDia),
      incluye: form.incluye.trim(),
      imagenUrl: form.imagenUrl.trim(),
      especificaciones: modalForm?.maquina?.especificaciones ?? {}
    };

    try {
      const res = esEdicion ? await actualizarMaquina(modalForm.maquina.id, dto) : await crearMaquina(dto);
      setModalForm(null);
      recargar();
      onNotificar?.(esEdicion ? `Máquina "${res.nombre}" actualizada.` : `Máquina "${res.nombre}" creada.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorForm(caso.mensaje);
      setErroresCampo(caso.campos);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargar();
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const cargarUnidades = async (maq) => {
    setCargandoUnidades(true);
    setErrorUnidades('');
    try {
      const lista = await listarUnidadesMaquina(maq.id);
      setUnidades(lista);
    } catch (err) {
      setErrorUnidades(clasificarErrorAdmin(err).mensaje);
    } finally {
      setCargandoUnidades(false);
    }
  };

  const abrirUnidades = (maq) => {
    setMaquinaUnidades(maq);
    setCantidadAlta(1);
    setErrorUnidades('');
    setUnidades([]);
    cargarUnidades(maq);
  };

  const handleAgregarUnidades = async (e) => {
    e.preventDefault();
    if (!maquinaUnidades || agregandoRef.current) return;
    const cant = Number(cantidadAlta);
    if (!Number.isInteger(cant) || cant < 1 || cant > 20) {
      setErrorUnidades('Ingresa una cantidad entre 1 y 20 unidades.');
      return;
    }
    agregandoRef.current = true;
    setAgregandoUnidades(true);
    setErrorUnidades('');
    try {
      await agregarUnidadesMaquina(maquinaUnidades.id, cant);
      await cargarUnidades(maquinaUnidades);
      recargar();
      onNotificar?.(`Se agregaron ${cant} unidad(es) a "${maquinaUnidades.nombre}".`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorUnidades(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargar();
    } finally {
      agregandoRef.current = false;
      setAgregandoUnidades(false);
    }
  };

  const confirmarEliminarUnidad = async () => {
    if (!maquinaUnidades || !unidadAEliminar || eliminandoUnidadRef.current) return;
    eliminandoUnidadRef.current = true;
    setEliminandoUnidad(true);
    setErrorEliminarUnidad('');
    try {
      await eliminarUnidadMaquina(maquinaUnidades.id, unidadAEliminar.id);
      const codigo = unidadAEliminar.codigo;
      setUnidadAEliminar(null);
      await cargarUnidades(maquinaUnidades);
      recargar();
      onNotificar?.(`Unidad "${codigo}" eliminada.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorEliminarUnidad(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') {
        cargarUnidades(maquinaUnidades);
        recargar();
      }
    } finally {
      eliminandoUnidadRef.current = false;
      setEliminandoUnidad(false);
    }
  };

  const confirmarEliminarMaquina = async () => {
    if (!maquinaAEliminar || eliminandoMaquinaRef.current) return;
    eliminandoMaquinaRef.current = true;
    setEliminandoMaquina(true);
    setErrorEliminarMaquina('');
    try {
      await eliminarMaquina(maquinaAEliminar.id);
      const nombre = maquinaAEliminar.nombre;
      setMaquinaAEliminar(null);
      recargar();
      onNotificar?.(`Máquina "${nombre}" eliminada.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorEliminarMaquina(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargar();
    } finally {
      eliminandoMaquinaRef.current = false;
      setEliminandoMaquina(false);
    }
  };

  if (cargando && ultimos === null) return <IndicadorCarga etiqueta="Cargando máquinas…" />;
  if (error && ultimos === null) {
    return <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar las máquinas" />;
  }

  return (
    <div className="admin-box p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
        <div>
          <h2 className="admin-section-title mb-0">Catálogo de Maquinaria</h2>
          <span className="admin-muted">Modelos para arriendo y administración de unidades físicas</span>
        </div>
        <button type="button" className="btn btn-ambar admin-btn-strong btn-sm rounded-1 px-3" onClick={abrirCrear}>
          + Agregar Máquina
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5">
          <input
            type="text"
            className="form-control form-control-sm rounded-1"
            placeholder="Buscar por código, nombre, marca o categoría..."
            aria-label="Buscar máquinas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table admin-table align-middle mb-0">
          <thead>
            <tr>
              <th>Código</th>
              <th>Máquina</th>
              <th>Categoría</th>
              <th className="admin-ta-end">Tarifa / Día</th>
              <th className="admin-ta-center">Unidades</th>
              <th>Estado</th>
              <th className="admin-ta-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-ta-center admin-muted py-4">
                  No hay máquinas registradas con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtradas.map((maq) => (
                <tr key={maq.id} data-testid="fila-maquina">
                  <td className="admin-cell-code">{maq.codigo}</td>
                  <td>
                    <div className="admin-cell-strong">{maq.nombre}</div>
                    <div className="admin-item-brand">{maq.marca}</div>
                  </td>
                  <td><span className="admin-badge-soft">{maq.categoria}</span></td>
                  <td className="admin-ta-end admin-cell-price">{formatearCLP(maq.tarifaDia)}</td>
                  <td className="admin-ta-center admin-mono">
                    {maq.unidadesDisponibles} / {maq.unidadesTotales}
                  </td>
                  <td>
                    <span className={maq.estado === 'DISPONIBLE' ? 'badge bg-success-subtle text-success border border-success-subtle' : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle'}>
                      {maq.estado === 'DISPONIBLE' ? 'Disponible' : 'No disponible'}
                    </span>
                  </td>
                  <td className="admin-ta-end">
                    <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                      <button type="button" className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2" onClick={() => abrirEditar(maq)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2" onClick={() => abrirUnidades(maq)}>
                        Unidades ({maq.unidadesTotales})
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger rounded-1 py-0 px-2"
                        onClick={() => {
                          setErrorEliminarMaquina('');
                          setMaquinaAEliminar(maq);
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

      {/* Modal Crear / Editar Máquina */}
      {modalForm && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" role="dialog" aria-modal="true">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  {modalForm.maquina ? `Editar Máquina (${modalForm.maquina.codigo})` : 'Nueva Máquina'}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => !guardando && setModalForm(null)}></button>
              </div>
              <form onSubmit={guardarMaquina}>
                <div className="modal-body p-3">
                  {errorForm && <div className="alert alert-danger py-2 small" role="alert">{errorForm}</div>}

                  <div className="row g-2">
                    <div className="col-12 col-sm-5">
                      <label htmlFor="maq-codigo" className="form-label small mb-1">Código *</label>
                      <input
                        id="maq-codigo"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.codigo ? 'is-invalid' : ''}`}
                        value={form.codigo}
                        onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                        disabled={Boolean(modalForm.maquina)}
                        required
                      />
                      {erroresCampo.codigo && <div className="invalid-feedback">{erroresCampo.codigo}</div>}
                    </div>
                    <div className="col-12 col-sm-7">
                      <label htmlFor="maq-nombre" className="form-label small mb-1">Nombre *</label>
                      <input
                        id="maq-nombre"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.nombre ? 'is-invalid' : ''}`}
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        required
                      />
                      {erroresCampo.nombre && <div className="invalid-feedback">{erroresCampo.nombre}</div>}
                    </div>
                    <div className="col-6">
                      <label htmlFor="maq-marca" className="form-label small mb-1">Marca *</label>
                      <input
                        id="maq-marca"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.marca ? 'is-invalid' : ''}`}
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        required
                      />
                      {erroresCampo.marca && <div className="invalid-feedback">{erroresCampo.marca}</div>}
                    </div>
                    <div className="col-6">
                      <label htmlFor="maq-categoria" className="form-label small mb-1">Categoría *</label>
                      <input
                        id="maq-categoria"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.categoria ? 'is-invalid' : ''}`}
                        value={form.categoria}
                        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                        required
                      />
                      {erroresCampo.categoria && <div className="invalid-feedback">{erroresCampo.categoria}</div>}
                    </div>
                    <div className="col-6">
                      <label htmlFor="maq-tarifa" className="form-label small mb-1">Tarifa por día (CLP) *</label>
                      <input
                        id="maq-tarifa"
                        type="number"
                        min="1"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.tarifaDia ? 'is-invalid' : ''}`}
                        value={form.tarifaDia}
                        onChange={(e) => setForm({ ...form, tarifaDia: e.target.value })}
                        required
                      />
                      {erroresCampo.tarifaDia && <div className="invalid-feedback">{erroresCampo.tarifaDia}</div>}
                    </div>
                    <div className="col-6">
                      <label htmlFor="maq-imagen" className="form-label small mb-1">URL de imagen</label>
                      <input
                        id="maq-imagen"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.imagenUrl ? 'is-invalid' : ''}`}
                        placeholder="/media/maquinas/..."
                        value={form.imagenUrl}
                        onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })}
                      />
                      {erroresCampo.imagenUrl && <div className="invalid-feedback">{erroresCampo.imagenUrl}</div>}
                    </div>
                    <div className="col-12">
                      <label htmlFor="maq-incluye" className="form-label small mb-1">Incluye</label>
                      <input
                        id="maq-incluye"
                        type="text"
                        className={`form-control form-control-sm rounded-1 ${erroresCampo.incluye ? 'is-invalid' : ''}`}
                        value={form.incluye}
                        onChange={(e) => setForm({ ...form, incluye: e.target.value })}
                      />
                      {erroresCampo.incluye && <div className="invalid-feedback">{erroresCampo.incluye}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer admin-modal-foot border-top py-2 px-3">
                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-1" onClick={() => setModalForm(null)} disabled={guardando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-ambar admin-btn-strong rounded-1 px-3" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unidades de Máquina */}
      {maquinaUnidades && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" role="dialog" aria-modal="true">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  Unidades — {maquinaUnidades.nombre} ({maquinaUnidades.codigo})
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => setMaquinaUnidades(null)}></button>
              </div>
              <div className="modal-body p-3">
                <form onSubmit={handleAgregarUnidades} className="d-flex gap-2 align-items-end mb-3 pb-3 border-bottom">
                  <div className="flex-grow-1">
                    <label htmlFor="alta-unidades" className="form-label small mb-1">Dar de alta unidades (1 a 20)</label>
                    <input
                      id="alta-unidades"
                      type="number"
                      min="1"
                      max="20"
                      className="form-control form-control-sm rounded-1"
                      value={cantidadAlta}
                      onChange={(e) => setCantidadAlta(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-sm btn-ambar admin-btn-strong rounded-1 px-3" disabled={agregandoUnidades}>
                    {agregandoUnidades ? 'Agregando…' : 'Agregar unidades'}
                  </button>
                </form>

                {errorUnidades && <div className="alert alert-danger py-2 small" role="alert">{errorUnidades}</div>}

                {cargandoUnidades ? (
                  <IndicadorCarga etiqueta="Cargando unidades…" />
                ) : unidades.length === 0 ? (
                  <p className="admin-muted text-center py-3 mb-0">Esta máquina aún no tiene unidades registradas.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Código Unidad</th>
                          <th>Estado</th>
                          <th className="admin-ta-end">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unidades.map((u) => (
                          <tr key={u.id} data-testid="fila-unidad">
                            <td className="admin-mono">{u.codigo}</td>
                            <td>
                              <span className={`badge ${u.estado === 'DISPONIBLE' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'}`}>
                                {u.estado}
                              </span>
                            </td>
                            <td className="admin-ta-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger rounded-1 py-0 px-2"
                                disabled={u.estado !== 'DISPONIBLE'}
                                onClick={() => {
                                  setErrorEliminarUnidad('');
                                  setUnidadAEliminar(u);
                                }}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer admin-modal-foot border-top py-2 px-3">
                <button type="button" className="btn btn-sm btn-secondary rounded-1" onClick={() => setMaquinaUnidades(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {unidadAEliminar && (
        <ModalConfirmacion
          titulo="¿Eliminar unidad?"
          mensaje={
            <>
              Se eliminará la unidad <strong>{unidadAEliminar.codigo}</strong>. Si tiene arriendos en su historial, el servidor rechazará la operación.
            </>
          }
          textoConfirmar="Eliminar"
          procesando={eliminandoUnidad}
          error={errorEliminarUnidad}
          onConfirmar={confirmarEliminarUnidad}
          onCancelar={() => setUnidadAEliminar(null)}
        />
      )}

      {maquinaAEliminar && (
        <ModalConfirmacion
          titulo="¿Eliminar máquina?"
          mensaje={
            <>
              Se eliminará el modelo <strong>"{maquinaAEliminar.nombre}"</strong> ({maquinaAEliminar.codigo}) y sus unidades. Si alguna unidad tiene arriendos registrados, no se podrá eliminar.
            </>
          }
          textoConfirmar="Eliminar"
          procesando={eliminandoMaquina}
          error={errorEliminarMaquina}
          onConfirmar={confirmarEliminarMaquina}
          onCancelar={() => setMaquinaAEliminar(null)}
        />
      )}
    </div>
  );
}

