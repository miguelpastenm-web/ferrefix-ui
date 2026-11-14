import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listarOrdenes, cambiarEstadoOrden, eliminarOrden } from '../api/ordenes';
import { listarProductos, eliminarProducto } from '../api/productos';
import { useAuth } from '../context/authContexto';
import { useCarga } from '../hooks/useCarga';
import { formatearCLP } from '../utils/formato';
import { calcularMetricasProductos, calcularMetricasOrdenes, requiereReposicion } from '../utils/metricasAdmin';
import { clasificarErrorAdmin } from '../utils/errorAdmin';
import { etiquetaMetodoPago, formatearFechaOrden, infoEstadoOrden } from '../utils/estadosOrden';
import GeneradorProductos from '../components/GeneradorProductos';
import AdminDashboard from '../components/AdminDashboard';
import AdminProductos from '../components/AdminProductos';
import AdminOrdenes from '../components/AdminOrdenes';
import AdminMaquinas from '../components/AdminMaquinas';
import AdminArriendos from '../components/AdminArriendos';
import AdminCotizaciones from '../components/AdminCotizaciones';
import FormularioProducto from '../components/FormularioProducto';
import ModalStock from '../components/ModalStock';
import ModalConfirmacion from '../components/ModalConfirmacion';
import InsigniaEstadoOrden from '../components/InsigniaEstadoOrden';
import ErrorCarga from '../components/ErrorCarga';
import { IndicadorCarga } from '../components/EsperarSesion';

