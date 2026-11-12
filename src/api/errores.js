// Errores de la API. El backend responde SIEMPRE con este JSON:
//   { timestamp, status, error, message, path, details? }
// donde "details" (solo en 400 de validación) es una lista de textos "campo: mensaje".

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
export const MENSAJE_TIEMPO_AGOTADO = 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';

const MENSAJE_POR_ESTADO = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No se encontró lo que buscabas.',
  409: 'La operación no se pudo completar porque entra en conflicto con el estado actual.',
  413: 'El archivo es demasiado grande.',
  415: 'Formato de contenido no soportado.'
};

export const mensajePorEstado = (status) =>
  MENSAJE_POR_ESTADO[status] ?? (status >= 500 ? 'Error del servidor. Inténtalo nuevamente en unos minutos.' : 'No se pudo completar la solicitud.');

export class ApiError extends Error {
  /**
   * @param {{status:number, mensaje?:string, detalles?:string[], ruta?:string, tiempoAgotado?:boolean}} datos
   *        status 0 = no hubo respuesta (red caída o tiempo agotado).
   */
  constructor({ status, mensaje, detalles = [], ruta = '', tiempoAgotado = false }) {
    super(mensaje || mensajePorEstado(status));
    this.name = 'ApiError';
    this.status = status;
    this.mensaje = this.message;
    this.detalles = Array.isArray(detalles) ? detalles : [];
    this.ruta = ruta;
    this.tiempoAgotado = tiempoAgotado;
  }

  /** No hubo respuesta del servidor (red caída o tiempo agotado). */
  get esDeRed() {
    return this.status === 0;
  }

  /** El servidor falló o no se pudo alcanzar: conviene mostrar "reintentar" y no culpar al usuario. */
  get esTransitorio() {
    return this.status === 0 || this.status >= 500;
  }
}

/**
 * Convierte los "details" del backend en errores por campo:
 *   ["email: El correo debe tener un formato válido", "password: ..."]  ->  { email: "...", password: "..." }
 * Si un campo trae varios mensajes se conserva el primero. Un detalle sin "campo: " se ignora (queda en el mensaje general).
 */
export const erroresPorCampo = (error) => {
  const resultado = {};
  const detalles = error instanceof ApiError ? error.detalles : Array.isArray(error?.detalles) ? error.detalles : [];
  detalles.forEach((detalle) => {
    const texto = String(detalle ?? '');
    const corte = texto.indexOf(': ');
    if (corte <= 0) return;
    const campo = texto.slice(0, corte).trim();
    const mensaje = texto.slice(corte + 2).trim();
    if (campo && mensaje && !(campo in resultado)) resultado[campo] = mensaje;
  });
  return resultado;
};

/** Mensaje listo para mostrar al usuario, venga de donde venga el error. */
export const mensajeDeError = (error, porDefecto = 'Ocurrió un error inesperado. Inténtalo nuevamente.') =>
  error instanceof ApiError ? error.mensaje : porDefecto;
