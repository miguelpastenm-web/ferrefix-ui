import { useEffect, useRef, useState } from 'react';

/**
 * Carga asíncrona con estados de carga, error y reintento.
 *   const { datos, cargando, error, recargar } = useCarga(() => listarProductos({ categoria }), categoria);
 * `clave` identifica QUÉ se está pidiendo: cuando cambia, se vuelve a cargar (y `cargando` pasa a true de inmediato,
 * sin setState dentro del efecto: se deduce de que el último resultado es de otra clave).
 */
export function useCarga(funcion, clave = '') {
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: null });
  const [intento, setIntento] = useState(0);
  const claveActual = `${clave}#${intento}`;
  const ultima = useRef(funcion);

  useEffect(() => {
    ultima.current = funcion;
  });

  useEffect(() => {
    let activo = true;
    Promise.resolve()
      .then(() => ultima.current())
      .then(
        (datos) => activo && setResultado({ clave: claveActual, datos, error: null }),
        (error) => activo && setResultado({ clave: claveActual, datos: null, error })
      );
    return () => {
      activo = false;
    };
  }, [claveActual]);

  const cargando = resultado.clave !== claveActual;
  return {
    datos: cargando ? null : resultado.datos,
    error: cargando ? null : resultado.error,
    cargando,
    recargar: () => setIntento((n) => n + 1)
  };
}