function Admin() {
  // Sesión: el acceso al panel lo controla <RutaProtegida roles={['ADMIN']}> en App.jsx (ya no hay login interno).
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  // Productos: vienen de la API. Tras cada alta, edición, cambio de stock o borrado se vuelven a cargar.
  const { ultimos, cargando: cargandoProductos, error: errorProductos, recargar: recargarProductos } = useCarga(listarProductos, 'admin-productos');
  const productos = useMemo(() => ultimos ?? [], [ultimos]);

  // Órdenes: vienen de la API. Tras cada cambio de estado o borrado se vuelven a cargar.
  const {
    ultimos: ultimasOrdenes,
    cargando: cargandoOrdenes,
    error: errorOrdenes,
    recargar: recargarOrdenes
  } = useCarga(listarOrdenes, 'admin-ordenes');
  const ordenes = useMemo(() => ultimasOrdenes ?? [], [ultimasOrdenes]);

  const [tabActiva, setTabActiva] = useState('dashboard'); // 'dashboard' | 'productos' | 'ordenes' | 'generadores'
  const [soloCriticos, setSoloCriticos] = useState(false);

  // Diálogos de productos
  const [formulario, setFormulario] = useState(null); // null | { producto: objeto|null }
  const [productoStock, setProductoStock] = useState(null);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const eliminandoRef = useRef(false);

  // Diálogos y acciones de órdenes
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [ordenEnProcesoId, setOrdenEnProcesoId] = useState(null);
  const ordenEnProcesoRef = useRef(false);
  const [errorOrdenAccion, setErrorOrdenAccion] = useState('');
  const [ordenACancelar, setOrdenACancelar] = useState(null);
  const [cancelandoOrden, setCancelandoOrden] = useState(false);
  const [errorCancelarOrden, setErrorCancelarOrden] = useState('');
  const cancelandoOrdenRef = useRef(false);
  const [ordenAEliminar, setOrdenAEliminar] = useState(null);
  const [eliminandoOrden, setEliminandoOrden] = useState(false);
  const [errorEliminarOrden, setErrorEliminarOrden] = useState('');
  const eliminandoOrdenRef = useRef(false);

  const [mensajeAlerta, setMensajeAlerta] = useState(null);

  const mostrarMensaje = (texto, tipo = 'dark') => {
    setMensajeAlerta({ texto, tipo });
    setTimeout(() => setMensajeAlerta(null), 3500);
  };

  const metricas = useMemo(() => calcularMetricasProductos(productos), [productos]);
  const productosReposicion = useMemo(
    () => productos.filter(requiereReposicion).sort((a, b) => Number(a.stock) - Number(b.stock)),
    [productos]
  );
  const metricasOrdenes = useMemo(() => calcularMetricasOrdenes(ordenes), [ordenes]);
  const ventas = {
    titulo: 'Ventas Registradas',
    valor: errorOrdenes && ultimasOrdenes === null ? '—' : formatearCLP(metricasOrdenes.totalVentas),
    subtitulo:
      errorOrdenes && ultimasOrdenes === null
        ? 'No pudimos cargar las órdenes'
        : `${metricasOrdenes.ordenesVigentes} ${metricasOrdenes.ordenesVigentes === 1 ? 'orden vigente' : 'órdenes vigentes'}`
  };

  const alGuardarProducto = (producto, modo) => {
    setFormulario(null);
    setProductoStock(null);
    recargarProductos();
    if (modo === 'crear') mostrarMensaje(`Producto "${producto.nombre}" registrado con éxito.`);
    else if (modo === 'stock') mostrarMensaje(`Stock de "${producto.nombre}" actualizado a ${producto.stock} unidades.`);
    else mostrarMensaje(`Producto "${producto.nombre}" actualizado.`);
  };

  const ejecutarEliminacion = async () => {
    if (!productoAEliminar || eliminandoRef.current) return;
    eliminandoRef.current = true;
    setEliminando(true);
    setErrorEliminar('');
    try {
      await eliminarProducto(productoAEliminar.id);
      mostrarMensaje(`Producto "${productoAEliminar.nombre}" eliminado del catálogo.`);
      setProductoAEliminar(null);
      recargarProductos();
    } catch (error) {
      const caso = clasificarErrorAdmin(error);
      setErrorEliminar(caso.mensaje);
      // Ya no existe, o no se sabe si se aplicó: se refresca la lista para ver el estado real (sin reintentar sola).
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargarProductos();
    } finally {
      eliminandoRef.current = false;
      setEliminando(false);
    }
  };

  const ejecutarCambioEstadoOrden = async (orden, nuevoEstado) => {
    if (!orden || ordenEnProcesoRef.current) return;
    ordenEnProcesoRef.current = true;
    setOrdenEnProcesoId(orden.id);
    setErrorOrdenAccion('');
    try {
      await cambiarEstadoOrden(orden.id, nuevoEstado);
      mostrarMensaje(`Orden ${orden.codigo} actualizada a ${infoEstadoOrden(nuevoEstado).etiqueta}.`);
      recargarOrdenes();
    } catch (error) {
      const caso = clasificarErrorAdmin(error);
      setErrorOrdenAccion(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar' || caso.tipo === 'conflicto') recargarOrdenes();
    } finally {
      ordenEnProcesoRef.current = false;
      setOrdenEnProcesoId(null);
    }
  };

  const ejecutarCancelacionOrden = async () => {
    if (!ordenACancelar || cancelandoOrdenRef.current) return;
    cancelandoOrdenRef.current = true;
    setCancelandoOrden(true);
    setErrorCancelarOrden('');
    try {
      await cambiarEstadoOrden(ordenACancelar.id, 'CANCELADA');
      mostrarMensaje(`Orden ${ordenACancelar.codigo} cancelada. El stock fue devuelto.`);
      setOrdenACancelar(null);
      recargarOrdenes();
      recargarProductos();
    } catch (error) {
      const caso = clasificarErrorAdmin(error);
      setErrorCancelarOrden(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar' || caso.tipo === 'conflicto') recargarOrdenes();
    } finally {
      cancelandoOrdenRef.current = false;
      setCancelandoOrden(false);
    }
  };

  const ejecutarEliminacionOrden = async () => {
    if (!ordenAEliminar || eliminandoOrdenRef.current) return;
    eliminandoOrdenRef.current = true;
    setEliminandoOrden(true);
    setErrorEliminarOrden('');
    try {
      await eliminarOrden(ordenAEliminar.id);
      mostrarMensaje(`Orden ${ordenAEliminar.codigo} eliminada.`);
      setOrdenAEliminar(null);
      recargarOrdenes();
    } catch (error) {
      const caso = clasificarErrorAdmin(error);
      setErrorEliminarOrden(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar' || caso.tipo === 'conflicto') recargarOrdenes();
    } finally {
      eliminandoOrdenRef.current = false;
      setEliminandoOrden(false);
    }
  };

  const handleCerrarSesion = () => {
    logout();
    navigate('/', { replace: true });
  };

  const vistaProductos = (contenido) => {
    if (cargandoProductos && ultimos === null) return <IndicadorCarga etiqueta="Cargando productos…" />;
    if (errorProductos && ultimos === null) {
      return <ErrorCarga error={errorProductos} onReintentar={recargarProductos} titulo="No pudimos cargar los productos" />;
    }
    return contenido;
  };

  const vistaOrdenes = (contenido) => {
    if (cargandoOrdenes && ultimasOrdenes === null) return <IndicadorCarga etiqueta="Cargando órdenes…" />;
    if (errorOrdenes && ultimasOrdenes === null) {
      return <ErrorCarga error={errorOrdenes} onReintentar={recargarOrdenes} titulo="No pudimos cargar las órdenes" />;
    }
    return contenido;
  };

  // PANEL ADMINISTRATIVO PRINCIPAL
  return (
    <div className="admin-wrapper">

      {/* Barra de Navegación Exclusiva del Panel Admin */}
      <nav className="admin-navbar py-2 px-3">
        <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-2">

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-1 ms-2">
              <button type="button" className={`admin-nav-btn ${tabActiva === 'dashboard' ? 'active' : ''}`} onClick={() => setTabActiva('dashboard')}>
                Dashboard
              </button>
              <button type="button" className={`admin-nav-btn ${tabActiva === 'productos' ? 'active' : ''}`} onClick={() => setTabActiva('productos')}>
                Productos ({productos.length})
              </button>
              <button type="button" className={`admin-nav-btn ${tabActiva === 'ordenes' ? 'active' : ''}`} onClick={() => setTabActiva('ordenes')}>
                Órdenes ({ordenes.length})
              </button>
              <button type="button" className={`admin-nav-btn ${tabActiva === 'maquinas' ? 'active' : ''}`} onClick={() => setTabActiva('maquinas')}>
                Máquinas
              </button>
              <button type="button" className={`admin-nav-btn ${tabActiva === 'arriendos' ? 'active' : ''}`} onClick={() => setTabActiva('arriendos')}>
                Arriendos
              </button>
              <button type="button" className={`admin-nav-btn ${tabActiva === 'cotizaciones' ? 'active' : ''}`} onClick={() => setTabActiva('cotizaciones')}>
                Cotizaciones
              </button>
              <button type="button" className={`admin-nav-btn ${tabActiva === 'generadores' ? 'active' : ''}`} onClick={() => setTabActiva('generadores')}>
                Generadores
              </button>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-ambar admin-btn-strong btn-sm rounded-1 px-3" onClick={() => setFormulario({ producto: null })}>
              + Agregar Producto
            </button>

            <div className="vr admin-vr mx-1 d-none d-md-block"></div>

            <span className="admin-user-email d-none d-md-inline">{usuario.email}</span>

            <Link to="/" className="btn btn-outline-light btn-sm rounded-1 px-2" title="Ir a la tienda">
              Ver tienda
            </Link>

            <button type="button" className="btn btn-outline-light btn-sm rounded-1 px-2" onClick={handleCerrarSesion} title="Cerrar Sesión de Administrador">
              Salir
            </button>
          </div>

        </div>
      </nav>

      {/* Contenedor Principal */}
      <main className="container-fluid px-3 px-md-4 py-4">

        {mensajeAlerta && (
          <div className="admin-box p-3 mb-3 d-flex justify-content-between align-items-center" role="status">
            <span className="admin-notice-text">{mensajeAlerta.texto}</span>
            <button type="button" className="btn-close btn-close-sm" onClick={() => setMensajeAlerta(null)} aria-label="Cerrar aviso"></button>
          </div>
        )}

        {/* Dashboard */}
        {tabActiva === 'dashboard' &&
          vistaProductos(
            <AdminDashboard
              metricas={metricas}
              ventas={ventas}
              productosReposicion={productosReposicion}
              onIrAInventario={() => {
                setSoloCriticos(true);
                setTabActiva('productos');
              }}
              onEditarStock={setProductoStock}
            />
          )}

        {/* Inventario de productos (CRUD contra la API) */}
        {tabActiva === 'productos' &&
          vistaProductos(
            <AdminProductos
              productos={productos}
              soloCriticos={soloCriticos}
              onAlternarCriticos={() => setSoloCriticos((v) => !v)}
              onCrear={() => setFormulario({ producto: null })}
              onEditar={(producto) => setFormulario({ producto })}
              onEditarStock={setProductoStock}
              onEliminar={(producto) => {
                setErrorEliminar('');
                setProductoAEliminar(producto);
              }}
            />
          )}

        {/* Boletas y Ordenes */}
        {tabActiva === 'ordenes' &&
          vistaOrdenes(
            <AdminOrdenes
              ordenes={ordenes}
              ordenEnProcesoId={ordenEnProcesoId}
              errorAccion={errorOrdenAccion}
              onLimpiarError={() => setErrorOrdenAccion('')}
              onVerBoleta={setOrdenSeleccionada}
              onCambiarEstado={ejecutarCambioEstadoOrden}
              onSolicitarCancelar={(orden) => {
                setErrorCancelarOrden('');
                setOrdenACancelar(orden);
              }}
              onSolicitarEliminar={(orden) => {
                setErrorEliminarOrden('');
                setOrdenAEliminar(orden);
              }}
            />
          )}

        {/* Maquinaria, Arriendos y Cotizaciones (carga bajo demanda al abrir cada pestaña) */}
        {tabActiva === 'maquinas' && <AdminMaquinas onNotificar={mostrarMensaje} />}
        {tabActiva === 'arriendos' && <AdminArriendos onNotificar={mostrarMensaje} />}
        {tabActiva === 'cotizaciones' && <AdminCotizaciones onNotificar={mostrarMensaje} />}

        {/* Generadores de ofertas: suben sus imágenes al backend (destino "ofertas") */}
        {tabActiva === 'generadores' && (
          <div>
            <GeneradorProductos />
          </div>
        )}

      </main>

      {formulario && (
        <FormularioProducto
          producto={formulario.producto}
          onGuardado={alGuardarProducto}
          onCancelar={() => setFormulario(null)}
          onRefrescar={recargarProductos}
        />
      )}

      {productoStock && (
        <ModalStock
          producto={productoStock}
          onGuardado={alGuardarProducto}
          onCancelar={() => setProductoStock(null)}
          onRefrescar={recargarProductos}
        />
      )}

      {productoAEliminar && (
        <ModalConfirmacion
          titulo="¿Eliminar producto?"
          mensaje={
            <>
              Se eliminará definitivamente <strong>"{productoAEliminar.nombre}"</strong> (SKU {productoAEliminar.sku}) del catálogo. Las
              órdenes ya hechas conservan su nombre, SKU y precio.
            </>
          }
          textoConfirmar="Eliminar"
          procesando={eliminando}
          error={errorEliminar}
          onConfirmar={ejecutarEliminacion}
          onCancelar={() => setProductoAEliminar(null)}
        />
      )}

      {ordenACancelar && (
        <ModalConfirmacion
          titulo="¿Cancelar orden?"
          mensaje={
            <>
              Se cancelará la orden <strong>{ordenACancelar.codigo}</strong> y se devolverá el stock de sus productos al inventario.
            </>
          }
          textoConfirmar="Confirmar cancelación"
          procesando={cancelandoOrden}
          error={errorCancelarOrden}
          onConfirmar={ejecutarCancelacionOrden}
          onCancelar={() => setOrdenACancelar(null)}
        />
      )}

      {ordenAEliminar && (
        <ModalConfirmacion
          titulo="¿Eliminar orden?"
          mensaje={
            <>
              Se eliminará definitivamente la orden <strong>{ordenAEliminar.codigo}</strong> ({ordenAEliminar.boleta}). Esta acción no
              modifica el stock del inventario.
            </>
          }
          textoConfirmar="Eliminar"
          procesando={eliminandoOrden}
          error={errorEliminarOrden}
          onConfirmar={ejecutarEliminacionOrden}
          onCancelar={() => setOrdenAEliminar(null)}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL: VER BOLETA                                              */}
      {/* ============================================================== */}
      {ordenSeleccionada && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  Boleta Electrónica {ordenSeleccionada.boleta || ordenSeleccionada.codigo}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => setOrdenSeleccionada(null)}></button>
              </div>

              <div className="modal-body p-3">
                <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
                  <div>
                    <div className="admin-cell-strong">FERREFIX</div>
                    <small className="admin-muted">RUT: 76.845.120-K | Antonio Varas 666, Providencia</small>
                  </div>
                  <InsigniaEstadoOrden estado={ordenSeleccionada.estado} />
                </div>

                <div className="admin-muted mb-3">
                  <div><strong>Orden:</strong> {ordenSeleccionada.codigo}</div>
                  <div><strong>Fecha:</strong> {formatearFechaOrden(ordenSeleccionada.createdAt)}</div>
                  {ordenSeleccionada.cliente && (
                    <>
                      <div><strong>Cliente:</strong> {ordenSeleccionada.cliente.nombre}</div>
                      {ordenSeleccionada.cliente.rut && <div><strong>RUT:</strong> {ordenSeleccionada.cliente.rut}</div>}
                      <div><strong>Email:</strong> {ordenSeleccionada.cliente.email}</div>
                    </>
                  )}
                  {ordenSeleccionada.envio && (
                    <>
                      <div><strong>Teléfono:</strong> {ordenSeleccionada.envio.telefono}</div>
                      <div>
                        <strong>Dirección:</strong> {ordenSeleccionada.envio.direccion}, {ordenSeleccionada.envio.comuna}, {ordenSeleccionada.envio.region}
                      </div>
                      {ordenSeleccionada.envio.indicaciones && (
                        <div><strong>Indicaciones:</strong> {ordenSeleccionada.envio.indicaciones}</div>
                      )}
                    </>
                  )}
                  <div><strong>Método:</strong> {etiquetaMetodoPago(ordenSeleccionada.metodoPago)}</div>
                </div>

                <div className="table-responsive border rounded-1 mb-3">
                  <table className="table table-sm align-middle mb-0 admin-ticket-table">
                    <thead className="table-light">
                      <tr>
                        <th>Ítem</th>
                        <th className="admin-ta-center">Cant.</th>
                        <th className="admin-ta-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ordenSeleccionada.items ?? []).map((item, idx) => (
                        <tr key={`${item.sku}-${idx}`}>
                          <td>{item.nombre}</td>
                          <td className="admin-ta-center">{item.cantidad}</td>
                          <td className="admin-ta-end admin-mono">
                            {formatearCLP(item.subtotal ?? item.precioUnitario * item.cantidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-top">
                  <div className="d-flex justify-content-between admin-muted mb-1">
                    <span>Subtotal:</span>
                    <span className="admin-mono">{formatearCLP(ordenSeleccionada.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between admin-muted mb-2">
                    <span>Costo de envío:</span>
                    <span className="admin-mono">
                      {ordenSeleccionada.costoEnvio === 0 ? 'Gratis' : formatearCLP(ordenSeleccionada.costoEnvio)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center pt-1 border-top">
                    <span className="admin-cell-strong">Total:</span>
                    <span className="admin-total-value">{formatearCLP(ordenSeleccionada.total)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer admin-modal-foot border-top py-2 px-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm rounded-1"
                  onClick={() => setOrdenSeleccionada(null)}
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Admin;
