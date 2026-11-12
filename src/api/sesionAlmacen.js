// Persistencia de los tokens de sesión (para que sobrevivan a recargas de la página).
// Solo se guardan los tokens; los datos del usuario se piden a GET /auth/me al arrancar.

export const CLAVE_SESION = 'ferrefix_auth_v2';

// Respaldo en memoria por si localStorage no se puede usar (modo privado, cuota llena, etc.).
let respaldo = null;
// true cuando la última escritura en localStorage falló: entonces el respaldo en memoria es la fuente de verdad.
let escrituraFallida = false;

const esTokenValido = (valor) => typeof valor === 'string' && valor.length > 0;

/** @returns {{accessToken:string, refreshToken:string} | null} */
export function leerSesion() {
  let bruto;
  try {
    bruto = window.localStorage.getItem(CLAVE_SESION);
  } catch {
    return respaldo;
  }
  if (bruto === null) return escrituraFallida ? respaldo : null;
  try {
    const datos = JSON.parse(bruto);
    return esTokenValido(datos?.accessToken) && esTokenValido(datos?.refreshToken)
      ? { accessToken: datos.accessToken, refreshToken: datos.refreshToken }
      : null;
  } catch {
    return null;
  }
}

export function guardarSesion({ accessToken, refreshToken }) {
  respaldo = { accessToken, refreshToken };
  try {
    window.localStorage.setItem(CLAVE_SESION, JSON.stringify(respaldo));
    escrituraFallida = false;
  } catch {
    escrituraFallida = true; // la sesión funciona en esta pestaña, pero no sobrevivirá a una recarga
  }
}

export function borrarSesion() {
  respaldo = null;
  escrituraFallida = false;
  try {
    window.localStorage.removeItem(CLAVE_SESION);
  } catch {
    // nada que hacer
  }
}

/**
 * Avisa cuando OTRA pestaña cambia o borra la sesión (el evento "storage" no se dispara en la pestaña que escribe).
 * @returns {() => void} función para cancelar la suscripción
 */
export function suscribirCambios(callback) {
  const manejador = (evento) => {
    if (evento.key === null || evento.key === CLAVE_SESION) callback();
  };
  window.addEventListener('storage', manejador);
  return () => window.removeEventListener('storage', manejador);
}
