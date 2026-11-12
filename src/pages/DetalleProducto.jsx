import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { obtenerProducto } from '../api/productos';
import { ApiError } from '../api/errores';
import { useCarga } from '../hooks/useCarga';
import { agregarAlCarrito } from '../data/carrito';
import { mostrarToast } from '../components/ToastNotificacion';
import { IndicadorCarga } from '../components/EsperarSesion';
import ErrorCarga from '../components/ErrorCarga';

function DetalleProducto() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cantidad, setCantidad] = useState(1);
  const [botonAnimado, setBotonAnimado] = useState(false);

  // El detalle se pide por id numérico. Un id que no es un número no existe en el backend (daría 400): ni se consulta.
  const idValido = /^\d+$/.test(id ?? '');
  const { datos: producto, cargando, error, recargar } = useCarga(
    () => (idValido ? obtenerProducto(id) : Promise.resolve(null)),
    id
  );
  const noEncontrado = !cargando && (!idValido || (error instanceof ApiError && error.status === 404));

  // Scroll automático hacia arriba al cargar la página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (cargando) {
    return (
      <div className="container py-5">
        <IndicadorCarga etiqueta="Cargando producto…" />
      </div>
    );
  }

  if (error && !noEncontrado) {
    return (
      <div className="container py-5">
        <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar el producto" />
      </div>
    );
  }

  // Si no se encuentra el producto
  if (noEncontrado || !producto) {
    return (
      <div className="container py-5 marca-centro my-5">
        <div className="detalle-no-encontrado-card bg-platino p-5 rounded-4 shadow-sm mx-auto">
          <i className="bi bi-exclamation-triangle detalle-error-icon mb-3 d-block"></i>
          <h2 className="marca-titulo marca-tam-4 mb-3">Producto no encontrado</h2>
          <p className="marca-parrafo mb-4">
            El producto con código <strong>#{id}</strong> no existe o no se encuentra disponible actualmente en nuestro catálogo.
          </p>
          <Link to="/catalogo" className="btn btn-ambar marca-strong px-4 py-2 rounded-3 shadow-sm">
            <i className="bi bi-arrow-left me-2"></i>
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  const agotado = producto.estado === 'AGOTADO' || producto.stock <= 0;

  // Formatear precio a CLP
  const precioFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(producto.precioVenta);

  // Manejo del selector de cantidad
  const handleRestar = () => {
    if (cantidad > 1) setCantidad((prev) => prev - 1);
  };

  const handleSumar = () => {
    if (cantidad < producto.stock) setCantidad((prev) => prev + 1);
  };

  const handleAgregarCarrito = () => {
    const res = agregarAlCarrito(producto, cantidad);
    if (!res.ok) {
      mostrarToast({
        titulo: "Stock Insuficiente",
        mensaje: res.error,
        tipo: "danger"
      });
    } else {
      setBotonAnimado(true);
      setTimeout(() => setBotonAnimado(false), 1800);

      mostrarToast({
        titulo: "¡Añadido al Carrito!",
        mensaje: `${producto.nombre} (${cantidad} ${cantidad === 1 ? "unidad" : "unidades"})`,
        tipo: "success",
        imagen: producto.imagen,
        link: "/carrito",
        linkTexto: "Ver Carrito"
      });
    }
  };



  return (
    <div className="detalle-producto-page py-4 py-lg-5 bg-white">
      <div className="container">

        {/* Migas de pan y botón volver */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb detalle-breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/">Inicio</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/catalogo">Catálogo</Link>
              </li>
              <li className="breadcrumb-item">
                <Link 
                  to={`/catalogo?categoria=${encodeURIComponent(producto.categoria)}`} 
                >
                  {producto.categoria}
                </Link>
              </li>
              <li className="breadcrumb-item detalle-breadcrumb-item active" aria-current="page">
                {producto.nombre}
              </li>
            </ol>
          </nav>

          <button 
            type="button" 
            onClick={() => navigate('/catalogo')} 
            className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-none"
          >
            <i className="bi bi-arrow-left"></i>
            Volver al catálogo
          </button>
        </div>

        {/* Sección Principal del Producto */}
        <div className="row g-4 g-lg-5 mb-5 align-items-start">

          {/* Columna Izquierda: Imagen destacada */}
          <div className="col-12 col-lg-6">
            <div className="detalle-img-card rounded-4 p-3 p-md-4 border bg-platino shadow-sm position-relative overflow-hidden">
              <img
                src={producto.imagen}
                alt={producto.nombre}
                className="img-fluid w-100 object-fit-contain rounded-3 detalle-producto-foto"
              />
            </div>

            {/* Garantías y Confianza */}
            <div className="row g-2 mt-3 marca-centro marca-nota">
              <div className="col-4">
                <div className="p-2 border rounded-3 bg-light">
                  <i className="bi bi-truck detalle-garantia-icon d-block mb-1"></i>
                  <span>Envío a todo Chile</span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 border rounded-3 bg-light">
                  <i className="bi bi-shield-check detalle-garantia-icon d-block mb-1"></i>
                  <span>Garantía Oficial</span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 border rounded-3 bg-light">
                  <i className="bi bi-shop detalle-garantia-icon d-block mb-1"></i>
                  <span>Retiro en Tienda</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Información, Precio y Compra */}
          <div className="col-12 col-lg-6">
            <div className="detalle-info-panel">
              
              {/* Marca */}
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="marca-chip marca-chip--ambar">
                  {producto.marca}
                </span>
                <span className="marca-nota">Código Ref: #{producto.sku}</span>
                {agotado && <span className="badge bg-secondary">Agotado</span>}
              </div>

              {/* Título */}
              <h1 className="detalle-producto-titulo mb-3">
                {producto.nombre}
              </h1>

              {/* Calificación estética */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="detalle-estrellas">
                  <i className="bi bi-star-fill"></i>
                  <i className="bi bi-star-fill ms-1"></i>
                  <i className="bi bi-star-fill ms-1"></i>
                  <i className="bi bi-star-fill ms-1"></i>
                  <i className="bi bi-star-fill ms-1"></i>
                </div>
                <span className="detalle-valoracion">
                  5.0 (Valoraciones de clientes)
                </span>
              </div>

              {/* Precio */}
              <div className="detalle-precio-box p-3 bg-light rounded-4 mb-4 border border-light-subtle">
                <div className="marca-nota mb-1">Precio con IVA incluido:</div>
                <div className="detalle-precio-valor">
                  {precioFormateado}
                </div>
              </div>

              {/* Breve extracto */}
              <p className="marca-parrafo mb-4">
                {producto.descripcion}
              </p>

              {/* Controles de Compra */}
              <div className="mb-4">
                <label className="form-label marca-etiqueta mb-2">
                  Cantidad:
                </label>
                <div className="d-flex align-items-center gap-3">
                  <div className="input-group detalle-cantidad-group">
                    <button 
                      className="btn btn-outline-secondary px-3" 
                      type="button"
                      onClick={handleRestar}
                      disabled={agotado || cantidad <= 1}
                      aria-label="Restar una unidad"
                    >
                      <i className="bi bi-dash"></i>
                    </button>
                    <input 
                      type="text" 
                      className="form-control marca-centro marca-bold bg-white" 
                      value={cantidad} 
                      readOnly 
                    />
                    <button 
                      className="btn btn-outline-secondary px-3" 
                      type="button"
                      onClick={handleSumar}
                      disabled={agotado || cantidad >= producto.stock}
                      aria-label="Sumar una unidad"
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                  <span className="marca-nota">
                    {agotado ? 'Sin stock disponible' : `Máximo: ${producto.stock} unidades`}
                  </span>
                </div>
              </div>

              {/* Botón de Acción */}
              <div className="d-grid gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleAgregarCarrito}
                  disabled={agotado}
                  className={`btn btn-lg py-3 rounded-2 shadow-sm d-flex align-items-center justify-content-center gap-2 transition-all ${
                    botonAnimado ? "btn-success text-white" : "btn-ambar"
                  }`}
                  style={{ transition: "all 0.25s ease" }}
                >
                  <i className={`bi ${botonAnimado ? "bi-check2-circle" : "bi-cart-plus-fill"} marca-icono`}></i>
                  {agotado
                    ? "Agotado Temporalmente" 
                    : botonAnimado 
                    ? "¡Añadido con éxito! ✓" 
                    : "Agregar al Carrito"}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Especificaciones y Ficha Técnica Completa */}
        <div className="detalle-ficha-seccion border-top pt-5">
          <div className="row g-4">
            
            <div className="col-12 col-lg-6">
              <h3 className="mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-info-circle marca-icono-ambar"></i>
                Descripción Detallada
              </h3>
              <p className="marca-parrafo mb-4">
                {producto.descripcion}
              </p>
              <div className="p-3 bg-light rounded-3 border">
                <h6 className="marca-titulo marca-tam-6 mb-2">
                  <i className="bi bi-geo-alt-fill marca-icono-rojo me-1"></i>
                  ¿Prefieres comprar presencialmente?
                </h6>
                <p className="marca-nota mb-0">
                  Encuentra este producto en nuestro local ubicado en <strong>Antonio Varas 666, Providencia</strong>. Consulta disponibilidad y atención personalizada con nuestros expertos ferreteros.
                </p>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <h3 className="mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-tools marca-icono-ambar"></i>
                Ficha Técnica
              </h3>
              
              {producto.especificaciones ? (
                <div className="table-responsive rounded-3 border overflow-hidden">
                  <table className="table table-striped table-hover mb-0 align-middle">
                    <tbody>
                      {Object.entries(producto.especificaciones).map(([clave, valor]) => (
                        <tr key={clave}>
                          <th scope="row" className="bg-platino marca-strong py-3 ps-3 w-40 marca-fino">
                            {clave}
                          </th>
                          <td className="py-3 ps-3 marca-parrafo marca-fino">
                            {valor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="marca-muted">No hay especificaciones adicionales registradas.</p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default DetalleProducto;
