import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './authContexto';
import * as apiAuth from '../api/auth';
import { configurarCliente } from '../api/client';
import { ApiError } from '../api/errores';
import { borrarSesion, guardarSesion, leerSesion, suscribirCambios } from '../api/sesionAlmacen';
import { mostrarToast } from '../components/ToastNotificacion';

/** GET /auth/me con los tokens guardados. Nunca lanza: devuelve {usuario} o {error}. */
async function consultarUsuario() {
  try {
    return { usuario: await apiAuth.obtenerMe() };
  } catch (error) {
    return { error };
  }
}

/**
 * Sesión de la aplicación.
 *  - Los tokens viven en localStorage (api/sesionAlmacen); el usuario, solo en memoria.
 *  - Al abrir la página, si hay tokens se consulta GET /auth/me. Un 401 dispara UNA renovación (api/client). Si el
 *    servidor rechaza la renovación, la sesión se cierra; si no se puede ni consultar (red caída), la sesión se conserva.
 *  - Si en cualquier momento la sesión deja de ser renovable, el cliente HTTP avisa y aquí queda "sin sesión":
 *    las rutas protegidas (RutaProtegida) mandan a /login por sí solas.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => Boolean(leerSesion())); // sin tokens no hay nada que verificar
  const [errorArranque, setErrorArranque] = useState(null);
  const usuarioRef = useRef(null);
  const montado = useRef(false);

  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  // Aplica el resultado de consultarUsuario(). Red caída o 5xx: se conservan los tokens y se informa en `errorArranque`.
  // (Un 401 sin renovación posible ya dejó la sesión limpia: lo hace el cliente HTTP.)
  const aplicarResultado = useCallback(({ usuario: me, error }) => {
    if (!montado.current) return;
    if (me) {
      setUsuario(me);
      setErrorArranque(null);
    } else if (error instanceof ApiError && error.esTransitorio) {
      setErrorArranque(error);
    }
    setCargando(false);
  }, []);

  // Arranque: restaurar la sesión guardada.
  useEffect(() => {
    let activo = true;

    // El cliente HTTP solo llama a esto cuando había tokens y el servidor rechazó renovarlos.
    configurarCliente({
      alSesionInvalida: () => {
        if (!activo) return;
        setUsuario(null);
        mostrarToast({
          titulo: 'Tu sesión expiró',
          mensaje: 'Inicia sesión nuevamente para continuar.',
          tipo: 'warning'
        });
      }
    });

    montado.current = true;
    if (leerSesion()) consultarUsuario().then(aplicarResultado); // sin tokens no hay nada que verificar (y `cargando` ya arrancó en false)

    return () => {
      activo = false;
      montado.current = false;
      configurarCliente({});
    };
  }, [aplicarResultado]);

  // Cierre o inicio de sesión en OTRA pestaña.
  useEffect(
    () =>
      suscribirCambios(() => {
        if (!leerSesion()) {
          setUsuario(null);
        } else if (!usuarioRef.current) {
          apiAuth.obtenerMe().then(setUsuario).catch(() => {});
        }
      }),
    []
  );

  const iniciar = useCallback((tokens) => {
    guardarSesion({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    setErrorArranque(null);
    setUsuario(tokens.usuario);
    return tokens.usuario;
  }, []);

  const login = useCallback(async (credenciales) => iniciar(await apiAuth.login(credenciales)), [iniciar]);
  const registrar = useCallback(async (datos) => iniciar(await apiAuth.registrar(datos)), [iniciar]);

  /** Vuelve a verificar la sesión guardada (botón "Reintentar" cuando al abrir la página no hubo conexión). */
  const reintentarSesion = useCallback(() => {
    setErrorArranque(null);
    setCargando(true);
    return consultarUsuario().then(aplicarResultado);
  }, [aplicarResultado]);

  const logout = useCallback(() => {
    borrarSesion();
    setUsuario(null);
  }, []);

  const actualizarUsuario = useCallback((cambios) => {
    setUsuario((previo) => (previo ? { ...previo, ...cambios } : previo));
  }, []);

  const valor = useMemo(() => {
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
      login,
      registrar,
      logout,
      actualizarUsuario,
      reintentarSesion
    };
  }, [usuario, cargando, errorArranque, login, registrar, logout, actualizarUsuario, reintentarSesion]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
