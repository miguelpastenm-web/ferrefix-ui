import ProductCard from './ProductCard';

function ProductGrid({ productos = [], onResetFilters }) {
  if (!productos || productos.length === 0) {
    return (
      <div className="product-grid-empty marca-centro py-5 px-3 bg-platino rounded-4 my-4">
        <i className="bi bi-search product-grid-empty-icon mb-3 d-block"></i>
        <h4 className="marca-titulo marca-tam-4 mb-2">No se encontraron productos</h4>
        <p className="product-grid-empty-desc marca-muted mb-4 mx-auto">
          No encontramos ningún artículo que coincida con tus criterios de búsqueda o filtros seleccionados.
        </p>
        {onResetFilters && (
          <button 
            type="button" 
            onClick={onResetFilters} 
            className="btn btn-ambar marca-strong px-4 py-2 rounded-3 shadow-sm"
          >
            <i className="bi cart-plus-fill me-2"></i>
            Restablecer filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="row g-2 row-cols-2 row-cols-md-3 row-cols-lg-4 product-grid-container">
      {productos.map((producto) => (
        <div key={producto.id} className="col d-flex">
          <ProductCard producto={producto} />
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;
