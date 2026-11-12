import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContexto';
import { IndicadorCarga, ErrorSesion } from './EsperarSesion';
import { mostrarToast } from './ToastNotificacion';
import { rutaInicialPorRol } from '../utils/redireccion';

/**
 * Restringe una ruta del front por sesión y por rol (la seguridad real la aplica el backend; esto evita mostrar
 * pantallas que de todos modos darían 401/403).
 *
 *   <RutaProtegida roles={['ADMIN']}> ... </RutaProtegida>
 *
 *  - mientras se verifica la sesión guardada: indicador de carga (NO redirige, así recargar no te saca de la página);
 *  - sin conexión al verificar la sesión guardada (errorArranque): pantalla con el error y botón Reintentar;
 *  - sin sesión: /login?next=<la ruta pedida>;
 *  - con sesión pero sin el rol: aviso y redirección (ADMIN -> /admin, CLIENTE -> /);
 *  - sin `roles`: basta con estar autenticado.
 */
export default function RutaProtegida({ roles, children }) {
  const { cargando, autenticado, errorArranque, tieneRol, roles: rolesDelUsuario } = useAuth();
  const ubicacion = useLocation();

  const permitido = autenticado && (!roles?.length || tieneRol(...roles));
  const sinPermiso = autenticado && !permitido;

  useEffect(() => {
    if (sinPermiso) {
      mostrarToast({
        titulo: 'Acceso restringido',
        mensaje: 'Tu cuenta no tiene permisos para ver esa página.',
        tipo: 'warning'
      });
    }
  }, [sinPermiso]);

  if (cargando) return <IndicadorCarga etiqueta="Verificando tu sesión…" />;

  // Había sesión guardada pero no hubo conexión para verificarla: no se manda a /login, se permite reintentar.
  if (!autenticado && errorArranque) return <ErrorSesion />;

  if (!autenticado) {
    const pedida = `${ubicacion.pathname}${ubicacion.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(pedida)}`} replace />;
  }

  if (!permitido) {
    const destino = rolesDelUsuario.includes('ADMIN') ? rutaInicialPorRol(rolesDelUsuario) : '/';
    return <Navigate to={destino} replace />;
  }

  return children;
}
