import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  obtenerCarrito,
  actualizarCantidad,
  eliminarDelCarrito,
  vaciarCarrito,
  guardarCarrito,
  calcularTotales,
  EVENTO_CARRITO_ACTUALIZADO
} from '../data/carrito';
import { useAuth } from '../context/authContexto';
import { listarProductos } from '../api/productos';
import { crearOrden } from '../api/ordenes';
import { ApiError, erroresPorCampo } from '../api/errores';
import { useCarga } from '../hooks/useCarga';
import { sincronizarCarrito, detectarProblemas, PROBLEMA } from '../utils/carritoSync';
import { esConflictoDeBloqueo, marcasDeError, MENSAJE_COMPRA_SIN_CONFIRMAR, MENSAJE_SESION_EXPIRADA } from '../utils/errorOrden';
import { NOTA_ESTIMACION, TEXTO_ENVIO_GRATIS } from '../utils/envio';
import { METODOS_PAGO } from '../utils/estadosOrden';
import { formatearCLP } from '../utils/formato';
import Boleta from '../components/Boleta';
import { REGIONES_CHILE, REGION_POR_DEFECTO, normalizarRegion, obtenerComunas, obtenerComunaPorDefecto } from '../data/chile';
import { validadores, validarFormulario, formatearTelefono } from '../data/validaciones';

// Mismas reglas que el backend (CrearOrdenRequestDto): teléfono, dirección (≤200), región y comuna (≤80, obligatorias),
// indicaciones (≤500). La interfaz es algo más estricta en teléfono y dirección (formato chileno, ≤80).
const REGLAS_ENVIO = {
  telefono: validadores.telefono,
  direccion: validadores.direccion,
  region: validadores.requerido('La región'),
  comuna: validadores.requerido('La comuna'),
  indicaciones: validadores.indicaciones
};

const CAMPO_DEL_BACKEND = { telefono: 'telefono', direccionEnvio: 'direccion', region: 'region', comuna: 'comuna', indicaciones: 'indicaciones' };

