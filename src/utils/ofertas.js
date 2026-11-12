/**
 * Ofertas destacadas de una categoría: los productos que traen imagen de oferta (imagenOfertaUrl en el backend),
 * en orden estable por SKU. Sin productos o sin ofertas devuelve [] (y la sección no se muestra).
 */
export function ofertasDeCategoria(productos, categoria) {
  if (!Array.isArray(productos)) return [];
  return productos
    .filter((p) => p.categoria === categoria && p.imagenOferta)
    .sort((a, b) => String(a.sku).localeCompare(String(b.sku)))
    .map((p) => ({ img: p.imagenOferta, link: `/producto/${p.id}`, alt: p.nombre }));
}
