import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/authContexto";
import { actualizarPerfil } from "../api/usuarios";
import { ApiError, erroresPorCampo } from "../api/errores";
import { obtenerOrdenes, EVENTO_ORDENES_ACTUALIZADAS } from "../data/ordenes";
import { obtenerContratosArriendo, EVENTO_MAQUINARIAS_ACTUALIZADAS } from "../data/maquinarias";
import { REGIONES_CHILE, normalizarRegion, obtenerComunas } from "../data/chile";
import { validadores, formatearTelefono } from "../data/validaciones";
import { mostrarToast } from "../components/ToastNotificacion";

export default function CuentaCliente() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabInicial = searchParams.get("tab") || "datos";
  const [tabActiva, setTabActiva] = useState(tabInicial);

  const { usuario: sesion, actualizarUsuario } = useAuth();
  const [ordenes, setOrdenes] = useState([]);
  const [arriendos, setArriendos] = useState([]);

  // Formulario de edición de datos
  const [editando, setEditando] = useState(false);
  const [formDatos, setFormDatos] = useState({
    nombre: "",
    rut: "",
    email: "",
    telefono: "",
    direccion: "",
    region: "Región Metropolitana",
    comuna: "Providencia"
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Cuando carga (o cambia) el usuario de la sesión, se precarga el formulario de edición.
  useEffect(() => {
    if (!sesion) return;
    setFormDatos({
      nombre: sesion.nombre || "",
      rut: sesion.rut || "",
      email: sesion.email || "",
      telefono: sesion.telefono || "",
      direccion: sesion.direccion || "",
      region: normalizarRegion(sesion.region || "Región Metropolitana"),
      comuna: sesion.comuna || "Providencia"
    });
  }, [sesion]);

  useEffect(() => {
    if (!sesion) return;

    const cargarCompras = () => {
      const todas = obtenerOrdenes();
      const mias = todas.filter(
        (o) =>
          (o.cliente && o.cliente.email && o.cliente.email.toLowerCase() === sesion.email.toLowerCase()) ||
          o.idUsuario === sesion.id
      );
      setOrdenes(mias);
    };

    const cargarArriendos = () => {
      const todos = obtenerContratosArriendo();
      const mios = todos.filter(
        (c) =>
          (c.usuario && c.usuario.email && c.usuario.email.toLowerCase() === sesion.email.toLowerCase()) ||
          (c.usuario && c.usuario.idUsuario === sesion.id) ||
          (sesion.rut && c.usuario && c.usuario.rut === sesion.rut)
      );
      setArriendos(mios);
    };

    cargarCompras();
    cargarArriendos();

    window.addEventListener(EVENTO_ORDENES_ACTUALIZADAS, cargarCompras);
    window.addEventListener(EVENTO_MAQUINARIAS_ACTUALIZADAS, cargarArriendos);

    return () => {
      window.removeEventListener(EVENTO_ORDENES_ACTUALIZADAS, cargarCompras);
      window.removeEventListener(EVENTO_MAQUINARIAS_ACTUALIZADAS, cargarArriendos);
    };
  }, [sesion]);

  const cambiarTab = (nuevaTab) => {
    setTabActiva(nuevaTab);
    setSearchParams({ tab: nuevaTab });
  };

  const formatearCLP = (valor) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  const handleGuardarDatos = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!formDatos.nombre.trim()) errs.nombre = "El nombre es requerido.";
    const errTel = validadores.telefono(formDatos.telefono);
    if (errTel) errs.telefono = errTel;
    if (!formDatos.direccion.trim()) errs.direccion = "La dirección de entrega es obligatoria.";

    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setGuardando(true);
    try {
      // El RUT y el correo no se envían: el servidor no permite cambiarlos.
      const actualizado = await actualizarPerfil(formDatos);
      actualizarUsuario(actualizado); // el contexto queda con los datos nuevos sin volver a iniciar sesión
      setEditando(false);
      mostrarToast({
        titulo: "¡Datos Actualizados!",
        mensaje: "Tus datos de despacho han sido guardados con éxito para futuras compras.",
        tipo: "success"
      });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setErrores((prev) => ({ ...prev, ...erroresPorCampo(error) }));
      mostrarToast({ titulo: "No se pudieron guardar los datos", mensaje: error.mensaje, tipo: "danger" });
    } finally {
      setGuardando(false);
    }
  };

  if (!sesion) {
    return (
      <div className="cuenta-cliente-page py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6 text-center">
              <div className="auth-card p-5 shadow-sm rounded-1 bg-white border">
                <i className="bi bi-shield-lock text-warning display-4 mb-3 d-block"></i>
                <h2 className="marca-titulo mb-2">Acceso a Mi Cuenta Ferrefix</h2>
                <p className="text-secondary mb-4">
                  Inicia sesión con tu cuenta de cliente para revisar tu historial de compras, contratos de maquinaria y gestionar tus datos de despacho automático.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <Link to="/login" className="btn btn-ambar px-4 py-2 rounded-1 fw-bold">
                    Iniciar Sesión
                  </Link>
                  <Link to="/registro" className="btn btn-outline-dark px-4 py-2 rounded-1">
                    Registrarme
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cuenta-cliente-page py-4 py-lg-5">
      <div className="container">

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb mb-0 small">
            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Inicio</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Mi Cuenta</li>
          </ol>
        </nav>

        {/* Hero Cabecera */}
        <div className="brand-hero rounded-1 p-4 p-md-5 mb-4 shadow-sm">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h1 className="brand-hero-title mb-1">
                Bienvenido/a, {sesion.nombre}
              </h1>
              <p className="brand-hero-text mb-0">
                Gestiona tus datos de despacho automático para checkout rápido, revisa tus pedidos y supervisa tus equipos arrendados.
              </p>
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="cuenta-tabs-bar mb-4 border-bottom d-flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn rounded-1 px-4 py-2 fw-semibold border-0 ${tabActiva === "datos" ? "btn-ambar shadow-sm" : "btn-light text-secondary"}`}
            onClick={() => cambiarTab("datos")}
          >
            <i className="bi bi-person-vcard me-2"></i>
            Mis Datos y Despacho
          </button>
          <button
            type="button"
            className={`btn rounded-1 px-4 py-2 fw-semibold border-0 ${tabActiva === "compras" ? "btn-ambar shadow-sm" : "btn-light text-secondary"}`}
            onClick={() => cambiarTab("compras")}
          >
            <i className="bi bi-bag-check me-2"></i>
            Historial de Compras ({ordenes.length})
          </button>
          <button
            type="button"
            className={`btn rounded-1 px-4 py-2 fw-semibold border-0 ${tabActiva === "arriendos" ? "btn-ambar shadow-sm" : "btn-light text-secondary"}`}
            onClick={() => cambiarTab("arriendos")}
          >
            <i className="bi bi-tools me-2"></i>
            Mis Arriendos ({arriendos.length})
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: MIS DATOS Y DESPACHO                                    */}
        {/* ============================================================== */}
        {tabActiva === "datos" && (
          <div className="row g-4">
            <div className="col-12 col-lg-7">
              <div className="info-card shadow-sm p-4 p-md-5 h-100">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <div>
                    <h2 className="info-section-title mb-1">Ficha de Despacho del Cliente</h2>
                    <span className="text-muted small">Estos datos se cargan automáticamente en el Checkout para compras en 1 clic</span>
                  </div>
                  {!editando && (
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm rounded-1 px-3"
                      onClick={() => setEditando(true)}
                    >
                      <i className="bi bi-pencil me-1"></i> Modificar
                    </button>
                  )}
                </div>

                {editando ? (
                  <form onSubmit={handleGuardarDatos} noValidate>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label htmlFor="cuenta-nombre" className="form-label small fw-semibold">Nombre Completo *</label>
                        <input id="cuenta-nombre"
                          type="text"
                          className={`form-control form-control-sm rounded-1 ${errores.nombre ? "is-invalid" : ""}`}
                          value={formDatos.nombre}
                          onChange={(e) => setFormDatos({ ...formDatos, nombre: e.target.value })}
                          required
                        />
                        {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label htmlFor="cuenta-rut" className="form-label small fw-semibold">RUN / RUT</label>
                        <input id="cuenta-rut"
                          type="text"
                          className="form-control form-control-sm rounded-1 font-monospace bg-light"
                          value={formDatos.rut}
                          readOnly
                        />
                        <span className="text-muted small">El RUT no se puede modificar</span>
                      </div>

                      <div className="col-12 col-md-6">
                        <label htmlFor="cuenta-email" className="form-label small fw-semibold">Correo Electrónico</label>
                        <input id="cuenta-email"
                          type="email"
                          className="form-control form-control-sm rounded-1 bg-light"
                          value={formDatos.email}
                          disabled
                        />
                        <span className="text-muted small">El correo es tu identificador de cuenta</span>
                      </div>

                      <div className="col-12 col-md-6">
                        <label htmlFor="cuenta-telefono" className="form-label small fw-semibold">Teléfono de Contacto *</label>
                        <input id="cuenta-telefono"
                          type="tel"
                          className={`form-control form-control-sm rounded-1 ${errores.telefono ? "is-invalid" : ""}`}
                          value={formDatos.telefono}
                          onChange={(e) => setFormDatos({ ...formDatos, telefono: formatearTelefono(e.target.value) })}
                          placeholder="+56 9 8765 4321"
                          maxLength={17}
                          required
                        />
                        {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label htmlFor="cuenta-region" className="form-label small fw-semibold">Región *</label>
                        <select id="cuenta-region"
                          className="form-select form-select-sm rounded-1"
                          value={formDatos.region}
                          onChange={(e) => {
                            const nuevaRegion = e.target.value;
                            const comunas = obtenerComunas(nuevaRegion);
                            setFormDatos({
                              ...formDatos,
                              region: nuevaRegion,
                              comuna: comunas[0] || ""
                            });
                          }}
                        >
                          {REGIONES_CHILE.map((r) => (
                            <option key={r.region} value={r.region}>{r.region}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-6">
                        <label htmlFor="cuenta-comuna" className="form-label small fw-semibold">Comuna *</label>
                        <select id="cuenta-comuna"
                          className="form-select form-select-sm rounded-1"
                          value={formDatos.comuna}
                          onChange={(e) => setFormDatos({ ...formDatos, comuna: e.target.value })}
                        >
                          {obtenerComunas(formDatos.region).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <label htmlFor="cuenta-direccion" className="form-label small fw-semibold">Dirección de Entrega (Calle, Número, Depto) *</label>
                        <input id="cuenta-direccion"
                          type="text"
                          className={`form-control form-control-sm rounded-1 ${errores.direccion ? "is-invalid" : ""}`}
                          value={formDatos.direccion}
                          onChange={(e) => setFormDatos({ ...formDatos, direccion: e.target.value })}
                          placeholder="Ej: Av. Providencia 1240, Depto 502"
                          required
                        />
                        {errores.direccion && <div className="invalid-feedback">{errores.direccion}</div>}
                      </div>

                      <div className="col-12 pt-3 d-flex gap-2 justify-content-end border-top">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm rounded-1 px-3"
                          onClick={() => setEditando(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn btn-ambar btn-sm rounded-1 px-4 fw-bold shadow-sm"
                          disabled={guardando}
                        >
                          {guardando ? "Guardando…" : "Guardar Datos de Despacho"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="p-3 bg-light rounded-1 border">
                        <span className="text-muted d-block small mb-1">Nombre Completo:</span>
                        <strong className="text-dark">{sesion.nombre || "No informado"}</strong>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="p-3 bg-light rounded-1 border">
                        <span className="text-muted d-block small mb-1">RUN / RUT Cliente:</span>
                        <strong className="text-dark font-monospace">{sesion.rut || "No informado"}</strong>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="p-3 bg-light rounded-1 border">
                        <span className="text-muted d-block small mb-1">Correo Electrónico:</span>
                        <strong className="text-dark font-monospace">{sesion.email}</strong>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="p-3 bg-light rounded-1 border">
                        <span className="text-muted d-block small mb-1">Teléfono Móvil:</span>
                        <strong className="text-dark">{sesion.telefono || "No informado"}</strong>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="p-3 bg-light rounded-1 border">
                        <span className="text-muted d-block small mb-1">Dirección de Despacho Habitual:</span>
                        <strong className="text-dark d-block">
                          {sesion.direccion ? `${sesion.direccion}, ${sesion.comuna}, ${sesion.region}` : "Sin dirección guardada aún."}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HISTORIAL DE COMPRAS                                    */}
        {/* ============================================================== */}
        {tabActiva === "compras" && (
          <div className="info-card shadow-sm p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom flex-wrap gap-2">
              <div>
                <h2 className="info-section-title mb-1">Historial de Compras Realizadas</h2>
                <span className="text-muted small">Registro oficial de tus pedidos procesados con boleta y despacho</span>
              </div>
              <span className="badge bg-dark px-3 py-2 font-monospace">Total Compras: {ordenes.length}</span>
            </div>

            {ordenes.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-cart-x text-muted display-4 mb-3 d-block"></i>
                <h3 className="h5 text-dark mb-2">Aún no registras compras con tu cuenta</h3>
                <p className="text-secondary small mb-4">
                  Explora nuestro catálogo con herramientas y materiales profesionales para comenzar tu primer pedido.
                </p>
                <Link to="/catalogo" className="btn btn-ambar px-4 py-2 rounded-1 fw-bold">
                  Explorar Catálogo
                </Link>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {ordenes.map((ord) => (
                  <div key={ord.idOrden} className="border rounded-1 p-3 p-md-4 bg-white shadow-sm">
                    <div className="d-flex flex-wrap justify-content-between align-items-center pb-2 mb-3 border-bottom gap-2">
                      <div>
                        <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
                          ● {ord.estado || "Completada"}
                        </span>
                        <strong className="text-dark me-2">Orden #{ord.idOrden}</strong>
                        {ord.numeroBoleta && (
                          <span className="badge bg-secondary-subtle text-secondary font-monospace">
                            Boleta: {ord.numeroBoleta}
                          </span>
                        )}
                      </div>
                      <div className="text-muted small">
                        <i className="bi bi-calendar3 me-1"></i> {ord.fecha}
                      </div>
                    </div>

                    <div className="table-responsive mb-3">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Producto</th>
                            <th className="text-center">Cant.</th>
                            <th className="text-end">P. Unitario</th>
                            <th className="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ord.items && ord.items.map((item, idx) => (
                            <tr key={idx} className="small">
                              <td className="fw-semibold text-dark">{item.nombre}</td>
                              <td className="text-center">{item.cantidad}</td>
                              <td className="text-end font-monospace">{formatearCLP(item.precioUnitario)}</td>
                              <td className="text-end font-monospace">{formatearCLP(item.precioUnitario * item.cantidad)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex flex-wrap justify-content-between align-items-center pt-2 border-top bg-light p-2 rounded-1">
                      <div className="small text-muted">
                        <div><strong>Medio de Pago:</strong> {ord.metodoPago || "WebPay Plus"}</div>
                        <div><strong>Dirección de Entrega:</strong> {ord.cliente?.direccion || "Despacho registrado"}</div>
                      </div>
                      <div className="text-end">
                        <span className="text-muted small d-block">Monto Total Pagado:</span>
                        <strong className="text-success fs-5 font-monospace">{formatearCLP(ord.total)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MIS ARRIENDOS DE MAQUINARIA                             */}
        {/* ============================================================== */}
        {tabActiva === "arriendos" && (
          <div className="info-card shadow-sm p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom flex-wrap gap-2">
              <div>
                <h2 className="info-section-title mb-1">Mis Contratos de Arriendo de Maquinaria</h2>
                <span className="text-muted small">Control de equipos en obra, vigencia de contratos y tarifas diarias</span>
              </div>
              <Link to="/arriendos" className="btn btn-ambar btn-sm rounded-1 px-3 fw-bold">
                <i className="bi bi-plus-circle me-1"></i> Arrendar Nuevo Equipo
              </Link>
            </div>

            {arriendos.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-truck text-muted display-4 mb-3 d-block"></i>
                <h3 className="h5 text-dark mb-2">No tienes maquinarias arrendadas actualmente</h3>
                <p className="text-secondary small mb-4">
                  Contamos con martillos demoledores Bosch, betoneras Ingco, placas compactadoras Husqvarna y generadores Krafter listos para tu faena.
                </p>
                <Link to="/arriendos" className="btn btn-ambar px-4 py-2 rounded-1 fw-bold">
                  Ver Equipos Disponibles
                </Link>
              </div>
            ) : (
              <div className="row g-3">
                {arriendos.map((contrato) => (
                  <div key={contrato.idContrato} className="col-12 col-md-6">
                    <div className="border rounded-1 p-4 bg-white shadow-sm h-100 d-flex flex-column justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className={`badge ${contrato.estado === "Vigente" ? "bg-success" : "bg-secondary"}`}>
                            ● {contrato.estado || "Vigente"}
                          </span>
                          <span className="badge bg-light text-dark border font-monospace">
                            Contrato #{contrato.idContrato}
                          </span>
                        </div>

                        <h3 className="h5 fw-bold text-dark mb-1">{contrato.nombreMaquina}</h3>
                        <div className="text-muted small mb-3">Marca: {contrato.marcaMaquina || "Industrial"}</div>

                        <div className="p-3 bg-light rounded-1 border mb-3 small">
                          <div><strong>Tarifa diaria:</strong> {formatearCLP(contrato.tarifaDia)} / día</div>
                          <div><strong>Período:</strong> {contrato.diasArriendo} días (Desde {contrato.fechaInicio})</div>
                          <div><strong>Lugar de Faena:</strong> {contrato.usuario?.direccion || "Obra informada"}, {contrato.usuario?.comuna || ""}</div>
                          <div><strong>Fecha de Solicitud:</strong> {contrato.fechaContrato}</div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <span className="text-muted small">Costo Total Arriendo:</span>
                        <strong className="text-dark fs-5 font-monospace">{formatearCLP(contrato.totalPagar)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
