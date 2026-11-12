import { useAuth } from '../context/authContexto';

/**
 * Indicador de carga mientras se verifica la sesión guardada al abrir la página. Se usa para no mostrar (o
 * inicializar con datos vacíos) pantallas que dependen del usuario hasta saber quién es.
 */
export function IndicadorCarga({ etiqueta = 'Cargando…' }) {
  return (
    <div className="d-flex justify-content-center align-items-center py-5" role="status" aria-live="polite">
      <div className="spinner-border spinner-border-sm me-2" aria-hidden="true"></div>
      <span>{etiqueta}</span>
    </div>
  );
}

/**
 * Al abrir la página había tokens guardados pero no se pudo consultar al servidor (red caída, 5xx). La sesión NO se
 * cerró: se muestra el error y se deja reintentar, en vez de mandar a /login a alguien que sigue con sesión.
 */
export function ErrorSesion() {
  const { errorArranque, reintentarSesion } = useAuth();
  return (
    <div className="container py-5 text-center" role="alert">
      <i className="bi bi-wifi-off display-5 text-warning d-block mb-3" aria-hidden="true"></i>
      <h2 className="h5 mb-2">No pudimos verificar tu sesión</h2>
      <p className="text-secondary mb-3">{errorArranque?.mensaje}</p>
      <button type="button" className="btn btn-ambar px-4" onClick={reintentarSesion}>
        Reintentar
      </button>
    </div>
  );
}

export default function EsperarSesion({ children }) {
  const { cargando, autenticado, errorArranque } = useAuth();
  if (cargando) return <IndicadorCarga etiqueta="Verificando tu sesión…" />;
  if (!autenticado && errorArranque) return <ErrorSesion />;
  return children;
}
