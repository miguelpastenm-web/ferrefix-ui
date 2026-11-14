// Máquinas para arriendo y sus unidades.
//   GET    /api/v1/maquinas                          (público) -> MaquinaResponseDto[]
//   GET    /api/v1/maquinas/{id}                     (público) -> MaquinaResponseDto
//   POST   /api/v1/maquinas                          (ADMIN)   -> 201 MaquinaResponseDto
//   PUT    /api/v1/maquinas/{id}                     (ADMIN)   -> 200 MaquinaResponseDto
//   DELETE /api/v1/maquinas/{id}                     (ADMIN)   -> 204
//   GET    /api/v1/maquinas/{id}/unidades            (ADMIN)   -> UnidadResponseDto[]
//   POST   /api/v1/maquinas/{id}/unidades            (ADMIN)   -> 201 UnidadResponseDto[]
//   DELETE /api/v1/maquinas/{id}/unidades/{unidadId} (ADMIN)   -> 204
import { api } from './client';
import { urlMedia } from './media';

const RUTA = '/api/v1/maquinas';
const CATEGORIA_TODAS = 'Todas';

export function adaptarMaquina(dto) {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    marca: dto.marca,
    categoria: dto.categoria,
    tarifaDia: dto.tarifaDia,
    estado: dto.estado,
    incluye: dto.incluye ?? '',
    imagen: urlMedia(dto.imagenUrl),
    imagenUrl: dto.imagenUrl ?? null,
    especificaciones: dto.especificaciones ?? {},
    unidadesTotales: dto.unidadesTotales ?? 0,
    unidadesDisponibles: dto.unidadesDisponibles ?? 0,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

const textoUtil = (valor) => (typeof valor === 'string' ? valor.trim() : '');

export function armarQueryMaquinas({ q, categoria, soloDisponibles, sort } = {}) {
  const params = new URLSearchParams();
  if (textoUtil(q)) params.set('q', textoUtil(q));
  const cat = textoUtil(categoria);
  if (cat && cat.toLowerCase() !== CATEGORIA_TODAS.toLowerCase()) params.set('categoria', cat);
  if (soloDisponibles === true) params.set('soloDisponibles', 'true');
  if (textoUtil(sort)) params.set('sort', textoUtil(sort));
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listarMaquinas(filtros = {}) {
  const lista = await api(`${RUTA}${armarQueryMaquinas(filtros)}`, { auth: false });
  return (Array.isArray(lista) ? lista : []).map(adaptarMaquina);
}

export async function obtenerMaquina(id) {
  return adaptarMaquina(await api(`${RUTA}/${encodeURIComponent(id)}`, { auth: false }));
}

export async function crearMaquina(dto) {
  return adaptarMaquina(await api(RUTA, { metodo: 'POST', cuerpo: dto }));
}

export async function actualizarMaquina(id, dto) {
  return adaptarMaquina(await api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: dto }));
}

export async function eliminarMaquina(id) {
  await api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}

export async function listarUnidadesMaquina(id) {
  const lista = await api(`${RUTA}/${encodeURIComponent(id)}/unidades`);
  return Array.isArray(lista) ? lista : [];
}

export async function agregarUnidadesMaquina(id, cantidad) {
  const lista = await api(`${RUTA}/${encodeURIComponent(id)}/unidades`, {
    metodo: 'POST',
    cuerpo: { cantidad: Number(cantidad) }
  });
  return Array.isArray(lista) ? lista : [];
}

export async function eliminarUnidadMaquina(id, unidadId) {
  await api(`${RUTA}/${encodeURIComponent(id)}/unidades/${encodeURIComponent(unidadId)}`, {
    metodo: 'DELETE'
  });
}

