import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listarMaquinas } from '../api/maquinas';
import { crearArriendo } from '../api/arriendos';
import { ApiError, erroresPorCampo } from '../api/errores';
import { useCarga } from '../hooks/useCarga';
import { useAuth } from '../context/authContexto';
import { mostrarToast } from '../components/ToastNotificacion';
import { IndicadorCarga } from '../components/EsperarSesion';
import ErrorCarga from '../components/ErrorCarga';
import EspacioImagen from '../components/EspacioImagen';
import { formatearCLP } from '../utils/formato';
import { REGIONES_CHILE, REGION_POR_DEFECTO, normalizarRegion, obtenerComunas, obtenerComunaPorDefecto } from '../data/chile';
import {
  validadores,
  validarFormulario,
  formatearTelefono
} from '../data/validaciones';

const REGLAS_VALIDACION = {
  telefono: validadores.telefono,
  direccion: validadores.direccion,
  comuna: validadores.requerido('La comuna'),
  fechaInicio: validadores.requerido('La fecha de inicio'),
  diasArriendo: (valor) => {
    const dias = Number(valor);
    if (!dias || dias < 1) return 'Ingresa al menos 1 día de arriendo.';
    if (dias > 90) return 'El máximo de arriendo es de 90 días.';
    return '';
  }
};

