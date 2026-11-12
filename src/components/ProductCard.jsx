import { Link } from 'react-router-dom';

function ProductCard({ producto }) {
  if (!producto) return null;

  const { id, nombre, marca, precioVenta, imagen } = producto;
  const agotado = producto.estado === 'AGOTADO' || (typeof producto.stock === 'number' && producto.stock <= 0);

  // Formatear el precio a pesos chilenos (CLP)
  const precioFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(precioVenta);

  return (
    <div className="product-card">
      <Link to={`/producto/${id}`} className='product-card-link'>

        {/* Contenedor de la foto */}
        <div className="product-card-img-wrapper position-relative">
          {agotado && (
            <span className="badge bg-secondary position-absolute top-0 start-0 m-2">Agotado</span>
          )}
          <img 
            src={imagen || '/banner-web.webp'} 
            alt={nombre} 
            className="product-card-img"
            loading="lazy" 
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/banner-web.webp';
            }}
          />
        </div>

        {/* Contenido de la tarjeta */}
        <div className="product-card-body">
          {marca && <span className="product-card-brand">{marca}</span>}

          <h3 className="product-card-title" title={nombre}>
            {nombre}
          </h3>

          <div className="product-card-price">
            {precioFormateado}
          </div>
        </div>

      </Link>
    </div>
  );
}

export default ProductCard;
