/** Error al cargar datos de la API, con botón para reintentar. */
export default function ErrorCarga({ error, onReintentar, titulo = 'No pudimos cargar la información' }) {
  return (
    <div className="alert alert-warning rounded-3 text-center my-4 py-4" role="alert">
      <i className="bi bi-exclamation-triangle-fill fs-3 d-block mb-2" aria-hidden="true"></i>
      <h2 className="h5 mb-2">{titulo}</h2>
      <p className="mb-3">{error?.mensaje ?? 'Ocurrió un error inesperado.'}</p>
      {onReintentar && (
        <button type="button" className="btn btn-ambar px-4" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
