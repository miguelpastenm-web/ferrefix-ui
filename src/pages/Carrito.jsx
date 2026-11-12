import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  obtenerCarrito, 
  actualizarCantidad, 
  eliminarDelCarrito, 
  vaciarCarrito, 
  obtenerTotalesCarrito, 
  EVENTO_CARRITO_ACTUALIZADO 
} from '../data/carrito';
import { useAuth } from '../context/authContexto';
import { crearOrden } from '../data/ordenes';
import { obtenerProductoPorId, actualizarProducto } from '../data/productos';
import { REGIONES_CHILE, REGION_POR_DEFECTO, normalizarRegion, obtenerComunas, obtenerComunaPorDefecto } from '../data/chile';
import {
  validadores,
  validarFormulario,
  formatearRut,
  formatearTelefono
} from '../data/validaciones';

// Reglas de validación del formulario de despacho.
const REGLAS_VALIDACION = {
  nombre: validadores.nombre,
  rut: validadores.rut,
  email: validadores.email,
  telefono: validadores.telefono,
  direccion: validadores.direccion,
  comuna: validadores.requerido('La comuna')
};

function Carrito() {
  const [items, setItems] = useState(obtenerCarrito);
  const [totales, setTotales] = useState(obtenerTotalesCarrito);
  const { usuario: sesion } = useAuth();

  // Pasos: 'carrito' | 'checkout' | 'exito' | 'error'
  const [pasoActual, setPasoActual] = useState('carrito');
  const [ordenCreada, setOrdenCreada] = useState(null);
  const [alertaStock, setAlertaStock] = useState(null);

  // Formulario de despacho (Inicia vacío con placeholders de ejemplo; autocompleta nombre y correo si hay sesión)
  const regionInicial = normalizarRegion(sesion?.region || REGION_POR_DEFECTO);
  const [regionSeleccionada, setRegionSeleccionada] = useState(regionInicial);
  const [formCliente, setFormCliente] = useState({
    nombre: sesion ? sesion.nombre : '',
    rut: sesion ? (sesion.rut || '15.432.890-K') : '',
    email: sesion ? sesion.email : '',
    telefono: sesion ? (sesion.telefono || '+56 9 8765 4321') : '',
    direccion: sesion ? (sesion.direccion || 'Av. Providencia 1240, Depto 502') : '',
    region: regionInicial,
    comuna: sesion && sesion.comuna ? sesion.comuna : obtenerComunaPorDefecto(REGION_POR_DEFECTO),
    indicaciones: '',
    metodoEntrega: 'despacho',
    metodoPago: 'WebPay Plus (Débito)'
  });
  const [errores, setErrores] = useState({});
  const [touched, setTouched] = useState({});

  // Sincronizar en tiempo real
  useEffect(() => {
    const handleActualizar = () => {
      setItems(obtenerCarrito());
      setTotales(obtenerTotalesCarrito());
    };
    window.addEventListener(EVENTO_CARRITO_ACTUALIZADO, handleActualizar);
    return () => window.removeEventListener(EVENTO_CARRITO_ACTUALIZADO, handleActualizar);
  }, []);

  // Formateador CLP
  const formatearCLP = (valor) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  // Controles de cantidad con validación estricta de stock
  const handleModificarCantidad = (idProducto, nuevaCantidad) => {
    setAlertaStock(null);
    const resultado = actualizarCantidad(idProducto, nuevaCantidad);
    if (resultado && resultado.error) {
      setAlertaStock(resultado.error);
      setTimeout(() => setAlertaStock(null), 4000);
    }
  };

  const handleEliminarItem = (idProducto) => {
    eliminarDelCarrito(idProducto);
  };

  const handleVaciar = () => {
    if (window.confirm('¿Seguro que deseas vaciar todos los productos del carrito?')) {
      vaciarCarrito();
    }
  };

  // ---- Validación del formulario de despacho ----
  const validarCampo = (campo, valor) => {
    const validador = REGLAS_VALIDACION[campo];
    if (!validador) return;
    const mensaje = validador(valor);
    setErrores((prev) => ({ ...prev, [campo]: mensaje }));
  };

  const handleChange = (campo, valor) => {
    setFormCliente((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) validarCampo(campo, valor);
  };

  const handleBlur = (campo) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    validarCampo(campo, formCliente[campo]);
  };

  const claseCampo = (campo, base = 'form-control form-control-sm rounded-1') =>
    `${base}${errores[campo] ? ' is-invalid' : ''}`;

  const handleCambiarRegion = (nuevaRegion) => {
    const regionNorm = normalizarRegion(nuevaRegion);
    setRegionSeleccionada(regionNorm);
    const comuna = obtenerComunaPorDefecto(nuevaRegion);
    setFormCliente((prev) => ({ ...prev, region: nuevaRegion, comuna }));
    setErrores((prev) => ({ ...prev, comuna: '' }));
  };

  // Procesar orden / checkout
  const handleProcesarCompra = (e) => {
    e.preventDefault();

    if (items.length === 0) return;

    const nuevosErrores = validarFormulario(REGLAS_VALIDACION, formCliente);
    setErrores(nuevosErrores);
    setTouched(
      Object.keys(REGLAS_VALIDACION).reduce((acc, campo) => ({ ...acc, [campo]: true }), {})
    );
    if (Object.keys(nuevosErrores).length > 0) return;

    // 1. Descontar stock de la base de datos simulada
    items.forEach((item) => {
      const prod = obtenerProductoPorId(item.idProducto);
      if (prod) {
        const nuevoStock = Math.max(0, Number(prod.stock) - Number(item.cantidad));
        actualizarProducto(item.idProducto, { stock: nuevoStock });
      }
    });

    // 2. Registrar la orden en el módulo de órdenes
    const ordenGenerada = crearOrden({
      idOrden: `ORD-${Date.now().toString().slice(-6)}`,
      idUsuario: sesion ? sesion.id : null,
      cliente: {
        nombre: formCliente.nombre || (sesion ? sesion.nombre : ''),
        rut: formCliente.rut || (sesion ? (sesion.rut || '15.432.890-K') : ''),
        email: formCliente.email || (sesion ? sesion.email : ''),
        telefono: formCliente.telefono || (sesion ? (sesion.telefono || '+56 9 8765 4321') : ''),
        direccion: `${formCliente.direccion || (sesion ? sesion.direccion : '')}, ${formCliente.comuna}, ${formCliente.region}`
      },
      items: items.map((i) => ({
        idProducto: i.idProducto,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioVenta
      })),
      total: totales.total,
      metodoPago: formCliente.metodoPago,
      estado: 'Completada'
    });

    // 3. Vaciar carrito y mostrar confirmación
    vaciarCarrito();
    setOrdenCreada(ordenGenerada);
    setPasoActual('exito');
    window.scrollTo(0, 0);
  };

  return (
    <div className="carrito-page py-4 py-lg-5">
      <div className="container">

        {/* Migas de pan */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb carrito-breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
            <li className="breadcrumb-item"><Link to="/catalogo">Catálogo</Link></li>
            <li className="breadcrumb-item active" aria-current="page">
              {pasoActual === 'carrito' && 'Carrito de Compras'}
              {pasoActual === 'checkout' && 'Paso de Pago y Despacho'}
              {pasoActual === 'exito' && 'Confirmación de Compra'}
            </li>
          </ol>
        </nav>

        {/* Alerta de validación de stock */}
        {alertaStock && (
          <div className="alert alert-warning alert-dismissible fade show rounded-2 shadow-sm d-flex align-items-center mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill marca-icono me-2"></i>
            <div>{alertaStock}</div>
            <button type="button" className="btn-close" onClick={() => setAlertaStock(null)}></button>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 1: VISTA DE PRODUCTOS EN EL CARRITO                      */}
        {/* ============================================================== */}
        {pasoActual === 'carrito' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h1 className="marca-titulo marca-tam-2 mb-1">
                  Carrito de Compras
                </h1>
                <p className="marca-nota mb-0">
                  Revisa tus productos seleccionados y confirma las cantidades antes de pagar.
                </p>
              </div>

              {items.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-outline-danger btn-sm rounded-1"
                  onClick={handleVaciar}
                >
                  <i className="bi bi-trash3 me-1"></i>
                  Vaciar Carrito
                </button>
              )}
            </div>

            {items.length === 0 ? (
              // Carrito Vacío
              <div className="bg-white border rounded-1 p-5 marca-centro my-4 shadow-sm">
                <i className="bi bi-cart-x carrito-vacio-icon mb-3 d-block"></i>
                <h2 className="marca-titulo marca-tam-4 mb-2">Tu carrito está actualmente vacío</h2>
                <p className="marca-nota mb-4">
                  No has añadido herramientas ni materiales aún. Explora nuestro catálogo con stock disponible.
                </p>
                <Link to="/catalogo" className="btn btn-ambar marca-strong rounded-1 px-4 py-2 shadow-sm">
                  <i className="bi bi-box-seam me-2"></i>
                  Explorar Catálogo de Productos
                </Link>
              </div>
            ) : (
              // Tabla de productos y resumen
              <div className="row g-4">
                
                {/* Columna Izquierda: Listado de Productos */}
                <div className="col-12 col-lg-8">
                  <div className="bg-white border rounded-1 shadow-sm p-3">
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead className="table-light marca-fino">
                          <tr>
                            <th className="cart-th-photo">Foto</th>
                            <th>Producto</th>
                            <th className="marca-derecha">Precio</th>
                            <th className="cart-th-qty marca-centro">Cantidad</th>
                            <th className="marca-derecha">Subtotal</th>
                            <th className="cart-th-action marca-derecha"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.idProducto}>
                              <td>
                                <img 
                                  src={item.imagen} 
                                  alt={item.nombre} 
                                  className="cart-item-img border rounded-1 bg-white object-fit-contain"
                                  onError={(e) => { e.target.src = '/banner-web.webp'; }}
                                />
                              </td>
                              <td>
                                <Link 
                                  to={`/producto/${item.idProducto}`} 
                                  className="carrito-item-nombre d-block"
                                >
                                  {item.nombre}
                                </Link>
                                <small className="marca-muted">Marca: {item.marca} | Stock: {item.stock} unids.</small>
                              </td>
                              <td className="marca-derecha marca-nota marca-mono">
                                {formatearCLP(item.precioVenta)}
                              </td>
                              <td className="marca-centro">
                                <div className="input-group input-group-sm">
                                  <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={() => handleModificarCantidad(item.idProducto, item.cantidad - 1)}
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="text" 
                                    className="form-control marca-centro marca-bold bg-white"
                                    value={item.cantidad} 
                                    readOnly 
                                  />
                                  <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={() => handleModificarCantidad(item.idProducto, item.cantidad + 1)}
                                    disabled={item.cantidad >= item.stock}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="marca-derecha marca-precio">
                                {formatearCLP(item.precioVenta * item.cantidad)}
                              </td>
                              <td className="marca-derecha">
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-outline-danger border-0 p-1"
                                  onClick={() => handleEliminarItem(item.idProducto)}
                                  title="Quitar producto"
                                >
                                  <i className="bi bi-trash3"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <Link to="/catalogo" className="btn btn-outline-dark btn-sm rounded-1">
                      ← Seguir Comprando
                    </Link>
                    <span className="marca-nota">
                      Precios con IVA incluido.
                    </span>
                  </div>
                </div>

                {/* Columna Derecha: Tarjeta de Resumen */}
                <div className="col-12 col-lg-4">
                  <div className="bg-white border rounded-1 shadow-sm p-4">
                    <h2 className="marca-titulo marca-tam-5 mb-3 border-bottom pb-2">
                      Resumen del Pedido
                    </h2>

                    <div className="d-flex justify-content-between mb-2 marca-nota">
                      <span>Artículos ({totales.totalArticulos}):</span>
                      <span className="marca-mono marca-strong">{formatearCLP(totales.subtotal)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-3 marca-nota">
                      <span>Despacho a domicilio:</span>
                      <span className="marca-mono marca-strong marca-exito">
                        {totales.despacho === 0 ? 'Gratis' : formatearCLP(totales.despacho)}
                      </span>
                    </div>

                    <div className="cart-promo-alert alert alert-info py-2 px-3 marca-fino rounded-1 mb-3">
                      <i className="bi bi-truck me-1"></i>
                      Despacho gratis en compras superiores a $50.000 en la Región Metropolitana.
                    </div>

                    <hr />

                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <span className="marca-bold marca-tam-5">Total:</span>
                      <span className="marca-total">
                        {formatearCLP(totales.total)}
                      </span>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-ambar w-100 marca-bold py-3 rounded-1 shadow-sm mb-2"
                      onClick={() => setPasoActual('checkout')}
                    >
                      Continuar al Pago →
                    </button>

                    <div className="marca-centro marca-nota mt-2">
                      <i className="bi bi-shield-check me-1 marca-exito"></i>
                      Compra 100% segura con garantía de fábrica
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 2: CHECKOUT (DATOS DE DESPACHO Y PAGO)                    */}
        {/* ============================================================== */}
        {pasoActual === 'checkout' && (
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="bg-white border rounded-1 shadow-sm p-4 p-md-5">
                
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <div>
                    <h2 className="marca-titulo marca-tam-4 mb-1">
                      Paso de Pago y Despacho
                    </h2>
                    <p className="marca-nota mb-0">
                      Completa los datos de envío y selecciona tu método de pago.
                    </p>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary btn-sm rounded-1"
                    onClick={() => setPasoActual('carrito')}
                  >
                    ← Volver al Carrito
                  </button>
                </div>

                {!sesion && (
                  <div className="alert alert-warning marca-fino mb-4 rounded-1 d-flex align-items-center justify-content-between">
                    <div>
                      <i className="bi bi-info-circle-fill me-1"></i>
                      ¿Ya tienes cuenta? Inicia sesión para autocompletar tus datos.
                    </div>
                    <Link to="/login" className="btn btn-sm btn-dark rounded-1">
                      Iniciar Sesión
                    </Link>
                  </div>
                )}

                {Object.values(errores).some(Boolean) && (
                  <div className="alert alert-danger marca-fino mb-4 rounded-1 d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>Revisa los campos marcados en rojo antes de confirmar tu compra.</div>
                  </div>
                )}

                {sesion ? (
                  // USUARIO REGISTRADO: DATOS AUTOMÁTICOS, SOLO PEDIR MÉTODO DE PAGO
                  <form onSubmit={handleProcesarCompra} noValidate>
                    <div className="border rounded-1 p-4 mb-4 bg-white shadow-sm">
                      <div className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-3 border-bottom gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-check-fill text-success fs-4"></i>
                          <div>
                            <h3 className="marca-titulo marca-tam-6 mb-0">Datos de Despacho del Cliente Registrado</h3>
                            <span className="text-muted small">Tus datos de entrega fueron cargados automáticamente</span>
                          </div>
                        </div>
                        <Link to="/cuenta" className="btn btn-outline-dark btn-sm rounded-1 px-3">
                          <i className="bi bi-pencil me-1"></i> Modificar datos en mi cuenta
                        </Link>
                      </div>

                      <div className="row g-3 small">
                        <div className="col-12 col-md-6">
                          <div className="p-2 bg-light rounded-1 border">
                            <span className="text-muted d-block small">Destinatario:</span>
                            <strong className="text-dark">{formCliente.nombre || sesion.nombre}</strong>
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="p-2 bg-light rounded-1 border">
                            <span className="text-muted d-block small">RUN / RUT:</span>
                            <strong className="text-dark font-monospace">{formCliente.rut || sesion.rut || "15.432.890-K"}</strong>
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="p-2 bg-light rounded-1 border">
                            <span className="text-muted d-block small">Correo de Contacto:</span>
                            <strong className="text-dark font-monospace">{formCliente.email || sesion.email}</strong>
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="p-2 bg-light rounded-1 border">
                            <span className="text-muted d-block small">Teléfono de Entrega:</span>
                            <strong className="text-dark">{formCliente.telefono || sesion.telefono || "+56 9 8765 4321"}</strong>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="p-2 bg-light rounded-1 border">
                            <span className="text-muted d-block small">Dirección de Despacho:</span>
                            <strong className="text-dark">
                              {formCliente.direccion || sesion.direccion || "Av. Providencia 1240, Depto 502"}, {formCliente.comuna || sesion.comuna || "Providencia"}, {formCliente.region || sesion.region || "Región Metropolitana"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="checkout-section-title marca-titulo marca-tam-6 mb-3">
                      Selecciona tu Método de Pago
                    </h3>

                    <div className="mb-4">
                      <div className="form-check p-2 border rounded-1 mb-2 bg-light d-flex align-items-center">
                        <input 
                          className="form-check-input ms-1 me-3" 
                          type="radio" 
                          name="metodoPagoReg" 
                          id="webpayReg" 
                          value="WebPay Plus (Débito)"
                          checked={formCliente.metodoPago === "WebPay Plus (Débito)"}
                          onChange={(e) => setFormCliente({ ...formCliente, metodoPago: e.target.value })}
                        />
                        <label className="form-check-label marca-strong marca-fino flex-grow-1" htmlFor="webpayReg">
                          WebPay Plus / RedCompra (Débito)
                        </label>
                      </div>

                      <div className="form-check p-2 border rounded-1 mb-2 bg-light d-flex align-items-center">
                        <input 
                          className="form-check-input ms-1 me-3" 
                          type="radio" 
                          name="metodoPagoReg" 
                          id="creditoReg" 
                          value="Tarjeta de Crédito"
                          checked={formCliente.metodoPago === "Tarjeta de Crédito"}
                          onChange={(e) => setFormCliente({ ...formCliente, metodoPago: e.target.value })}
                        />
                        <label className="form-check-label marca-strong marca-fino flex-grow-1" htmlFor="creditoReg">
                          Tarjeta de Crédito (3 cuotas sin interés)
                        </label>
                      </div>

                      <div className="form-check p-2 border rounded-1 bg-light d-flex align-items-center">
                        <input 
                          className="form-check-input ms-1 me-3" 
                          type="radio" 
                          name="metodoPagoReg" 
                          id="transferenciaReg" 
                          value="Transferencia Bancaria"
                          checked={formCliente.metodoPago === "Transferencia Bancaria"}
                          onChange={(e) => setFormCliente({ ...formCliente, metodoPago: e.target.value })}
                        />
                        <label className="form-check-label marca-strong marca-fino flex-grow-1" htmlFor="transferenciaReg">
                          Transferencia Bancaria Electrónica Directa
                        </label>
                      </div>
                    </div>

                    {/* Resumen del cobro final */}
                    <div className="p-3 bg-platino border rounded-1 mb-4">
                      <div className="d-flex justify-content-between mb-1 marca-fino">
                        <span>Total de productos:</span>
                        <span className="marca-mono">{formatearCLP(totales.subtotal)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 marca-fino">
                        <span>Costo de envío:</span>
                        <span className="marca-mono marca-exito">
                          {totales.despacho === 0 ? "Gratis" : formatearCLP(totales.despacho)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <span className="marca-bold marca-tam-5">Total a Pagar:</span>
                        <span className="marca-total marca-exito">{formatearCLP(totales.total)}</span>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary btn-sm rounded-1"
                        onClick={() => setPasoActual("carrito")}
                      >
                        ← Volver al Carrito
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-ambar btn-sm marca-strong rounded-1 px-4 py-2 shadow-sm"
                      >
                        Confirmar y Pagar {formatearCLP(totales.total)}
                      </button>
                    </div>
                  </form>
                ) : (
                  // USUARIO SIN SESIÓN (INVITADO): FORMULARIO COMPLETO
                  <form onSubmit={handleProcesarCompra} noValidate>
                  <h3 className="checkout-section-title marca-titulo marca-tam-6 mb-3">
                    1. Información del Cliente
                  </h3>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label marca-label">Nombre y Apellido *</label>
                      <input 
                        type="text" 
                        className={claseCampo('nombre')}
                        placeholder="Ej: Pedro González"
                        value={formCliente.nombre}
                        onChange={(e) => handleChange('nombre', e.target.value)}
                        onBlur={() => handleBlur('nombre')}
                        required
                      />
                      {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label marca-label">RUT *</label>
                      <input 
                        type="text" 
                        className={claseCampo('rut')}
                        placeholder="Ej: 12.345.678-9"
                        value={formCliente.rut}
                        onChange={(e) => handleChange('rut', formatearRut(e.target.value))}
                        onBlur={() => handleBlur('rut')}
                        maxLength={12}
                        required
                      />
                      {errores.rut && <div className="invalid-feedback">{errores.rut}</div>}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label marca-label">Correo Electrónico *</label>
                      <input 
                        type="email" 
                        className={claseCampo('email')}
                        placeholder="ejemplo@correo.cl"
                        value={formCliente.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        required
                      />
                      {errores.email && <div className="invalid-feedback">{errores.email}</div>}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label marca-label">Teléfono de Contacto *</label>
                      <input 
                        type="tel" 
                        className={claseCampo('telefono')}
                        placeholder="+56 9 1234 5678"
                        value={formCliente.telefono}
                        onChange={(e) => handleChange('telefono', formatearTelefono(e.target.value))}
                        onBlur={() => handleBlur('telefono')}
                        inputMode="tel"
                        maxLength={17}
                        required
                      />
                      {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}
                    </div>
                  </div>

                  <h3 className="checkout-section-title marca-titulo marca-tam-6 mb-3">
                    2. Dirección y Opciones de Entrega
                  </h3>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-5">
                      <label className="form-label marca-label">Región *</label>
                      <select 
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
                      <label className="form-label marca-label">
                        Comuna (Selecciona de las disponibles) *
                      </label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light"><i className="bi bi-search marca-muted"></i></span>
                        <select 
                          className={`form-select form-select-sm rounded-end-1${errores.comuna ? ' is-invalid' : ''}`}
                          value={formCliente.comuna}
                          onChange={(e) => handleChange('comuna', e.target.value)}
                          onBlur={() => handleBlur('comuna')}
                          required
                        >
                          {obtenerComunas(regionSeleccionada).map((com) => (
                            <option key={com} value={com}>{com}</option>
                          ))}
                        </select>
                      </div>
                      {errores.comuna && <div className="invalid-feedback d-block">{errores.comuna}</div>}
                    </div>

                    <div className="col-12 col-md-8">
                      <label className="form-label marca-label">Calle, Número y Depto *</label>
                      <input 
                        type="text" 
                        className={claseCampo('direccion')}
                        placeholder="Ej: Av. Providencia 1240, Depto 502"
                        value={formCliente.direccion}
                        onChange={(e) => handleChange('direccion', e.target.value)}
                        onBlur={() => handleBlur('direccion')}
                        required
                      />
                      {errores.direccion && <div className="invalid-feedback">{errores.direccion}</div>}
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label marca-label">Indicaciones de Entrega (Opcional)</label>
                      <input 
                        type="text" 
                        className="form-control form-control-sm rounded-1"
                        placeholder="Ej: Dejar con conserje"
                        value={formCliente.indicaciones}
                        onChange={(e) => setFormCliente({ ...formCliente, indicaciones: e.target.value })}
                      />
                    </div>
                  </div>

                  <h3 className="checkout-section-title marca-titulo marca-tam-6 mb-3">
                    3. Método de Pago Simulado
                  </h3>

                  <div className="mb-4">
                    <div className="form-check p-2 border rounded-1 mb-2 bg-light">
                      <input 
                        className="form-check-input ms-1 me-2" 
                        type="radio" 
                        name="metodoPago" 
                        id="webpay" 
                        value="WebPay Plus (Débito)"
                        checked={formCliente.metodoPago === 'WebPay Plus (Débito)'}
                        onChange={(e) => setFormCliente({ ...formCliente, metodoPago: e.target.value })}
                      />
                      <label className="form-check-label marca-strong marca-fino" htmlFor="webpay">
                        WebPay Plus / RedCompra (Débito)
                      </label>
                    </div>

                    <div className="form-check p-2 border rounded-1 mb-2 bg-light">
                      <input 
                        className="form-check-input ms-1 me-2" 
                        type="radio" 
                        name="metodoPago" 
                        id="credito" 
                        value="Tarjeta de Crédito"
                        checked={formCliente.metodoPago === 'Tarjeta de Crédito'}
                        onChange={(e) => setFormCliente({ ...formCliente, metodoPago: e.target.value })}
                      />
                      <label className="form-check-label marca-strong marca-fino" htmlFor="credito">
                        Tarjeta de Crédito (3 cuotas sin interés)
                      </label>
                    </div>

                    <div className="form-check p-2 border rounded-1 bg-light">
                      <input 
                        className="form-check-input ms-1 me-2" 
                        type="radio" 
                        name="metodoPago" 
                        id="transferencia" 
                        value="Transferencia Bancaria"
                        checked={formCliente.metodoPago === 'Transferencia Bancaria'}
                        onChange={(e) => setFormCliente({ ...formCliente, metodoPago: e.target.value })}
                      />
                      <label className="form-check-label marca-strong marca-fino" htmlFor="transferencia">
                        Transferencia Electrónica Directa
                      </label>
                    </div>
                  </div>

                  {/* Resumen del cobro final */}
                  <div className="p-3 bg-platino border rounded-1 mb-4">
                    <div className="d-flex justify-content-between mb-1 marca-fino">
                      <span>Total de productos:</span>
                      <span className="marca-mono">{formatearCLP(totales.subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2 marca-fino">
                      <span>Costo de envío:</span>
                      <span className="marca-mono marca-exito">
                        {totales.despacho === 0 ? 'Gratis' : formatearCLP(totales.despacho)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <strong className="marca-bold marca-tam-5">Total a Pagar:</strong>
                      <strong className="marca-total">{formatearCLP(totales.total)}</strong>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-ambar w-100 marca-bold py-3 rounded-1 shadow-sm marca-tam-5"
                  >
                    Confirmar y Pagar {formatearCLP(totales.total)}
                  </button>

                </form>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 3: COMPRA EXITOSA Y BOLETA (Rúbrica Duoc Figura 7)         */}
        {/* ============================================================== */}
        {pasoActual === 'exito' && ordenCreada && (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-7">
              <div className="bg-white border rounded-1 shadow-sm p-4 p-md-5">
                
                <div className="marca-centro pb-4 border-bottom mb-4">
                  <div className="d-inline-flex p-3 bg-success-subtle marca-exito rounded-circle mb-3">
                    <i className="bi bi-check-lg carrito-check-icon"></i>
                  </div>
                  <h1 className="marca-titulo marca-tam-4 mb-1">
                    ¡Se ha realizado la compra con éxito!
                  </h1>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <span className="marca-chip marca-chip--oscuro marca-mono px-3 py-2">
                      Orden: #{ordenCreada.idOrden}
                    </span>
                    <span className="marca-chip marca-chip--gris marca-mono px-3 py-2">
                      N° Boleta: {ordenCreada.numeroBoleta}
                    </span>
                  </div>
                </div>

                {/* Datos del Cliente y Despacho */}
                <div className="mb-4 marca-fino">
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <strong className="d-block marca-muted">Cliente:</strong>
                      <span className="marca-strong">{ordenCreada.cliente.nombre}</span>
                    </div>
                    <div className="col-sm-6">
                      <strong className="d-block marca-muted">RUT:</strong>
                      <span className="marca-oscuro">{ordenCreada.cliente.rut}</span>
                    </div>
                    <div className="col-sm-6 mt-2">
                      <strong className="d-block marca-muted">Correo:</strong>
                      <span className="marca-oscuro">{ordenCreada.cliente.email}</span>
                    </div>
                    <div className="col-12 mt-2">
                      <strong className="d-block marca-muted">Dirección de Entrega:</strong>
                      <span className="marca-oscuro">{ordenCreada.cliente.direccion}</span>
                    </div>
                    <div className="col-sm-6 mt-2">
                      <strong className="d-block marca-muted">Fecha de Pago:</strong>
                      <span className="marca-oscuro">{ordenCreada.fecha}</span>
                    </div>
                    <div className="col-sm-6 mt-2">
                      <strong className="d-block marca-muted">Método de Pago:</strong>
                      <span className="marca-oscuro">{ordenCreada.metodoPago}</span>
                    </div>
                  </div>
                </div>

                {/* Tabla de ítems adquiridos */}
                <div className="table-responsive border rounded-1 mb-4">
                  <table className="table table-sm align-middle mb-0 marca-fino">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th className="marca-centro">Cant.</th>
                        <th className="marca-derecha">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenCreada.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.nombre}</td>
                          <td className="marca-centro">{it.cantidad}</td>
                          <td className="marca-derecha marca-mono">{formatearCLP(it.precioUnitario * it.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="d-flex justify-content-between align-items-center p-3 bg-platino border rounded-1 mb-4">
                  <span className="marca-bold marca-tam-5">Total Pagado:</span>
                  <span className="marca-total marca-exito">{formatearCLP(ordenCreada.total)}</span>
                </div>

                {/* Acciones */}
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <Link to="/catalogo" className="btn btn-ambar btn-sm marca-strong rounded-1 px-4">
                    Volver al Catálogo
                  </Link>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Carrito;
