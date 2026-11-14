// Cotizaciones por volumen del backend.
//   POST   /api/v1/cotizaciones      (público; asocia usuario si hay token válido) -> 201 CotizacionCreadaResponseDto
//   GET    /api/v1/cotizaciones      (ADMIN)                                        -> CotizacionResponseDto[]
//   GET    /api/v1/cotizaciones/{id} (ADMIN)                                        -> CotizacionResponseDto
//   PATCH  /api/v1/cotizaciones/{id} (ADMIN)                                        -> 200 CotizacionResponseDto
//   DELETE /api/v1/cotizaciones/{id} (ADMIN)                                        -> 204
import { api } from './client';
import { leerSesion } from './sesionAlmacen';

const RUTA = '/api/v1/cotizaciones';

export function crearCotizacion(datos) {
  const cuerpo = {
    nombre: String(datos.nombre ?? '').trim(),
    rut: String(datos.rut ?? '').trim(),
    email: String(datos.email ?? '').trim(),
    telefono: String(datos.telefono ?? '').trim(),
    tipoProyecto: String(datos.tipoProyecto ?? '').trim(),
    region: String(datos.region ?? '').trim(),
    detalle: String(datos.detalle ?? '').trim(),
    despachoObra: Boolean(datos.despachoObra)
  };
  const tieneSesion = Boolean(leerSesion()?.accessToken);
  return api(RUTA, { metodo: 'POST', cuerpo, auth: tieneSesion });
}

const textoUtil = (valor) => (typeof valor === 'string' ? valor.trim() : '');

export function armarQueryCotizaciones({ estado } = {}) {
  const params = new URLSearchParams();
  const est = textoUtil(estado);
  if (est && est.toLowerCase() !== 'todos' && est.toLowerCase() !== 'todas') {
    params.set('estado', est);
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listarCotizaciones(filtros = {}) {
  const lista = await api(`${RUTA}${armarQueryCotizaciones(filtros)}`);
  return Array.isArray(lista) ? lista : [];
}

export const obtenerCotizacion = (id) => api(`${RUTA}/${encodeURIComponent(id)}`);

export function actualizarCotizacion(id, datos = {}) {
  const cuerpo = {};
  if (datos.estado !== undefined) cuerpo.estado = datos.estado;
  if (datos.notaAdmin !== undefined) cuerpo.notaAdmin = datos.notaAdmin;
  return api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo });
}

export async function eliminarCotizacion(id) {
  await api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}

