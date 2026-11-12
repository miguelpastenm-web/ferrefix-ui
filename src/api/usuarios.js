import { api } from './client';

/**
 * PUT /users/me: el usuario autenticado reemplaza SU perfil. Un opcional omitido o en blanco se borra en el servidor.
 * RUT, email, contraseña y roles no se pueden cambiar por aquí. Responde con el Usuario actualizado (igual que /auth/me).
 */
export const actualizarPerfil = ({ nombre, telefono, direccion, region, comuna }) =>
  api('/api/v1/users/me', { metodo: 'PUT', cuerpo: { nombre, telefono, direccion, region, comuna } });
