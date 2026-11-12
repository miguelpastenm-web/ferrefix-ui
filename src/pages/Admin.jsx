import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  subirImagenProducto,
  CATEGORIAS_PRODUCTOS,
  EVENTO_PRODUCTOS_ACTUALIZADOS
} from '../data/productos';
import { obtenerOrdenes, EVENTO_ORDENES_ACTUALIZADAS } from '../data/ordenes';
import { useAuth } from '../context/authContexto';
import ImagenProductoUploader from '../components/ImagenProductoUploader';
import GeneradorProductos from '../components/GeneradorProductos';

const FORM_INICIAL = {
  idProducto: '',
  nombre: '',
  marca: '',
  categoria: 'Herramientas',
  precioVenta: '',
  stock: '',
  descripcion: '',
  imagen: ''
};

function Admin() {
  // Sesión: el acceso al panel lo controla <RutaProtegida roles={['ADMIN']}> en App.jsx (ya no hay login interno).
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  // Datos
  const [productos, setProductos] = useState(obtenerProductos);
  const [ordenes, setOrdenes] = useState(obtenerOrdenes);
  const [tabActiva, setTabActiva] = useState('dashboard'); // 'dashboard' | 'productos' | 'ordenes'
  
  // Filtros de inventario
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroStockCritico, setFiltroStockCritico] = useState(false);

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [mensajeAlerta, setMensajeAlerta] = useState(null);

  // Sincronización en tiempo real
  useEffect(() => {
    const handleProductos = () => setProductos(obtenerProductos());
    const handleOrdenes = () => setOrdenes(obtenerOrdenes());

    window.addEventListener(EVENTO_PRODUCTOS_ACTUALIZADOS, handleProductos);
    window.addEventListener(EVENTO_ORDENES_ACTUALIZADAS, handleOrdenes);

    return () => {
      window.removeEventListener(EVENTO_PRODUCTOS_ACTUALIZADOS, handleProductos);
      window.removeEventListener(EVENTO_ORDENES_ACTUALIZADAS, handleOrdenes);
    };
  }, []);

  const mostrarMensaje = (texto, tipo = 'dark') => {
    setMensajeAlerta({ texto, tipo });
    setTimeout(() => {
      setMensajeAlerta(null);
    }, 3500);
  };

  // Métricas
  const metricas = useMemo(() => {
    const totalProductos = productos.length;
    const stockCriticoCount = productos.filter((p) => Number(p.stock) <= 5).length;
    const valorInventario = productos.reduce(
      (acc, p) => acc + (Number(p.precioVenta) || 0) * (Number(p.stock) || 0),
      0
    );
    const totalVentas = ordenes.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    return {
      totalProductos,
      stockCriticoCount,
      valorInventario,
      totalVentas,
      totalOrdenes: ordenes.length
    };
  }, [productos, ordenes]);

  // Filtro de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideTexto = 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(p.idProducto).includes(busqueda);
      
      const coincideCat = 
        filtroCategoria === 'Todas' || 
        p.categoria.toLowerCase() === filtroCategoria.toLowerCase();

      const coincideStock = !filtroStockCritico || Number(p.stock) <= 5;

      return coincideTexto && coincideCat && coincideStock;
    });
  }, [productos, busqueda, filtroCategoria, filtroStockCritico]);

  // Manejo de Modal Crear / Editar
  const abrirModalCrear = () => {
    setModoEdicion(false);
    setImagenArchivo(null);
    setFormData({
      ...FORM_INICIAL,
      idProducto: String(Date.now()).slice(-8)
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (prod) => {
    setModoEdicion(true);
    setImagenArchivo(null);
    setFormData({
      idProducto: prod.idProducto,
      nombre: prod.nombre,
      marca: prod.marca,
      categoria: prod.categoria,
      precioVenta: prod.precioVenta,
      stock: prod.stock,
      descripcion: prod.descripcion || '',
      imagen: prod.imagen || ''
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setImagenArchivo(null);
    setFormData(FORM_INICIAL);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.nombre.trim() || !formData.marca.trim()) {
      mostrarMensaje('Nombre y marca son requeridos.', 'danger');
      return;
    }

    // Si se eligió una imagen, se guarda en src/assets/products y se obtiene su URL.
    let imagenFinal = formData.imagen.trim();
    if (imagenArchivo) {
      setSubiendoImagen(true);
      try {
        imagenFinal = await subirImagenProducto(imagenArchivo);
      } catch (error) {
        mostrarMensaje(error.message || 'No se pudo guardar la imagen.', 'danger');
        setSubiendoImagen(false);
        return;
      }
      setSubiendoImagen(false);
    }

    if (modoEdicion) {
      actualizarProducto(formData.idProducto, {
        nombre: formData.nombre.trim(),
        marca: formData.marca.trim(),
        categoria: formData.categoria,
        precioVenta: Number(formData.precioVenta) || 0,
        stock: Number(formData.stock) || 0,
        descripcion: formData.descripcion.trim(),
        imagen: imagenFinal || undefined
      });
      mostrarMensaje(`Producto "${formData.nombre}" actualizado.`);
    } else {
      crearProducto({
        idProducto: formData.idProducto,
        nombre: formData.nombre.trim(),
        marca: formData.marca.trim(),
        categoria: formData.categoria,
        precioVenta: Number(formData.precioVenta) || 0,
        stock: Number(formData.stock) || 0,
        descripcion: formData.descripcion.trim(),
        imagen: imagenFinal || '/banner-web.webp'
      });
      mostrarMensaje(`Producto "${formData.nombre}" registrado al final del catálogo con éxito.`);
    }

    cerrarModal();
  };

  const ejecutarEliminacion = () => {
    if (productoAEliminar) {
      eliminarProducto(productoAEliminar.idProducto);
      mostrarMensaje(`Producto "${productoAEliminar.nombre}" eliminado del catálogo.`);
      setProductoAEliminar(null);
    }
  };

  const formatearCLP = (valor) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(valor);
  };

  const handleCerrarSesion = () => {
    logout();
    navigate('/', { replace: true });
  };

  // PANEL ADMINISTRATIVO PRINCIPAL
  return (
    <div className="admin-wrapper">

      {/* Barra de Navegación Exclusiva del Panel Admin */}
      <nav className="admin-navbar py-2 px-3">
        <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-2">
          
          {/* Marca / Identificador */}
          <div className="d-flex align-items-center gap-3">
            {/* Pestañas de la barra */}
            <div className="d-flex align-items-center gap-1 ms-2">
              <button 
                type="button"
                className={`admin-nav-btn ${tabActiva === 'dashboard' ? 'active' : ''}`}
                onClick={() => setTabActiva('dashboard')}
              >
                Dashboard
              </button>
              <button 
                type="button"
                className={`admin-nav-btn ${tabActiva === 'productos' ? 'active' : ''}`}
                onClick={() => setTabActiva('productos')}
              >
                Productos ({productos.length})
              </button>
              <button 
                type="button"
                className={`admin-nav-btn ${tabActiva === 'ordenes' ? 'active' : ''}`}
                onClick={() => setTabActiva('ordenes')}
              >
                Órdenes ({ordenes.length})
              </button>
              <button 
                type="button"
                className={`admin-nav-btn ${tabActiva === 'generadores' ? 'active' : ''}`}
                onClick={() => setTabActiva('generadores')}
              >
                Generadores
              </button>
            </div>
          </div>

          {/* Acciones del Administrador en la barra */}
          <div className="d-flex align-items-center gap-2">
            <button 
              type="button" 
              className="btn btn-ambar admin-btn-strong btn-sm rounded-1 px-3"
              onClick={abrirModalCrear}
            >
              + Agregar Producto
            </button>

            <div className="vr admin-vr mx-1 d-none d-md-block"></div>

            <span className="admin-user-email d-none d-md-inline">
              {usuario.email}
            </span>

            <button 
              type="button" 
              className="btn btn-outline-light btn-sm rounded-1 px-2"
              onClick={handleCerrarSesion}
              title="Cerrar Sesión de Administrador"
            >
              Salir
            </button>
          </div>

        </div>
      </nav>

      {/* Contenedor Principal */}
      <main className="container-fluid px-3 px-md-4 py-4">

        {/* Notificación informativa */}
        {mensajeAlerta && (
          <div className="admin-box p-3 mb-3 d-flex justify-content-between align-items-center" role="alert">
            <span className="admin-notice-text">
              {mensajeAlerta.texto}
            </span>
            <button 
              type="button" 
              className="btn-close btn-close-sm" 
              onClick={() => setMensajeAlerta(null)}
              aria-label="Cerrar"
            ></button>
          </div>
        )}

        {/* Dashboard */}
        {tabActiva === 'dashboard' && (
          <div>
            {/* 4 Cajas Cuadradas */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="admin-kpi-box">
                  <div className="admin-kpi-title">
                    Productos en Catálogo
                  </div>
                  <div className="admin-kpi-value mt-1">
                    {metricas.totalProductos}
                  </div>
                  <div className="admin-kpi-subtitle mt-1">
                    Artículos registrados
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="admin-kpi-box">
                  <div className="admin-kpi-title">
                    Stock Crítico (≤ 5 unids)
                  </div>
                  <div className="admin-kpi-value mt-1">
                    {metricas.stockCriticoCount}
                  </div>
                  <div className="admin-kpi-subtitle mt-1">
                    {metricas.stockCriticoCount > 0 ? 'Requieren reposición' : 'Niveles óptimos'}
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="admin-kpi-box">
                  <div className="admin-kpi-title">
                    Valor Total Inventario
                  </div>
                  <div className="admin-kpi-value admin-kpi-value-mono mt-1">
                    {formatearCLP(metricas.valorInventario)}
                  </div>
                  <div className="admin-kpi-subtitle mt-1">
                    Precio venta × stock
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="admin-kpi-box">
                  <div className="admin-kpi-title">
                    Ventas Registradas
                  </div>
                  <div className="admin-kpi-value admin-kpi-value-mono mt-1">
                    {formatearCLP(metricas.totalVentas)}
                  </div>
                  <div className="admin-kpi-subtitle mt-1">
                    {metricas.totalOrdenes} órdenes procesadas
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Inventario Crítico extendida */}
            <div className="row g-4">
              <div className="col-12">
                <div className="admin-box p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <div>
                      <h2 className="admin-section-title mb-0">Inventario con Stock Crítico (≤ 5)</h2>
                      <span className="admin-muted">Productos que requieren reposición prioritaria de inventario</span>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-outline-dark btn-sm rounded-1"
                      onClick={() => {
                        setTabActiva('productos');
                        setFiltroStockCritico(true);
                      }}
                    >
                      Ir a Inventario Completo →
                    </button>
                  </div>

                  {metricas.stockCriticoCount === 0 ? (
                    <div className="admin-empty admin-ta-center p-3">
                      Todos los productos cuentan con stock superior a 5 unidades.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table admin-table align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th className="admin-ta-center">Stock Disponible</th>
                            <th className="admin-ta-end">Precio (CLP)</th>
                            <th className="admin-ta-end">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productos
                            .filter((p) => Number(p.stock) <= 5)
                            .map((p) => (
                              <tr key={p.idProducto}>
                                <td className="admin-cell-code">#{p.idProducto}</td>
                                <td>
                                  <div className="admin-cell-strong">{p.nombre}</div>
                                  <div className="admin-item-brand">{p.marca}</div>
                                </td>
                                <td><span className="admin-badge-soft">{p.categoria}</span></td>
                                <td className="admin-ta-center">
                                  <span className="admin-badge-dark">
                                    {p.stock} unids (Bajo)
                                  </span>
                                </td>
                                <td className="admin-ta-end admin-cell-price">{formatearCLP(p.precioVenta)}</td>
                                <td className="admin-ta-end">
                                  <button 
                                    type="button"
                                    className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2"
                                    onClick={() => abrirModalEditar(p)}
                                  >
                                    Editar Stock
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventario Productos (CRUD)*/}
        {tabActiva === 'productos' && (
          <div className="admin-box p-3">
            
            {/* Barra de Filtros y Búsqueda */}
            <div className="row g-2 align-items-center mb-3 pb-3 border-bottom">
              <div className="col-12 col-md-4">
                <input 
                  type="text" 
                  className="form-control form-control-sm rounded-1"
                  placeholder="Buscar por nombre, marca o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="col-6 col-md-3">
                <select 
                  className="form-select form-select-sm rounded-1"
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  {CATEGORIAS_PRODUCTOS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-3">
                <button 
                  type="button"
                  className={`btn btn-sm w-100 rounded-1 ${filtroStockCritico ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setFiltroStockCritico(!filtroStockCritico)}
                >
                  {filtroStockCritico ? 'Mostrando solo críticos (≤ 5)' : 'Filtrar stock crítico'}
                </button>
              </div>

              <div className="col-12 col-md-2 admin-ta-md-end">
                <button 
                  type="button" 
                  className="btn btn-ambar admin-btn-strong btn-sm w-100 rounded-1"
                  onClick={abrirModalCrear}
                >
                  + Agregar Producto
                </button>
              </div>
            </div>

            {/* Tabla de Productos */}
            <div className="table-responsive">
              <table className="table admin-table align-middle mb-0">
                <thead>
                  <tr>
                    <th className="admin-th-thumb"></th>
                    <th>Código</th>
                    <th>Nombre / Descripción</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th className="admin-ta-end">Precio (CLP)</th>
                    <th className="admin-ta-center">Stock</th>
                    <th className="admin-th-actions admin-ta-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="admin-ta-center admin-muted py-4">
                        No se encontraron productos registrados con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    productosFiltrados.map((prod) => {
                      const esBajo = Number(prod.stock) <= 5;
                      return (
                        <tr key={prod.idProducto}>
                          <td>
                            <img 
                              src={prod.imagen || '/banner-web.webp'} 
                              alt={prod.nombre} 
                              className="admin-prod-thumb border rounded-1 bg-white object-fit-contain"
                              onError={(e) => { e.target.src = '/banner-web.webp'; }}
                            />
                          </td>
                          <td className="admin-cell-code">
                            #{prod.idProducto}
                          </td>
                          <td>
                            <div className="admin-cell-strong">{prod.nombre}</div>
                          </td>
                          <td className="admin-muted">{prod.marca}</td>
                          <td>
                            <span className="admin-badge-soft">
                              {prod.categoria}
                            </span>
                          </td>
                          <td className="admin-ta-end admin-cell-price">
                            {formatearCLP(prod.precioVenta)}
                          </td>
                          <td className="admin-ta-center">
                            <span className={`${esBajo ? 'admin-badge-warn' : 'admin-badge-soft'}`}>
                              {prod.stock} unids {esBajo ? '(Bajo)' : ''}
                            </span>
                          </td>
                          <td className="admin-ta-end">
                            <div className="btn-group btn-group-sm">
                              <button 
                                type="button"
                                className="btn btn-outline-dark rounded-1 px-2 py-0 me-1"
                                onClick={() => abrirModalEditar(prod)}
                                title="Editar producto"
                              >
                                Editar
                              </button>
                              <button 
                                type="button"
                                className="btn btn-outline-danger rounded-1 px-2 py-0"
                                onClick={() => setProductoAEliminar(prod)}
                                title="Eliminar producto"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-muted d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
              <span>Mostrando {productosFiltrados.length} de {productos.length} productos en total</span>
              <span>Categoría: {filtroCategoria}</span>
            </div>

          </div>
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

        {/* ============================================================== */}
        {/* VISTA: GENERADOR DE TARJETAS DE PRODUCTO                       */}
        {/* ============================================================== */}
        {tabActiva === 'generadores' && (
          <div>
            <GeneradorProductos />
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL: FORMULARIO AGREGAR / EDITAR PRODUCTO (CUADRADO)         */}
      {/* ============================================================== */}
      {modalAbierto && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow">
              
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  {modoEdicion ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={cerrarModal} aria-label="Cerrar"></button>
              </div>

              <form onSubmit={handleSubmitForm}>
                <div className="modal-body p-3">
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label admin-label mb-1">Código ID</label>
                      <input 
                        type="text" 
                        className="form-control form-control-sm rounded-1 admin-mono"
                        value={formData.idProducto}
                        disabled={modoEdicion}
                        onChange={(e) => setFormData({ ...formData, idProducto: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-8">
                      <label className="form-label admin-label mb-1">Nombre del Producto *</label>
                      <input 
                        type="text" 
                        className="form-control form-control-sm rounded-1"
                        placeholder="Ej: Taladro Percutor 20V Max XR"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label admin-label mb-1">Marca *</label>
                      <input 
                        type="text" 
                        className="form-control form-control-sm rounded-1"
                        placeholder="Ej: DeWalt, Bosch, Makita..."
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label admin-label mb-1">Categoría *</label>
                      <select 
                        className="form-select form-select-sm rounded-1"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      >
                        {CATEGORIAS_PRODUCTOS.filter(c => c !== 'Todas').map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label admin-label mb-1">Precio Unitario (CLP) *</label>
                      <input 
                        type="number" 
                        min="0"
                        step="100"
                        className="form-control form-control-sm rounded-1 admin-mono"
                        placeholder="129990"
                        value={formData.precioVenta}
                        onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label admin-label mb-1">Stock Disponible *</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-control form-control-sm rounded-1 admin-mono"
                        placeholder="10"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label admin-label mb-1">
                        Imagen del Producto {!imagenArchivo && !formData.imagen ? '(Opcional)' : ''}
                      </label>
                      <ImagenProductoUploader
                        archivo={imagenArchivo}
                        onSeleccionar={setImagenArchivo}
                        onQuitar={() => setImagenArchivo(null)}
                        imagenActual={formData.imagen}
                      />
                      {!imagenArchivo && formData.imagen && (
                        <div className="d-flex justify-content-end mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-1 py-0 px-2"
                            onClick={() => setFormData({ ...formData, imagen: '' })}
                          >
                            Usar imagen por defecto
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="col-12">
                      <label className="form-label admin-label mb-1">Descripción</label>
                      <textarea 
                        className="form-control form-control-sm rounded-1"
                        rows="3"
                        placeholder="Descripción técnica del producto..."
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer admin-modal-foot border-top py-2 px-3">
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-secondary rounded-1" 
                    onClick={cerrarModal}
                    disabled={subiendoImagen}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-ambar admin-btn-strong btn-sm rounded-1 px-3"
                    disabled={subiendoImagen}
                  >
                    {subiendoImagen
                      ? 'Guardando imagen...'
                      : modoEdicion ? 'Guardar Cambios' : 'Registrar Producto'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN                             */}
      {/* ============================================================== */}
      {productoAEliminar && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-body admin-ta-center p-4">
                <h5 className="admin-modal-title mb-2">¿Eliminar producto?</h5>
                <p className="admin-muted mb-4">
                  Se dará de baja el producto <strong>"{productoAEliminar.nombre}"</strong> (#{productoAEliminar.idProducto}) del catálogo en localStorage.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-secondary rounded-1 px-3" 
                    onClick={() => setProductoAEliminar(null)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-danger rounded-1 px-3" 
                    onClick={ejecutarEliminacion}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
