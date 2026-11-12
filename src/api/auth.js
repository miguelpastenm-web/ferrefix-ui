// Endpoints de autenticación. Respuestas reales del backend (leídas de sus DTO):
//   POST /auth/login     {email, password}                         -> 200 TokenResponse
//   POST /auth/register  {rut, nombre, email, password(8-72), telefono?, direccion?, region?, comuna?} -> 201 TokenResponse
//   POST /auth/refresh   {refreshToken}                            -> 200 TokenResponse
//   GET  /auth/me                                                  -> 200 Usuario
//   TokenResponse = { accessToken, refreshToken, tokenType:"Bearer", expiresIn:<segundos>, usuario: Usuario }
//   Usuario = { id, rut, nombre, email, telefono, direccion, region, comuna, activo, roles:["ADMIN"|"CLIENTE"], createdAt }
import { api } from './client';

export const login = ({ email, password }) =>
  api('/api/v1/auth/login', { metodo: 'POST', cuerpo: { email: String(email).trim(), password }, auth: false });

export const registrar = ({ rut, nombre, email, password, telefono, direccion, region, comuna }) =>
  api('/api/v1/auth/register', {
    metodo: 'POST',
    cuerpo: { rut, nombre: String(nombre).trim(), email: String(email).trim(), password, telefono, direccion, region, comuna },
    auth: false
  });

export const refrescar = (refreshToken) =>
  api('/api/v1/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken }, auth: false });

export const obtenerMe = () => api('/api/v1/auth/me');
