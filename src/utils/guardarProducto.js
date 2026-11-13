// Guardado de productos desde el panel de administración.
//
// Dos riesgos del backend que se cubren aquí (PUT /productos/{id} reemplaza TODO y no hay control de concurrencia):
//  1. Al editar se vuelve a leer el producto justo antes del PUT y de ahí se toman las especificaciones y la imagen de
//     oferta: así no se pierden, ni se pisan cambios hechos por otra persona.
//  2. Si el administrador NO cambió el stock, se envía el stock vigente (releído), no el que tenía la pantalla al abrirse:
//     una compra hecha mientras tanto no se revierte.
import { crearProducto, actualizarProducto, obtenerProducto } from '../api/productos';
import { subirImagen } from '../api/imagenes';
import { aRequestDto, formularioDesdeProducto } from './productoForm';

/**
 * @param {{modo:'crear'|'editar', form:object, original?:object, archivoImagen?:File, archivoOferta?:File}} datos
 *   `original` (solo al editar): el producto tal como se cargó en el formulario.
 * @returns {Promise<object>} el producto guardado (forma de api/productos)
 */
export async function guardarProductoDesdeForm({ modo, form, original, archivoImagen, archivoOferta }) {
  let imagenUrl = form.imagenUrl;
  let imagenOfertaUrl = form.imagenOfertaUrl;
  if (archivoImagen) imagenUrl = (await subirImagen(archivoImagen, 'productos')).url;
  if (archivoOferta) imagenOfertaUrl = (await subirImagen(archivoOferta, 'ofertas')).url;

  if (modo === 'crear') {
    return crearProducto(aRequestDto({ ...form, imagenUrl, imagenOfertaUrl }));
  }

  const fresco = formularioDesdeProducto(await obtenerProducto(original.id));
  const antes = formularioDesdeProducto(original);
  const stockCambiado = String(form.stock).trim() !== antes.stock;
  const imagenCambiada = archivoImagen || form.imagenUrl !== antes.imagenUrl;
  const ofertaCambiada = archivoOferta || form.imagenOfertaUrl !== antes.imagenOfertaUrl;

  return actualizarProducto(
    original.id,
    aRequestDto({
      ...form,
      sku: fresco.sku, // el SKU no se edita
      stock: stockCambiado ? form.stock : fresco.stock,
      imagenUrl: imagenCambiada ? imagenUrl : fresco.imagenUrl,
      imagenOfertaUrl: ofertaCambiada ? imagenOfertaUrl : fresco.imagenOfertaUrl,
      especificaciones: fresco.especificaciones // el formulario no las edita: se reenvían las vigentes
    })
  );
}

/** Cambia solo el stock (no hay PATCH): relee el producto y lo reenvía completo con el stock nuevo. */
export async function actualizarStockProducto(id, nuevoStock) {
  const fresco = formularioDesdeProducto(await obtenerProducto(id));
  return actualizarProducto(id, aRequestDto({ ...fresco, stock: nuevoStock }));
}
