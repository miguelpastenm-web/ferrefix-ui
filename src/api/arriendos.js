// Arriendos de maquinaria del backend.
//   POST   /api/v1/arriendos               (CLIENTE) -> 201 ArriendoResponseDto
//   GET    /api/v1/arriendos/mis-arriendos (CLIENTE) -> ArriendoResponseDto[]
//   GET    /api/v1/arriendos/{id}                    -> ArriendoResponseDto
//   GET    /api/v1/arriendos               (ADMIN)   -> ArriendoResponseDto[]
//   PUT    /api/v1/arriendos/{id}          (ADMIN)   -> 200 ArriendoResponseDto
//   PATCH  /api/v1/arriendos/{id}/devolver (ADMIN)   -> 200 ArriendoResponseDto
//   DELETE /api/v1/arriendos/{id}          (ADMIN)   -> 204
import { api } from './client';

const RUTA = '/api/v1/arriendos';

export function crearArriendo(datos) {
  const cuerpo = {
    maquinaId: Number(datos.maquinaId),
    diasArriendo: Number(datos.diasArriendo),
    fechaInicio: String(datos.fechaInicio ?? '').trim(),
    telefono: String(datos.telefono ?? '').trim(),
    direccionFaena: String(datos.direccionFaena ?? '').trim(),
    region: String(datos.region ?? '').trim(),
    comuna: String(datos.comuna ?? '').trim()
  };
  return api(RUTA, { metodo: 'POST', cuerpo });
}

export async function misArriendos() {
  const lista = await api(`${RUTA}/mis-arriendos`);
  return Array.isArray(lista) ? lista : [];
}

export const obtenerArriendo = (id) => api(`${RUTA}/${encodeURIComponent(id)}`);

const textoUtil = (valor) => (typeof valor === 'string' ? valor.trim() : '');

export function armarQueryArriendos({ estado, usuarioId, maquinaId } = {}) {
  const params = new URLSearchParams();
  const est = textoUtil(estado);
  if (est && est.toLowerCase() !== 'todos' && est.toLowerCase() !== 'todas') {
    params.set('estado', est);
  }
  if (usuarioId !== undefined && usuarioId !== null && String(usuarioId).trim() !== '') {
    params.set('usuarioId', String(usuarioId).trim());
  }
  if (maquinaId !== undefined && maquinaId !== null && String(maquinaId).trim() !== '') {
    params.set('maquinaId', String(maquinaId).trim());
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listarArriendos(filtros = {}) {
  const lista = await api(`${RUTA}${armarQueryArriendos(filtros)}`);
  return Array.isArray(lista) ? lista : [];
}

export function actualizarArriendo(id, datos) {
  const cuerpo = {
    telefono: String(datos.telefono ?? '').trim(),
    direccionFaena: String(datos.direccionFaena ?? '').trim(),
    region: String(datos.region ?? '').trim(),
    comuna: String(datos.comuna ?? '').trim()
  };
  return api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo });
}

export function devolverArriendo(id) {
  return api(`${RUTA}/${encodeURIComponent(id)}/devolver`, { metodo: 'PATCH' });
}

export async function eliminarArriendo(id) {
  await api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}

