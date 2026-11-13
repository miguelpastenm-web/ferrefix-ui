// Clasifica los errores de las acciones del panel de administración con el mismo criterio que el checkout:
//  - 400 de validación -> mensaje junto a cada campo
//  - 404               -> "ya no existe" (hay que refrescar la lista)
//  - 409               -> conflicto (SKU repetido, transición no permitida...) o recurso ocupado (con "Reintentar" manual)
//  - sin respuesta / 5xx -> NO se sabe si la operación se aplicó: se avisa, se refresca la lista y NO se reintenta sola
//  - 401               -> sesión vencida (la ruta protegida manda a /login)
import { ApiError, erroresPorCampo } from '../api/errores';
import { esConflictoDeBloqueo } from './errorOrden';

export const MENSAJE_OPERACION_SIN_CONFIRMAR = 'No pudimos confirmar la operación; revisa la lista antes de volver a intentar';
export const MENSAJE_SESION_VENCIDA = 'Tu sesión expiró; inicia sesión para continuar';

/**
 * @returns {{tipo:'validacion'|'no-existe'|'conflicto'|'ocupado'|'sin-confirmar'|'sesion'|'permiso'|'otro',
 *            mensaje:string, campos:Record<string,string>, detalles:string[]}}
 */
export function clasificarErrorAdmin(error) {
  if (!(error instanceof ApiError)) {
    return { tipo: 'otro', mensaje: 'Ocurrió un error inesperado. Revisa la lista antes de volver a intentar.', campos: {}, detalles: [] };
  }
  const campos = erroresPorCampo(error);
  const base = { mensaje: error.mensaje, campos, detalles: error.detalles };

  if (error.status === 401) return { ...base, tipo: 'sesion', mensaje: MENSAJE_SESION_VENCIDA };
  if (error.status === 403) return { ...base, tipo: 'permiso', mensaje: 'No tienes permisos para realizar esta acción.' };
  if (error.esTransitorio) return { ...base, tipo: 'sin-confirmar', mensaje: MENSAJE_OPERACION_SIN_CONFIRMAR };
  if (esConflictoDeBloqueo(error)) return { ...base, tipo: 'ocupado' };
  if (error.status === 404) return { ...base, tipo: 'no-existe' };
  if (error.status === 409) {
    if (/\bSKU\b/i.test(error.mensaje) && !campos.sku) campos.sku = error.mensaje;
    return { ...base, tipo: 'conflicto' };
  }
  // 400 sin "details": categoría inválida y errores de especificaciones llegan solo en el mensaje.
  if (error.status === 400 && /categor/i.test(error.mensaje) && !campos.categoria) campos.categoria = error.mensaje;
  if (error.status === 400 || error.status === 413) return { ...base, tipo: 'validacion' };
  return { ...base, tipo: 'otro' };
}
