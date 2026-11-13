import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { obtenerOrdenes, EVENTO_ORDENES_ACTUALIZADAS } from '../data/ordenes';
import { listarProductos, eliminarProducto } from '../api/productos';
import { useAuth } from '../context/authContexto';
import { useCarga } from '../hooks/useCarga';
import { formatearCLP } from '../utils/formato';
import { calcularMetricasProductos, requiereReposicion } from '../utils/metricasAdmin';
import { clasificarErrorAdmin } from '../utils/errorAdmin';
import GeneradorProductos from '../components/GeneradorProductos';
import AdminDashboard from '../components/AdminDashboard';
import AdminProductos from '../components/AdminProductos';
import FormularioProducto from '../components/FormularioProducto';
import ModalStock from '../components/ModalStock';
import ModalConfirmacion from '../components/ModalConfirmacion';
import ErrorCarga from '../components/ErrorCarga';
import { IndicadorCarga } from '../components/EsperarSesion';

function Admin() {
  // Sesión: el acceso al panel lo controla <RutaProtegida roles={['ADMIN']}> en App.jsx (ya no hay login interno).
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  // Productos: vienen de la API. Tras cada alta, edición, cambio de stock o borrado se vuelven a cargar.
  const { ultimos, cargando: cargandoProductos, error: errorProductos, recargar: recargarProductos } = useCarga(listarProductos, 'admin-productos');
  const productos = useMemo(() => ultimos ?? [], [ultimos]);

  // Órdenes: siguen locales hasta la etapa E8.
  const [ordenes, setOrdenes] = useState(obtenerOrdenes);
  const [tabActiva, setTabActiva] = useState('dashboard'); // 'dashboard' | 'productos' | 'ordenes' | 'generadores'
  const [soloCriticos, setSoloCriticos] = useState(false);

  // Diálogos
  const [formulario, setFormulario] = useState(null); // null | { producto: objeto|null }
  const [productoStock, setProductoStock] = useState(null);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const eliminandoRef = useRef(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [mensajeAlerta, setMensajeAlerta] = useState(null);

  useEffect(() => {
    const handleOrdenes = () => setOrdenes(obtenerOrdenes());
    window.addEventListener(EVENTO_ORDENES_ACTUALIZADAS, handleOrdenes);
    return () => window.removeEventListener(EVENTO_ORDENES_ACTUALIZADAS, handleOrdenes);
  }, []);

  const mostrarMensaje = (texto, tipo = 'dark') => {
    setMensajeAlerta({ texto, tipo });
    setTimeout(() => setMensajeAlerta(null), 3500);
  };

  const metricas = useMemo(() => calcularMetricasProductos(productos), [productos]);
  const productosReposicion = useMemo(
    () => productos.filter(requiereReposicion).sort((a, b) => Number(a.stock) - Number(b.stock)),
    [productos]
  );
  // Ventas: mientras las órdenes sean locales (hasta E8) se mantiene la tarjeta original.
  const ventas = {
    titulo: 'Ventas Registradas',
    valor: formatearCLP(ordenes.reduce((acc, o) => acc + (Number(o.total) || 0), 0)),
    subtitulo: `${ordenes.length} órdenes procesadas`
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

        {/* Hasta la etapa E8 las órdenes de este panel siguen locales: se avisa para no confundir con la tienda */}
        <div className="alert alert-warning rounded-2 mb-3" role="note">
          <strong>Órdenes locales de demostración.</strong> La pestaña Órdenes y la tarjeta de ventas todavía no están
          conectadas a la API (se integran en la etapa E8): las compras reales de los clientes no aparecen en esas listas.
        </div>

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
        {tabActiva === 'ordenes' && (
          <div className="admin-box p-3">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h2 className="admin-section-title mb-0">Registro de Órdenes y Ventas</h2>
                <span className="admin-muted">Listado de transacciones registradas</span>
              </div>
              <span className="admin-badge-soft">
                {ordenes.length} órdenes registradas
              </span>
            </div>

            <div className="table-responsive">
              <table className="table admin-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>N° Orden</th>
                    <th>Fecha / Hora</th>
                    <th>Cliente</th>
                    <th>Dirección de Entrega</th>
                    <th>Método de Pago</th>
                    <th className="admin-ta-end">Total Pagado</th>
                    <th>Estado</th>
                    <th className="admin-ta-end">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((ord) => (
                    <tr key={ord.idOrden}>
                      <td className="admin-cell-price">
                        #{ord.idOrden}
                      </td>
                      <td className="admin-muted">{ord.fecha}</td>
                      <td>
                        <div className="admin-cell-strong">{ord.cliente.nombre}</div>
                        <div className="admin-order-email">{ord.cliente.email}</div>
                      </td>
                      <td className="admin-td-address admin-muted marca-truncar">
                        {ord.cliente.direccion}
                      </td>
                      <td className="admin-muted">{ord.metodoPago}</td>
                      <td className="admin-ta-end admin-cell-price">
                        {formatearCLP(ord.total)}
                      </td>
                      <td>
                        <span className="admin-badge-soft">
                          {ord.estado}
                        </span>
                      </td>
                      <td className="admin-ta-end">
                        <button 
                          type="button"
                          className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2"
                          onClick={() => setOrdenSeleccionada(ord)}
                        >
                          Ver Boleta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

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

      {/* ============================================================== */}
      {/* MODAL: VER BOLETA                                              */}
      {/* ============================================================== */}
      {ordenSeleccionada && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  Boleta Electrónica #{ordenSeleccionada.idOrden}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => setOrdenSeleccionada(null)}></button>
              </div>

              <div className="modal-body p-3">
                <div className="border-bottom pb-2 mb-3">
                  <div className="admin-cell-strong">FERREFIX</div>
                  <small className="admin-muted">RUT: 76.845.120-K | Antonio Varas 666, Providencia</small>
                </div>

                <div className="admin-muted mb-3">
                  <div><strong>Fecha:</strong> {ordenSeleccionada.fecha}</div>
                  <div><strong>Cliente:</strong> {ordenSeleccionada.cliente.nombre}</div>
                  <div><strong>Email:</strong> {ordenSeleccionada.cliente.email}</div>
                  <div><strong>Dirección:</strong> {ordenSeleccionada.cliente.direccion}</div>
                  <div><strong>Método:</strong> {ordenSeleccionada.metodoPago}</div>
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
                      {ordenSeleccionada.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.nombre}</td>
                          <td className="admin-ta-center">{item.cantidad}</td>
                          <td className="admin-ta-end admin-mono">{formatearCLP(item.precioUnitario * item.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="admin-cell-strong">Total:</span>
                  <span className="admin-total-value">{formatearCLP(ordenSeleccionada.total)}</span>
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
