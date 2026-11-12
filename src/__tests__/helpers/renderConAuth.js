// Utilidades de test para componentes que usan useAuth(). (No es un test.)
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../../context/authContexto.js';

/** Valor de contexto completo, con acciones espía. `usuario` null = anónimo. */
export function valorDeAuth({ usuario = null, cargando = false, errorArranque = null, ...acciones } = {}) {
  const roles = usuario?.roles ?? [];
  return {
    usuario,
    roles,
    esAdmin: roles.includes('ADMIN'),
    esCliente: roles.includes('CLIENTE'),
    autenticado: Boolean(usuario),
    tieneRol: (...pedidos) => pedidos.some((rol) => roles.includes(rol)),
    cargando,
    errorArranque,
    login: vi.fn(),
    registrar: vi.fn(),
    logout: vi.fn(),
    actualizarUsuario: vi.fn(),
    reintentarSesion: vi.fn(),
    ...acciones
  };
}

/** Renderiza `ui` dentro de un router en memoria y de un AuthContext inyectado (sin llamar a la API). */
export function renderConAuth(ui, { usuario = null, cargando = false, errorArranque = null, rutaInicial = '/', ...acciones } = {}) {
  const valor = valorDeAuth({ usuario, cargando, errorArranque, ...acciones });
  const resultado = render(
    createElement(
      MemoryRouter,
      { initialEntries: [rutaInicial] },
      createElement(AuthContext.Provider, { value: valor }, ui)
    )
  );
  return { valor, ...resultado };
}

/** Muestra en pantalla la ubicación actual del router, para comprobar redirecciones. */
export function Ubicacion({ nombre = '' }) {
  const ubicacion = useLocation();
  return createElement(
    'p',
    { 'data-testid': 'ubicacion' },
    `${nombre}${nombre ? ' ' : ''}${ubicacion.pathname}${ubicacion.search}`
  );
}