function Carrito() {
  const { usuario: sesion, esAdmin, esCliente } = useAuth();
  const [items, setItems] = useState(obtenerCarrito);
  const totales = useMemo(() => calcularTotales(items), [items]);

  // Pasos: 'carrito' | 'checkout' | 'exito'
  const [pasoActual, setPasoActual] = useState('carrito');
  // El checkout exige sesión: si deja de haberla (venció, o se cerró en otra pestaña) se muestra el carrito, nunca una
  // pantalla vacía. Se deduce al renderizar; `pasoActual` conserva lo elegido por si la sesión vuelve.
  const paso = pasoActual === 'checkout' && !sesion ? 'carrito' : pasoActual;
  const [ordenCreada, setOrdenCreada] = useState(null);
  const [alertaStock, setAlertaStock] = useState(null);
  const [precioAvisoOculto, setPrecioAvisoOculto] = useState(false);

  // Rechazo del servidor al comprar: mensaje general + líneas marcadas.
  const [errorCompra, setErrorCompra] = useState(null); // { tipo: 'sin-confirmar'|'sesion'|'ocupado'|'stock'|'otro', mensaje, detalles }
  const [marcas, setMarcas] = useState({ datos: {}, base: null }); // líneas marcadas por el rechazo y el catálogo vigente en ese momento
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  // Formulario de envío: solo los datos que el backend acepta. Nombre, RUT y correo salen de la sesión (token).
  const regionInicial = normalizarRegion(sesion?.region || REGION_POR_DEFECTO);
  const [regionSeleccionada, setRegionSeleccionada] = useState(regionInicial);
  const [formEnvio, setFormEnvio] = useState({
    telefono: sesion?.telefono ?? '',
    direccion: sesion?.direccion ?? '',
    region: regionInicial,
    comuna: sesion?.comuna || obtenerComunaPorDefecto(regionInicial),
    indicaciones: '',
    metodoPago: METODOS_PAGO[0].valor
  });
  const [errores, setErrores] = useState({});
  const [touched, setTouched] = useState({});

  // Sincronizar en tiempo real con el almacenamiento
  useEffect(() => {
    const handleActualizar = () => setItems(obtenerCarrito());
    window.addEventListener(EVENTO_CARRITO_ACTUALIZADO, handleActualizar);
    return () => window.removeEventListener(EVENTO_CARRITO_ACTUALIZADO, handleActualizar);
  }, []);

  // Una sola llamada a GET /productos concilia el carrito con el catálogo real: actualiza precio y stock guardados
  // (el cambio de precio avisa pero no bloquea) y permite detectar productos que ya no existen o sin stock.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  const { datos: catalogo, error: errorCatalogo, recargar: recargarCatalogo } = useCarga(async () => {
    if (obtenerCarrito().length === 0) return { productos: null, cambiosPrecio: [] };
    const productos = await listarProductos();
    const resultado = sincronizarCarrito(obtenerCarrito(), productos);
    if (resultado.huboCambios) guardarCarrito(resultado.items);
    return { productos, cambiosPrecio: resultado.cambiosPrecio };
  }, 'carrito');

  const problemas = useMemo(() => detectarProblemas(items, catalogo?.productos), [items, catalogo]);
  // Las marcas del servidor valen mientras no llegue un catálogo más nuevo: desde entonces mandan `problemas`.
  const marcasServidor = marcas.base === catalogo ? marcas.datos : {};
  const hayBloqueo = Object.keys(problemas).length > 0 || Object.keys(marcasServidor).length > 0;
  const cambiosPrecio = precioAvisoOculto ? [] : (catalogo?.cambiosPrecio ?? []);

  const quitarMarca = (productoId) =>
    setMarcas((previas) => {
      if (!(productoId in previas.datos)) return previas;
      const datos = { ...previas.datos };
      delete datos[productoId];
      return { ...previas, datos };
    });

  // Controles de cantidad con validación estricta de stock
  const handleModificarCantidad = (productoId, nuevaCantidad) => {
    setAlertaStock(null);
    quitarMarca(productoId);
    const resultado = actualizarCantidad(productoId, nuevaCantidad);
    if (resultado && resultado.error) {
      setAlertaStock(resultado.error);
      setTimeout(() => setAlertaStock(null), 4000);
    }
  };

  const handleEliminarItem = (productoId) => {
    quitarMarca(productoId);
    eliminarDelCarrito(productoId);
  };

  const handleVaciar = () => {
    if (window.confirm('¿Seguro que deseas vaciar todos los productos del carrito?')) {
      setMarcas({ datos: {}, base: null });
      vaciarCarrito();
    }
  };

  // ---- Validación del formulario de envío ----
  const validarCampo = (campo, valor) => {
    const validador = REGLAS_ENVIO[campo];
    if (!validador) return;
    setErrores((prev) => ({ ...prev, [campo]: validador(valor) }));
  };

  const handleChange = (campo, valor) => {
    setFormEnvio((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) validarCampo(campo, valor);
  };

  const handleBlur = (campo) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    validarCampo(campo, formEnvio[campo]);
  };

  const claseCampo = (campo, base = 'form-control form-control-sm rounded-1') =>
    `${base}${errores[campo] ? ' is-invalid' : ''}`;

  const handleCambiarRegion = (nuevaRegion) => {
    setRegionSeleccionada(normalizarRegion(nuevaRegion));
    setFormEnvio((prev) => ({ ...prev, region: nuevaRegion, comuna: obtenerComunaPorDefecto(nuevaRegion) }));
    setErrores((prev) => ({ ...prev, comuna: '' }));
  };

  // ---- Confirmar compra: POST /ordenes ----
  const interpretarRechazo = (error) => {
    if (!(error instanceof ApiError)) {
      setErrorCompra({ tipo: 'otro', mensaje: 'Ocurrió un error inesperado. Revisa Mis compras antes de volver a intentar.', detalles: [] });
      return;
    }
    // 401: la sesión ya no es válida (el cliente HTTP intentó renovarla y no se pudo). La orden NO se creó. Se vuelve al
    // carrito, que se conserva, con un mensaje claro y el acceso para iniciar sesión.
    if (error.status === 401) {
      setErrorCompra({ tipo: 'sesion', mensaje: MENSAJE_SESION_EXPIRADA, detalles: [] });
      setPasoActual('carrito');
      return;
    }
    // Sin respuesta (red caída, tiempo agotado) o fallo del servidor: NO sabemos si la orden se creó. No se vacía el
    // carrito ni se reintenta solo.
    if (error.esTransitorio) {
      setErrorCompra({ tipo: 'sin-confirmar', mensaje: MENSAJE_COMPRA_SIN_CONFIRMAR, detalles: [] });
      return;
    }
    if (esConflictoDeBloqueo(error)) {
      setErrorCompra({ tipo: 'ocupado', mensaje: error.mensaje, detalles: [] });
      return;
    }
    if (error.status === 409 || error.status === 404) {
      setMarcas({ datos: marcasDeError(error, itemsRef.current), base: catalogo });
      setErrorCompra({ tipo: 'stock', mensaje: error.mensaje, detalles: error.detalles });
      setPasoActual('carrito');
      recargarCatalogo(); // trae el stock vigente para ofrecer "Ajustar" / "Quitar"
      return;
    }
    if (error.status === 400) {
      const delServidor = erroresPorCampo(error);
      const mapeados = {};
      Object.entries(CAMPO_DEL_BACKEND).forEach(([campoServidor, campo]) => {
        if (delServidor[campoServidor]) mapeados[campo] = delServidor[campoServidor];
      });
      setErrores((prev) => ({ ...prev, ...mapeados }));
      setErrorCompra({ tipo: 'otro', mensaje: error.mensaje, detalles: error.detalles });
      return;
    }
    setErrorCompra({ tipo: 'otro', mensaje: error.mensaje, detalles: error.detalles });
  };

  const confirmarCompra = async () => {
    if (enviandoRef.current || items.length === 0) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErrorCompra(null);
    try {
      const orden = await crearOrden({
        items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        metodoPago: formEnvio.metodoPago,
        telefono: formEnvio.telefono,
        direccionEnvio: formEnvio.direccion,
        region: formEnvio.region,
        comuna: formEnvio.comuna,
        indicaciones: formEnvio.indicaciones
      });
      vaciarCarrito(); // solo cuando el servidor confirmó (201)
      setOrdenCreada(orden);
      setPasoActual('exito');
      window.scrollTo(0, 0);
    } catch (error) {
      interpretarRechazo(error);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const handleProcesarCompra = (e) => {
    e.preventDefault();
    if (items.length === 0 || hayBloqueo) return;
    const nuevosErrores = validarFormulario(REGLAS_ENVIO, formEnvio);
    setErrores(nuevosErrores);
    setTouched(Object.keys(REGLAS_ENVIO).reduce((acc, campo) => ({ ...acc, [campo]: true }), {}));
    if (Object.keys(nuevosErrores).length > 0) return;
    confirmarCompra();
  };

  const avisoDeLinea = (item) => {
    const problema = problemas[item.productoId];
    const marca = marcasServidor[item.productoId];
    if (!problema && !marca) return null;
    return (
      <div className="small text-danger mt-1" role="alert">
        {problema?.tipo === PROBLEMA.NO_EXISTE && <span>Este producto ya no está disponible en el catálogo.</span>}
        {problema?.tipo === PROBLEMA.AGOTADO && <span>Este producto está agotado.</span>}
        {problema?.tipo === PROBLEMA.EXCEDE && <span>Solo quedan {problema.stockDisponible} unidades disponibles.</span>}
        {marca && !problema && <span>{marca}</span>}
        <div className="d-flex flex-wrap gap-2 mt-1">
          {problema?.tipo === PROBLEMA.EXCEDE && (
            <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => handleModificarCantidad(item.productoId, problema.stockDisponible)}>
              Ajustar a {problema.stockDisponible}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleEliminarItem(item.productoId)}>
            Quitar
          </button>
        </div>
      </div>
    );
  };

  const resumenCostos = (
    <>
      <div className="d-flex justify-content-between mb-1 marca-fino">
        <span>Artículos ({totales.totalArticulos}):</span>
        <span className="marca-mono marca-strong">{formatearCLP(totales.subtotal)}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 marca-fino">
        <span>Despacho estimado:</span>
        <span className="marca-mono marca-strong marca-exito">
          {totales.despachoEstimado === 0 ? 'Gratis' : formatearCLP(totales.despachoEstimado)}
        </span>
      </div>
      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
        <span className="marca-bold marca-tam-5">Total estimado:</span>
        <span className="marca-total">{formatearCLP(totales.totalEstimado)}</span>
      </div>
      <small className="d-block text-muted mt-2">{NOTA_ESTIMACION}</small>
    </>
  );

  return (
    <div className="carrito-page py-4 py-lg-5">
      <div className="container">

        {/* Migas de pan */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb carrito-breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
            <li className="breadcrumb-item"><Link to="/catalogo">Catálogo</Link></li>
            <li className="breadcrumb-item active" aria-current="page">
              {paso === 'carrito' && 'Carrito de Compras'}
              {paso === 'checkout' && 'Paso de Pago y Despacho'}
              {paso === 'exito' && 'Confirmación de Compra'}
            </li>
          </ol>
        </nav>

        {alertaStock && (
          <div className="alert alert-warning alert-dismissible fade show rounded-2 shadow-sm d-flex align-items-center mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill marca-icono me-2"></i>
            <div>{alertaStock}</div>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setAlertaStock(null)}></button>
          </div>
        )}

        {/* Rechazo o duda al confirmar la compra */}
        {errorCompra && paso !== 'exito' && (
          <div className={`alert ${errorCompra.tipo === 'sin-confirmar' ? 'alert-warning' : 'alert-danger'} rounded-2 shadow-sm mb-4`} role="alert">
            <p className="mb-1 fw-semibold" data-testid="mensaje-error-compra">{errorCompra.mensaje}</p>
            {errorCompra.detalles.length > 0 && (
              <ul className="mb-2 small">
                {errorCompra.detalles.map((detalle) => (
                  <li key={detalle}>{detalle}</li>
                ))}
              </ul>
            )}
            <div className="d-flex flex-wrap gap-2">
              {errorCompra.tipo === 'sin-confirmar' && (
                <Link to="/cuenta?tab=compras" className="btn btn-sm btn-dark">Revisar Mis compras</Link>
              )}
              {errorCompra.tipo === 'sesion' && (
                <Link to={`/login?next=${encodeURIComponent('/carrito')}`} className="btn btn-sm btn-dark">Iniciar sesión</Link>
              )}
              {errorCompra.tipo === 'ocupado' && (
                <button type="button" className="btn btn-sm btn-dark" onClick={confirmarCompra} disabled={enviando}>
                  Reintentar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 1: VISTA DE PRODUCTOS EN EL CARRITO                      */}
        {/* ============================================================== */}
        {paso === 'carrito' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h1 className="marca-titulo marca-tam-2 mb-1">Carrito de Compras</h1>
                <p className="marca-nota mb-0">
                  Revisa tus productos seleccionados y confirma las cantidades antes de pagar.
                </p>
              </div>
              {items.length > 0 && (
                <button type="button" className="btn btn-outline-danger btn-sm rounded-1" onClick={handleVaciar}>
                  <i className="bi bi-trash3 me-1"></i>
                  Vaciar Carrito
                </button>
              )}
            </div>

            {errorCatalogo && items.length > 0 && (
              <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
                <span>No pudimos verificar la disponibilidad actual de tus productos. Puedes continuar: el servidor la validará al comprar.</span>
                <button type="button" className="btn btn-sm btn-outline-dark" onClick={recargarCatalogo}>Reintentar</button>
              </div>
            )}

            {cambiosPrecio.length > 0 && (
              <div className="alert alert-info alert-dismissible rounded-2" role="status">
                <strong>Actualizamos algunos precios:</strong>
                <ul className="mb-0 small">
                  {cambiosPrecio.map((c) => (
                    <li key={c.productoId}>
                      {c.nombre}: de {formatearCLP(c.anterior)} a {formatearCLP(c.nuevo)}
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn-close" aria-label="Cerrar aviso de precios" onClick={() => setPrecioAvisoOculto(true)}></button>
              </div>
            )}

            {items.length === 0 ? (
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
                          {items.map((item) => {
                            const conProblema = Boolean(problemas[item.productoId] || marcasServidor[item.productoId]);
                            const noExiste = problemas[item.productoId]?.tipo === PROBLEMA.NO_EXISTE;
                            return (
                              <tr key={item.productoId} className={conProblema ? 'table-warning' : ''} data-testid={`linea-${item.productoId}`}>
                                <td>
                                  <img
                                    src={item.imagen}
                                    alt={item.nombre}
                                    className="cart-item-img border rounded-1 bg-white object-fit-contain"
                                    onError={(e) => { e.target.src = '/banner-web.webp'; }}
                                  />
                                </td>
                                <td>
                                  <Link to={`/producto/${item.productoId}`} className="carrito-item-nombre d-block">
                                    {item.nombre}
                                  </Link>
                                  <small className="marca-muted">Marca: {item.marca} | Stock: {item.stock} unids.</small>
                                  {avisoDeLinea(item)}
                                </td>
                                <td className="marca-derecha marca-nota marca-mono">{formatearCLP(item.precioVenta)}</td>
                                <td className="marca-centro">
                                  <div className="input-group input-group-sm">
                                    <button
                                      className="btn btn-outline-secondary"
                                      type="button"
                                      aria-label={`Restar una unidad de ${item.nombre}`}
                                      onClick={() => handleModificarCantidad(item.productoId, item.cantidad - 1)}
                                      disabled={noExiste}
                                    >
                                      -
                                    </button>
                                    <input type="text" className="form-control marca-centro marca-bold bg-white" value={item.cantidad} readOnly aria-label={`Cantidad de ${item.nombre}`} />
                                    <button
                                      className="btn btn-outline-secondary"
                                      type="button"
                                      aria-label={`Sumar una unidad de ${item.nombre}`}
                                      onClick={() => handleModificarCantidad(item.productoId, item.cantidad + 1)}
                                      disabled={noExiste || item.cantidad >= item.stock}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="marca-derecha marca-precio">{formatearCLP(item.precioVenta * item.cantidad)}</td>
                                <td className="marca-derecha">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger border-0 p-1"
                                    onClick={() => handleEliminarItem(item.productoId)}
                                    title="Quitar producto"
                                    aria-label={`Quitar ${item.nombre}`}
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <Link to="/catalogo" className="btn btn-outline-dark btn-sm rounded-1">← Seguir Comprando</Link>
                    <span className="marca-nota">Precios con IVA incluido.</span>
                  </div>
                </div>

                {/* Columna Derecha: Tarjeta de Resumen */}
                <div className="col-12 col-lg-4">
                  <div className="bg-white border rounded-1 shadow-sm p-4">
                    <h2 className="marca-titulo marca-tam-5 mb-3 border-bottom pb-2">Resumen del Pedido</h2>
                    {resumenCostos}

                    <div className="cart-promo-alert alert alert-info py-2 px-3 marca-fino rounded-1 my-3">
                      <i className="bi bi-truck me-1"></i>
                      {TEXTO_ENVIO_GRATIS}
                    </div>

                    {hayBloqueo && (
                      <div className="alert alert-warning py-2 px-3 marca-fino rounded-1" role="alert">
                        Resuelve los avisos de tu carrito (ajusta o quita los productos marcados) para continuar.
                      </div>
                    )}

                    {esAdmin ? (
                      <div className="alert alert-secondary py-2 px-3 marca-fino rounded-1 mb-0" role="note">
                        Las cuentas de administrador no realizan compras. Ingresa con una cuenta de cliente para comprar.
                      </div>
                    ) : esCliente ? (
                      <button
                        type="button"
                        className="btn btn-ambar w-100 marca-bold py-3 rounded-1 shadow-sm mb-2"
                        onClick={() => { setErrorCompra(null); setPasoActual('checkout'); }}
                        disabled={hayBloqueo}
                      >
                        Continuar al Pago →
                      </button>
                    ) : (
                      <Link to={`/login?next=${encodeURIComponent('/carrito')}`} className="btn btn-ambar w-100 marca-bold py-3 rounded-1 shadow-sm mb-2">
                        Inicia sesión para pagar
                      </Link>
                    )}

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
        {paso === 'checkout' && (
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="bg-white border rounded-1 shadow-sm p-4 p-md-5">

                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <div>
                    <h2 className="marca-titulo marca-tam-4 mb-1">Paso de Pago y Despacho</h2>
                    <p className="marca-nota mb-0">Completa los datos de envío y selecciona tu método de pago.</p>
                  </div>
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-1" onClick={() => setPasoActual('carrito')}>
                    ← Volver al Carrito
                  </button>
                </div>

                {Object.values(errores).some(Boolean) && (
                  <div className="alert alert-danger marca-fino mb-4 rounded-1 d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>Revisa los campos marcados en rojo antes de confirmar tu compra.</div>
                  </div>
                )}

                <form onSubmit={handleProcesarCompra} noValidate>
                  <h3 className="checkout-section-title marca-titulo marca-tam-6 mb-3">1. Cliente</h3>
                  <div className="row g-3 small mb-4">
                    <div className="col-12 col-md-6">
                      <div className="p-2 bg-light rounded-1 border">
                        <span className="text-muted d-block small">Destinatario:</span>
                        <strong className="text-dark">{sesion.nombre}</strong>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="p-2 bg-light rounded-1 border">
                        <span className="text-muted d-block small">RUN / RUT:</span>
                        <strong className="text-dark font-monospace">{sesion.rut}</strong>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="p-2 bg-light rounded-1 border">
                        <span className="text-muted d-block small">Correo de Contacto:</span>
                        <strong className="text-dark font-monospace">{sesion.email}</strong>
                      </div>
                    </div>
                  </div>

                  <h3 className="checkout-section-title marca-titulo marca-tam-6 mb-3">2. Dirección y Opciones de Entrega</h3>
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label htmlFor="envio-telefono" className="form-label marca-label">Teléfono de Contacto *</label>
                      <input
                        id="envio-telefono"
                        type="tel"
                        autoComplete="tel"
                        className={claseCampo('telefono')}
                        placeholder="+56 9 1234 5678"
                        value={formEnvio.telefono}
                        onChange={(e) => handleChange('telefono', formatearTelefono(e.target.value))}
                        onBlur={() => handleBlur('telefono')}
                        inputMode="tel"
                        maxLength={17}
                        required
                      />
                      {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="envio-region" className="form-label marca-label">Región *</label>
                      <select
                        id="envio-region"
                        className="form-select form-select-sm rounded-1"
                        value={regionSeleccionada}
                        onChange={(e) => handleCambiarRegion(e.target.value)}
                      >
                        {REGIONES_CHILE.map((r) => (
                          <option key={r.region} value={r.region}>{r.region}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="envio-comuna" className="form-label marca-label">Comuna *</label>
                      <select
                        id="envio-comuna"
                        className={`form-select form-select-sm rounded-1${errores.comuna ? ' is-invalid' : ''}`}
                        value={formEnvio.comuna}
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

                    <div className="col-12 col-md-6">
                      <label htmlFor="envio-direccion" className="form-label marca-label">Calle, Número y Depto *</label>
                      <input
                        id="envio-direccion"
                        type="text"
                        autoComplete="street-address"
                        className={claseCampo('direccion')}
                        placeholder="Ej: Av. Providencia 1240, Depto 502"
                        value={formEnvio.direccion}
                        onChange={(e) => handleChange('direccion', e.target.value)}
                        onBlur={() => handleBlur('direccion')}
                        required
                      />
                      {errores.direccion && <div className="invalid-feedback">{errores.direccion}</div>}
                    </div>

                    <div className="col-12">
                      <label htmlFor="envio-indicaciones" className="form-label marca-label">Indicaciones de Entrega (Opcional)</label>
                      <input
                        id="envio-indicaciones"
                        type="text"
                        className={claseCampo('indicaciones')}
                        placeholder="Ej: Dejar con conserje"
                        value={formEnvio.indicaciones}
                        onChange={(e) => handleChange('indicaciones', e.target.value)}
                        onBlur={() => handleBlur('indicaciones')}
                      />
                      {errores.indicaciones && <div className="invalid-feedback">{errores.indicaciones}</div>}
                    </div>
                  </div>

                  <fieldset className="mb-4">
                    <legend className="checkout-section-title marca-titulo marca-tam-6 mb-3">3. Método de Pago Simulado</legend>
                    {METODOS_PAGO.map((metodo) => (
                      <div key={metodo.valor} className="form-check p-2 border rounded-1 mb-2 bg-light d-flex align-items-center">
                        <input
                          className="form-check-input ms-1 me-3"
                          type="radio"
                          name="metodoPago"
                          id={`pago-${metodo.valor}`}
                          value={metodo.valor}
                          checked={formEnvio.metodoPago === metodo.valor}
                          onChange={(e) => setFormEnvio((prev) => ({ ...prev, metodoPago: e.target.value }))}
                        />
                        <label className="form-check-label marca-strong marca-fino flex-grow-1" htmlFor={`pago-${metodo.valor}`}>
                          {metodo.etiqueta}
                        </label>
                      </div>
                    ))}
                  </fieldset>

                  <div className="p-3 bg-platino border rounded-1 mb-4">{resumenCostos}</div>

                  <div className="d-flex justify-content-between">
                    <button type="button" className="btn btn-outline-secondary btn-sm rounded-1" onClick={() => setPasoActual('carrito')}>
                      ← Volver al Carrito
                    </button>
                    <button type="submit" className="btn btn-ambar btn-sm marca-strong rounded-1 px-4 py-2 shadow-sm" disabled={enviando || hayBloqueo}>
                      {enviando ? 'Confirmando…' : 'Confirmar compra'}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 3: COMPRA EXITOSA Y BOLETA (datos del servidor)           */}
        {/* ============================================================== */}
        {paso === 'exito' && ordenCreada && (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-7">
              <Boleta orden={ordenCreada} cliente={sesion} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Carrito;
