import { useCallback, useEffect, useRef, useState } from 'react';
import { AYUDA_FORMATOS_IMAGEN, TIPOS_IMAGEN_PERMITIDOS, validarArchivoImagen } from '../api/imagenes';

/*
  Zona de carga de imagen de producto (Permite seleccionar una imagen haciendo clic o arrastrándola y soltándola)
 */
function ImagenProductoUploader({ archivo, onSeleccionar, onQuitar, imagenActual }) {
  const inputRef = useRef(null);
  const previewRef = useRef('');
  const [arrastrando, setArrastrando] = useState(false);
  const [previsualizacion, setPrevisualizacion] = useState('');
  const [errorArchivo, setErrorArchivo] = useState('');

  // Libera la URL temporal al desmontar el componente.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const reemplazarPrevisualizacion = useCallback((file) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nueva = file ? URL.createObjectURL(file) : '';
    previewRef.current = nueva;
    setPrevisualizacion(nueva);
  }, []);

  const aceptarArchivo = useCallback(
    (file) => {
      if (!file) return;
      // Prechequeo de tipo y tamaño (el servidor vuelve a validar por el contenido del archivo)
      const mensaje = validarArchivoImagen(file);
      setErrorArchivo(mensaje);
      if (mensaje) return;
      reemplazarPrevisualizacion(file);
      onSeleccionar(file);
    },
    [onSeleccionar, reemplazarPrevisualizacion]
  );

  const handleQuitar = useCallback(() => {
    setErrorArchivo('');
    reemplazarPrevisualizacion(null);
    onQuitar();
  }, [onQuitar, reemplazarPrevisualizacion]);

  const imagenVisible = previsualizacion || imagenActual || '';

  const abrirSelector = () => inputRef.current?.click();

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) aceptarArchivo(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) aceptarArchivo(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_IMAGEN_PERMITIDOS.join(',')}
        className="d-none"
        onChange={handleInputChange}
      />

      <div
        className={`admin-upload-zone rounded-1 admin-ta-center ${arrastrando ? 'admin-upload-zone-active' : ''}`}
        onClick={abrirSelector}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirSelector();
          }
        }}
      >
        {imagenVisible ? (
          <div className="d-flex flex-column align-items-center gap-2 p-2">
            <img
              src={imagenVisible}
              alt="Vista previa del producto"
              className="admin-upload-preview border rounded-1 bg-white object-fit-contain"
            />
            <span className="admin-muted">
              {archivo ? 'Imagen seleccionada. Clic para reemplazarla.' : 'Imagen actual. Clic para reemplazarla.'}
            </span>
          </div>
        ) : (
          <div className="py-3">
            <i className="bi bi-cloud-arrow-up admin-upload-icon d-block mb-2"></i>
            <div className="admin-upload-title">
              Arrastra una imagen aquí o haz clic para seleccionarla
            </div>
            <div className="admin-upload-hint">
              {AYUDA_FORMATOS_IMAGEN}
            </div>
          </div>
        )}
      </div>

      {errorArchivo && (
        <div className="text-danger small mt-2" role="alert">{errorArchivo}</div>
      )}

      {archivo && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span className="admin-muted marca-truncar me-2">
            <i className="bi bi-image me-1"></i>
            {archivo.name}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger rounded-1 py-0 px-2"
            onClick={handleQuitar}
          >
            Quitar imagen
          </button>
        </div>
      )}
    </div>
  );
}

export default ImagenProductoUploader;
