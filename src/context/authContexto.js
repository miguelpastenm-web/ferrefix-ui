import { createContext, useContext } from 'react';

/**
 * Contexto de autenticación. Vive aparte del componente AuthProvider (archivo .jsx) para que los tests puedan
 * inyectar un valor propio y para respetar la regla react-refresh/only-export-components.
 *
 * Valor que expone:
 *  usuario        {id, rut, nombre, email, telefono, direccion, region, comuna, activo, roles, createdAt} | null
 *  roles          ["ADMIN"] | ["CLIENTE"] | []
 *  esAdmin / esCliente / autenticado   booleanos
 *  tieneRol(...roles)                   true si el usuario tiene alguno de esos roles
 *  cargando       true mientras se verifica la sesión guardada al abrir la página
 *  errorArranque  ApiError si al abrir la página no se pudo consultar al servidor (la sesión NO se cierra por eso)
 *  login({email, password}) / registrar({...}) -> usuario   (lanzan ApiError si el servidor rechaza)
 *  logout()
 *  actualizarUsuario(cambios)  mezcla `cambios` en el usuario en memoria (p. ej. tras guardar el perfil)
 *  reintentarSesion()          vuelve a verificar la sesión guardada (tras un errorArranque por red caída)
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return contexto;
}
