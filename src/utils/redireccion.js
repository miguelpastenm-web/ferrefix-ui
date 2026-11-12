// Redirecciones seguras después de iniciar sesión.

const ORIGEN_FALSO = 'http://interno.invalid';
const RUTAS_QUE_NO_SON_DESTINO = ['/login', '/registro'];

/**
 * Valida el parámetro "next" para evitar redirecciones abiertas (open redirect).
 * Solo acepta rutas INTERNAS de la aplicación: empiezan con una sola "/" y no llevan esquema, host, "//", "\" ni
 * caracteres de control. Cualquier otra cosa (o /login y /registro, para no hacer bucles) devuelve `porDefecto`.
 * @returns {string} ruta interna segura (con su query y hash)
 */
export function rutaInternaSegura(valor, porDefecto = '/') {
  if (typeof valor !== 'string') return porDefecto;
  const candidata = valor.trim();
  if (!candidata.startsWith('/') || candidata.startsWith('//') || candidata.startsWith('/\\')) return porDefecto;
  const tieneControl = [...candidata].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  if (tieneControl || candidata.includes('\\')) return porDefecto;
  let url;
  try {
    url = new URL(candidata, ORIGEN_FALSO);
  } catch {
    return porDefecto;
  }
  if (url.origin !== ORIGEN_FALSO) return porDefecto; // el analizador de URL la interpretó como otro sitio
  // El router no distingue mayúsculas ("/LOGIN" abre /login) ni %-codificación ("/%6Cogin"): se compara normalizado.
  let ruta = url.pathname;
  try {
    ruta = decodeURIComponent(ruta);
  } catch {
    return porDefecto; // %-secuencia mal formada
  }
  ruta = ruta.toLowerCase();
  if (RUTAS_QUE_NO_SON_DESTINO.some((r) => ruta === r || ruta.startsWith(`${r}/`))) return porDefecto;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Página a la que va cada rol al entrar: ADMIN al panel, CLIENTE al catálogo. */
export const rutaInicialPorRol = (roles = []) => (roles.includes('ADMIN') ? '/admin' : '/catalogo');