function Arriendos() {
  const navigate = useNavigate();
  const { usuario: sesion, esAdmin } = useAuth();
  const { datos: maquinarias, cargando, error, recargar } = useCarga(listarMaquinas, 'catalogo-maquinas');

  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);
  const [contratoGenerado, setContratoGenerado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errores, setErrores] = useState({});
  const [touched, setTouched] = useState({});

  const [regionSeleccionada, setRegionSeleccionada] = useState(REGION_POR_DEFECTO);
  const [form, setForm] = useState({
    telefono: '',
    direccion: '',
    region: REGION_POR_DEFECTO,
    comuna: obtenerComunaPorDefecto(REGION_POR_DEFECTO),
    diasArriendo: 3,
    fechaInicio: new Date().toISOString().slice(0, 10)
  });

  const abrirModalArriendo = (maq) => {
    if (!sesion) {
      mostrarToast({
        titulo: 'Inicio de Sesión Requerido',
        mensaje: 'Debes iniciar sesión con tu cuenta para arrendar maquinaria en faena.',
        tipo: 'warning'
      });
      navigate('/login?next=/arriendos');
      return;
    }
    if (esAdmin) return;

    const regionUsuario = normalizarRegion(sesion.region || REGION_POR_DEFECTO);
    const comunasDisponibles = obtenerComunas(regionUsuario);
    const comunaUsuario =
      sesion.comuna && comunasDisponibles.includes(sesion.comuna)
        ? sesion.comuna
        : (comunasDisponibles[0] || '');

    setMaquinaSeleccionada(maq);
    setForm((prev) => ({
      ...prev,
      telefono: sesion.telefono || prev.telefono,
      direccion: sesion.direccion || prev.direccion,
      region: regionUsuario,
      comuna: comunaUsuario
    }));
    setRegionSeleccionada(regionUsuario);
    setErrorMsg('');
    setErrores({});
    setTouched({});
  };

  const cerrarModal = () => {
    if (enviando) return;
    setMaquinaSeleccionada(null);
    setErrorMsg('');
  };

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) {
      const validador = REGLAS_VALIDACION[campo];
      if (validador) setErrores((prev) => ({ ...prev, [campo]: validador(valor) }));
    }
  };

  const handleBlur = (campo) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    const validador = REGLAS_VALIDACION[campo];
    if (validador) setErrores((prev) => ({ ...prev, [campo]: validador(form[campo]) }));
  };

  const claseCampo = (campo, base = 'form-control form-control-sm rounded-1') =>
    `${base}${errores[campo] ? ' is-invalid' : ''}`;

  const handleCambiarRegion = (nuevaRegion) => {
    const regionNorm = normalizarRegion(nuevaRegion);
    setRegionSeleccionada(regionNorm);
    const comuna = obtenerComunaPorDefecto(regionNorm);
    setForm((prev) => ({ ...prev, region: regionNorm, comuna }));
    setErrores((prev) => ({ ...prev, comuna: '' }));
  };

  const handleConfirmarArriendo = async (e) => {
    e.preventDefault();
    if (!maquinaSeleccionada || enviandoRef.current) return;
    setErrorMsg('');

    const nuevosErrores = validarFormulario(REGLAS_VALIDACION, form);
    setErrores(nuevosErrores);
    setTouched(
      Object.keys(REGLAS_VALIDACION).reduce((acc, campo) => ({ ...acc, [campo]: true }), {})
    );

    if (Object.keys(nuevosErrores).length > 0) {
      setErrorMsg('Revisa los campos marcados en rojo antes de confirmar el arriendo.');
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    try {
      const contrato = await crearArriendo({
        maquinaId: maquinaSeleccionada.id,
        diasArriendo: form.diasArriendo,
        fechaInicio: form.fechaInicio,
        telefono: form.telefono,
        direccionFaena: form.direccion,
        region: regionSeleccionada,
        comuna: form.comuna
      });
      setErrores({});
      setTouched({});
      setContratoGenerado(contrato);
      setMaquinaSeleccionada(null);
      recargar();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      const camposApi = erroresPorCampo(err);
      if (camposApi.direccionFaena && !camposApi.direccion) {
        camposApi.direccion = camposApi.direccionFaena;
      }
      setErrores((prev) => ({ ...prev, ...camposApi }));
      setErrorMsg(err.mensaje);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const listaMaquinas = maquinarias ?? [];

  return (
    <div className="arriendos-page py-4 py-lg-5">
      <div className="container">

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb arriendos-breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Arriendo de Maquinaria</li>
          </ol>
        </nav>

        {/* Hero Banner */}
        <div className="brand-hero rounded-1 p-4 p-md-5 mb-5">
          <h1 className="brand-hero-title mb-3">
            Arriendo de Maquinaria Profesional en Santiago
          </h1>
          <p className="brand-hero-text mb-0">
            Equipos de alto rendimiento listos para operar en faena sin requerir inversión en compras de capital. Contratos asociados a tu cuenta verificada con entrega garantizada y servicio técnico en obra.
          </p>
        </div>

        {esAdmin && (
          <div className="alert alert-warning rounded-1 mb-4" role="note">
            Las cuentas de administrador no pueden solicitar arriendos de cliente. Para gestionar máquinas o contratos ingresa al <Link to="/admin" className="alert-link">Panel Admin</Link>.
          </div>
        )}

        {/* Catálogo de Maquinarias para Arriendo */}
        <div id="catalogo-maquinas" className="mb-4">
          <div className="mb-3">
            <h2 className="arriendos-section-title mb-1">
              Equipos y Maquinarias en Arriendo
            </h2>
            <span className="arriendos-section-sub">Tarifas diarias transparentes con mantención oficial de fábrica</span>
          </div>

          {cargando && <IndicadorCarga etiqueta="Cargando maquinarias…" />}
          {error && <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar las maquinarias" />}

          {!cargando && !error && listaMaquinas.length === 0 && (
            <div className="bg-white border rounded-1 p-4 text-center text-muted">
              No hay maquinarias disponibles en el catálogo en este momento.
            </div>
          )}

          {!cargando && !error && listaMaquinas.length > 0 && (
            <div className="row g-4">
              {listaMaquinas.map((maq) => {
                const estaDisponible = maq.estado === 'DISPONIBLE' && maq.unidadesDisponibles > 0;

                return (
                  <div key={maq.id} className="col-12 col-md-6" data-testid="tarjeta-maquina">
                    <div className={`arriendo-card shadow-sm h-100 d-flex flex-column ${estaDisponible ? 'arriendo-card--disponible' : 'arriendo-card--arrendada'}`}>

                      <EspacioImagen
                        src={maq.imagen}
                        alt={`${maq.nombre} - ${maq.marca}`}
                        proporcion="16x9"
                        icono="bi-tools"
                        etiqueta={`Maquinaria ${maq.marca}`}
                        className="arriendo-card-imagen"
                      />

                      <div className="p-4 d-flex flex-column justify-content-between flex-grow-1">
                        <div>
                          <div className="mb-2">
                            <span className={`arriendo-estado-badge ${estaDisponible ? 'arriendo-estado-badge--disponible' : 'arriendo-estado-badge--arrendada'}`}>
                              {estaDisponible ? `● Disponible (${maq.unidadesDisponibles})` : '■ No Disponible'}
                            </span>
                          </div>

                          <h3 className="arriendo-nombre mb-1">
                            {maq.nombre}
                          </h3>
                          <div className="arriendo-meta mb-2">{maq.marca} | {maq.categoria}</div>

                          <div className="arriendo-specs-list mb-3">
                            <ul className="list-unstyled mb-0">
                              {Object.entries(maq.especificaciones ?? {}).slice(0, 3).map(([k, v]) => (
                                <li key={k}><strong>{k}:</strong> {v}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="arriendo-card-footer d-flex justify-content-between align-items-center">
                          <div>
                            <span className="arriendo-rate-label d-block">Tarifa por día:</span>
                            <span className="arriendo-rate-value">
                              {formatearCLP(maq.tarifaDia)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className={`btn btn-sm rounded-1 px-3 ${estaDisponible && !esAdmin ? 'btn-ambar arriendo-btn' : 'btn-outline-secondary'}`}
                            disabled={!estaDisponible || esAdmin}
                            onClick={() => abrirModalArriendo(maq)}
                          >
                            {!estaDisponible ? 'No Disponible' : esAdmin ? 'Solo clientes' : 'Arrendar'}
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL: FORMULARIO DE ARRIENDO */}
      {maquinaSeleccionada && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow">

              <div className="modal-header arriendo-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title arriendo-modal-title mb-0">
                  Solicitud de Arriendo de Equipo: {maquinaSeleccionada.nombre}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={cerrarModal} disabled={enviando}></button>
              </div>

              <form onSubmit={handleConfirmarArriendo} noValidate>
                <div className="modal-body p-3 p-md-4">

                  <div className="arriendo-summary p-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <strong className="arriendo-summary-name d-block">{maquinaSeleccionada.nombre}</strong>
                      <small className="arriendo-summary-meta">Código: {maquinaSeleccionada.codigo} | Marca: {maquinaSeleccionada.marca}</small>
                    </div>
                    <div className="arriendo-summary-end">
                      <span className="arriendo-summary-label d-block">Tarifa Diaria:</span>
                      <strong className="arriendo-summary-value">{formatearCLP(maquinaSeleccionada.tarifaDia)}</strong>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="alert alert-danger arriendo-alert py-2 px-3 rounded-1 mb-3" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {errorMsg}
                    </div>
                  )}

                  <h4 className="arriendo-modal-section-title mb-3">
                    1. Datos del Titular y Contacto
                  </h4>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-4">
                      <label className="form-label arriendo-label mb-1">RUT</label>
                      <input type="text" className="form-control form-control-sm rounded-1 arriendo-mono bg-light" value={sesion?.rut || ''} readOnly />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label arriendo-label mb-1">Nombre</label>
                      <input type="text" className="form-control form-control-sm rounded-1 bg-light" value={sesion?.nombre || ''} readOnly />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label arriendo-label mb-1">Correo</label>
                      <input type="email" className="form-control form-control-sm rounded-1 bg-light" value={sesion?.email || ''} readOnly />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="arriendo-telefono" className="form-label arriendo-label mb-1">
                        Teléfono Móvil de Contacto *
                      </label>
                      <input
                        id="arriendo-telefono"
                        type="tel"
                        className={claseCampo('telefono')}
                        placeholder="+56 9 9876 5432"
                        value={form.telefono}
                        onChange={(e) => handleChange('telefono', formatearTelefono(e.target.value))}
                        onBlur={() => handleBlur('telefono')}
                        inputMode="tel"
                        maxLength={17}
                        required
                      />
                      {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}
                    </div>
                  </div>

                  <h4 className="arriendo-modal-section-title mb-3">
                    2. Ubicación de la Faena / Obra
                  </h4>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-5">
                      <label htmlFor="arriendo-region" className="form-label arriendo-label mb-1">
                        Región *
                      </label>
                      <select
                        id="arriendo-region"
                        className="form-select form-select-sm rounded-1"
                        value={regionSeleccionada}
                        onChange={(e) => handleCambiarRegion(e.target.value)}
                      >
                        {REGIONES_CHILE.map((r) => (
                          <option key={r.region} value={r.region}>{r.region}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-7">
                      <label htmlFor="arriendo-comuna" className="form-label arriendo-label mb-1">
                        Comuna *
                      </label>
                      <select
                        id="arriendo-comuna"
                        className={`form-select form-select-sm rounded-1${errores.comuna ? ' is-invalid' : ''}`}
                        value={form.comuna}
                        onChange={(e) => handleChange('comuna', e.target.value)}
                        onBlur={() => handleBlur('comuna')}
                        required
                      >
                        {obtenerComunas(regionSeleccionada).map((com) => (
                          <option key={com} value={com}>{com}</option>
                        ))}
                      </select>
                      {errores.comuna && <div className="invalid-feedback d-block">{errores.comuna}</div>}
                    </div>

                    <div className="col-12">
                      <label htmlFor="arriendo-direccion" className="form-label arriendo-label mb-1">
                        Dirección Exacta de la Obra *
                      </label>
                      <input
                        id="arriendo-direccion"
                        type="text"
                        className={claseCampo('direccion')}
                        placeholder="Ej: Pasaje Los Aromos 740, Faena Constructora Sur"
                        value={form.direccion}
                        onChange={(e) => handleChange('direccion', e.target.value)}
                        onBlur={() => handleBlur('direccion')}
                        required
                      />
                      {errores.direccion && <div className="invalid-feedback">{errores.direccion}</div>}
                    </div>
                  </div>

                  <h4 className="arriendo-modal-section-title mb-3">
                    3. Período de Arriendo y Cálculo de Tarifa
                  </h4>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="arriendo-fecha" className="form-label arriendo-label mb-1">Fecha de Inicio *</label>
                      <input
                        id="arriendo-fecha"
                        type="date"
                        className={claseCampo('fechaInicio')}
                        value={form.fechaInicio}
                        onChange={(e) => handleChange('fechaInicio', e.target.value)}
                        onBlur={() => handleBlur('fechaInicio')}
                        required
                      />
                      {errores.fechaInicio && <div className="invalid-feedback">{errores.fechaInicio}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="arriendo-dias" className="form-label arriendo-label mb-1">Días de Arriendo *</label>
                      <input
                        id="arriendo-dias"
                        type="number"
                        min="1"
                        max="90"
                        className={claseCampo('diasArriendo', 'form-control form-control-sm rounded-1 arriendo-mono')}
                        value={form.diasArriendo}
                        onChange={(e) => handleChange('diasArriendo', e.target.value)}
                        onBlur={() => handleBlur('diasArriendo')}
                        required
                      />
                      {errores.diasArriendo && <div className="invalid-feedback">{errores.diasArriendo}</div>}
                    </div>
                  </div>

                  <div className="arriendo-summary p-3 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="arriendo-total-label d-block">
                        {form.diasArriendo} día(s) × {formatearCLP(maquinaSeleccionada.tarifaDia)}
                      </span>
                      <strong className="arriendo-total-name">Total Estimado del Arriendo:</strong>
                    </div>
                    <strong className="arriendo-total-value">
                      {formatearCLP(maquinaSeleccionada.tarifaDia * (Number(form.diasArriendo) || 0))}
                    </strong>
                  </div>

                </div>

                <div className="modal-footer arriendo-modal-foot border-top py-2 px-3">
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-1" onClick={cerrarModal} disabled={enviando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-ambar arriendo-btn btn-sm rounded-1 px-4 shadow-sm" disabled={enviando}>
                    {enviando ? 'Registrando…' : 'Confirmar Arriendo'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROBANTE DE CONTRATO DE ARRIENDO GENERADO */}
      {contratoGenerado && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header arriendo-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title arriendo-modal-title mb-0">
                  Contrato de Arriendo {contratoGenerado.codigo}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => setContratoGenerado(null)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="arriendo-contract-head pb-3 border-bottom mb-3">
                  <div className="arriendo-ok-icon mb-1">✓</div>
                  <h6 className="arriendo-contract-title mb-2">¡Arriendo Registrado Exitosamente!</h6>
                  <span className="arriendo-contract-code">
                    Código: {contratoGenerado.codigo}
                  </span>
                </div>

                <div className="arriendo-contract-list mb-3">
                  <div><strong>Máquina:</strong> {contratoGenerado.maquina?.nombre} ({contratoGenerado.unidadCodigo})</div>
                  <div><strong>Cliente:</strong> {sesion?.nombre} ({sesion?.rut})</div>
                  <div><strong>Contacto:</strong> {contratoGenerado.telefonoContacto}</div>
                  <div><strong>Faena:</strong> {contratoGenerado.direccionFaena}, {contratoGenerado.comunaFaena}, {contratoGenerado.regionFaena}</div>
                  <div><strong>Vigencia:</strong> {contratoGenerado.dias} días ({contratoGenerado.fechaInicio} al {contratoGenerado.fechaFin})</div>
                </div>

                <div className="arriendo-summary p-3 d-flex justify-content-between align-items-center">
                  <span className="arriendo-total-name">Total Arriendo:</span>
                  <span className="arriendo-contract-total">{formatearCLP(contratoGenerado.total)}</span>
                </div>
              </div>

              <div className="modal-footer arriendo-modal-foot border-top py-2 px-3">
                <button type="button" className="btn btn-ambar arriendo-btn btn-sm rounded-1" onClick={() => setContratoGenerado(null)}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Arriendos;
