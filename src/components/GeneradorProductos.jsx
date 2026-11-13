import { useEffect, useMemo, useRef, useState } from 'react';
import ImagenProductoUploader from './ImagenProductoUploader';
import { urlMedia } from '../api/media';
import OfertaDestacada from './OfertaDestacada';
import {
  DESTINO_OFERTAS,
  convertirCanvasAWebp,
  formatearBytes,
  guardarImagenGenerada,
  nombreArchivoSeguro
} from '../utils/imagenWebp';
import {
  TARJETA_ALTO,
  TARJETA_ANCHO,
  renderizarTarjetaProducto
} from '../utils/renderizadoresGeneradores';
import {
  ENLACE_POR_DEFECTO,
  EVENTO_GENERADORES_ACTUALIZADOS,
  TOTAL_SLOTS_OFERTA,
  eliminarOfertaGenerada,
  guardarEnlaceOferta,
  guardarOfertaGenerada,
  obtenerEnlacesOferta,
  obtenerOfertasGeneradas
} from '../data/generadores';

import ofertaUno from '../assets/sales/guantes-de-nitrilo-card.webp';
import ofertaDos from '../assets/sales/lentes-de-protecci-n-card.webp';
import ofertaTres from '../assets/sales/chaleco-reflectante-card.webp';
import ofertaCuatro from '../assets/sales/casco-de-construcci-n-est-ndar-card.webp';

const OFERTAS_BASE = [ofertaUno, ofertaDos, ofertaTres, ofertaCuatro];

const FORM_INICIAL = {
  modo: 'descuento',
  precioNormal: '29990',
  descuento: '33',
  precioOferta: '20093',
  redondear: true,
  titulo: '',
  descripcion: '',
  tamanoTitulo: 28,
  tamanoDescripcion: 15,
  escalaImagen: 85,
  offsetY: 0,
  margenInferior: 16,
  margenLateral: 16,
  colorCaja: '#1C2226',
  colorDestacado: '#F2B705'
};

const redondearPrecioComercial = (valor) => {
  if (valor <= 0) return 0;
  if (valor < 1000) return Math.max(0, Math.floor(valor / 10) * 10);

  // Baja al precio comercial terminado en 90 inmediatamente inferior. Antes se
  // redondeaba en saltos de $1.000, por lo que descuentos como 4%, 5% y 6%
  // terminaban mostrando exactamente el mismo precio de oferta.
  return Math.max(0, Math.floor((valor - 90) / 100) * 100 + 90);
};

const calcularPrecios = ({ modo, precioNormal, descuento, precioOferta, redondear }) => {
  const normal = Math.max(0, Number(precioNormal) || 0);
  const descuentoIngresado = Math.min(100, Math.max(0, Number(descuento) || 0));
  const ofertaIngresada = Math.max(0, Number(precioOferta) || 0);

  if (modo === 'descuento') {
    if (normal <= 0) {
      return { normal: 0, descuento: descuentoIngresado, oferta: 0 };
    }

    if (descuentoIngresado <= 0) {
      return { normal, descuento: 0, oferta: normal };
    }

    if (descuentoIngresado >= 100) {
      return { normal, descuento: 100, oferta: 0 };
    }

    let oferta = normal * (1 - descuentoIngresado / 100);
    if (redondear) {
      oferta = redondearPrecioComercial(oferta);
    }
    oferta = Math.max(0, Math.round(oferta));

    return {
      normal,
      descuento: descuentoIngresado,
      oferta
    };
  }

  if (normal <= 0) {
    return { normal, descuento: 0, oferta: ofertaIngresada };
  }

  if (ofertaIngresada >= normal) {
    return { normal, descuento: 0, oferta: normal };
  }

  let oferta = ofertaIngresada;
  if (redondear && oferta > 0) {
    oferta = redondearPrecioComercial(oferta);
  }
  oferta = Math.max(0, Math.round(oferta));

  const descuentoCalculado = Math.min(
    100,
    Math.max(0, Math.round(((normal - oferta) / normal) * 100))
  );

  return {
    normal,
    descuento: descuentoCalculado,
    oferta
  };
};

function GeneradorProductos() {
  const canvasRef = useRef(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenSrc, setImagenSrc] = useState('');
  const [imagenCargada, setImagenCargada] = useState(null);
  const [cargandoImagen, setCargandoImagen] = useState(false);

  const [slotActivo, setSlotActivo] = useState(0);
  const [ofertas, setOfertas] = useState(obtenerOfertasGeneradas);
  const [enlaces, setEnlaces] = useState(() => {
    const borradores = obtenerEnlacesOferta();
    const guardadas = obtenerOfertasGeneradas();
    return Array.from(
      { length: TOTAL_SLOTS_OFERTA },
      (_, indice) => borradores[indice] || guardadas[indice]?.enlace || ENLACE_POR_DEFECTO
    );
  });

  const [fuentesListas, setFuentesListas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const enlaceActivo = enlaces[slotActivo] ?? ENLACE_POR_DEFECTO;

  const precios = useMemo(() => calcularPrecios(form), [form]);

  const configuracion = useMemo(
    () => ({
      imagen: imagenCargada,
      titulo: form.titulo,
      descripcion: form.descripcion,
      precioNormal: precios.normal,
      precioOferta: precios.oferta,
      descuento: precios.descuento,
      escalaImagen: form.escalaImagen,
      offsetY: form.offsetY,
      tamanoTitulo: form.tamanoTitulo,
      tamanoDescripcion: form.tamanoDescripcion,
      margenInferior: form.margenInferior,
      margenLateral: form.margenLateral,
      colorCaja: form.colorCaja,
      colorDestacado: form.colorDestacado
    }),
    [form, imagenCargada, precios]
  );

  // Mantiene la lista de ofertas sincronizada con el generador de banners y la tienda.
  useEffect(() => {
    const sincronizar = () => setOfertas(obtenerOfertasGeneradas());

    window.addEventListener(EVENTO_GENERADORES_ACTUALIZADOS, sincronizar);
    window.addEventListener('storage', sincronizar);

    return () => {
      window.removeEventListener(EVENTO_GENERADORES_ACTUALIZADOS, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  // Espera a que las tipografías estén disponibles para dibujar textos nítidos.
  useEffect(() => {
    let activo = true;

    const cargarFuentes = async () => {
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await Promise.all([
            document.fonts.load('700 28px Montserrat'),
            document.fonts.load('500 15px Montserrat'),
            document.fonts.load('900 38px Montserrat')
          ]);
          await document.fonts.ready;
        } catch {
          // Si una fuente no está disponible se usa la tipografía de respaldo.
        }
      }

      if (activo) setFuentesListas(true);
    };

    cargarFuentes();

    return () => {
      activo = false;
    };
  }, []);

  // Carga la imagen seleccionada como HTMLImageElement para poder dibujarla.
  useEffect(() => {
    if (!imagenSrc) return undefined;

    let activo = true;
    const imagen = new Image();
    imagen.crossOrigin = 'anonymous';
    imagen.onload = () => {
      if (!activo) return;
      setImagenCargada(imagen);
      setCargandoImagen(false);
    };
    imagen.onerror = () => {
      if (!activo) return;
      setImagenCargada(null);
      setCargandoImagen(false);
      setMensaje({
        tipo: 'error',
        texto: 'No se pudo cargar la imagen seleccionada. Intenta con otro archivo.'
      });
    };
    imagen.src = imagenSrc;

    return () => {
      activo = false;
    };
  }, [imagenSrc]);

  // Redibuja la vista previa cada vez que cambia cualquier propiedad.
  useEffect(() => {
    if (!canvasRef.current) return;
    renderizarTarjetaProducto(canvasRef.current, configuracion, 2);
  }, [configuracion, fuentesListas]);

  const actualizarCampo = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const cambiarModo = (nuevoModo) => {
    if (nuevoModo === form.modo) return;

    if (nuevoModo === 'oferta') {
      setForm((actual) => ({
        ...actual,
        modo: 'oferta',
        precioOferta: String(precios.oferta)
      }));
    } else {
      setForm((actual) => ({
        ...actual,
        modo: 'descuento',
        descuento: String(precios.descuento)
      }));
    }
  };

  const seleccionarImagen = (archivo) => {
    setImagenArchivo(archivo);
    setMensaje(null);

    if (!archivo) {
      setImagenSrc('');
      setImagenCargada(null);
      setCargandoImagen(false);
      return;
    }

    setCargandoImagen(true);
    const lector = new FileReader();
    lector.onload = () => setImagenSrc(String(lector.result || ''));
    lector.onerror = () => {
      setCargandoImagen(false);
      setMensaje({ tipo: 'error', texto: 'No se pudo leer la imagen seleccionada.' });
    };
    lector.readAsDataURL(archivo);
  };

  const seleccionarSlot = (indice) => {
    setSlotActivo(indice);
    setMensaje(null);
  };

  const actualizarEnlace = (valor) => {
    setEnlaces((actual) => {
      const siguiente = [...actual];
      siguiente[slotActivo] = valor;
      return siguiente;
    });
    guardarEnlaceOferta(slotActivo, valor);
  };

  const generarBlob = async () => {
    const lienzo = document.createElement('canvas');
    renderizarTarjetaProducto(lienzo, configuracion, 3);
    return convertirCanvasAWebp(lienzo, 0.92);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);

    try {
      if (imagenArchivo && !imagenCargada) {
        throw new Error('La imagen aún se está cargando. Espera un momento e inténtalo de nuevo.');
      }

      const blob = await generarBlob();
      const nombre = `oferta-${slotActivo + 1}-${nombreArchivoSeguro(
        form.titulo || 'tarjeta-producto'
      )}`;
      const enlaceFinal = String(enlaces[slotActivo] ?? '').trim() || ENLACE_POR_DEFECTO;
      const urlGuardada = await guardarImagenGenerada(blob, nombre, DESTINO_OFERTAS);

      const guardado = guardarOfertaGenerada(slotActivo, {
        imagen: urlGuardada,
        enlace: enlaceFinal,
        alt: form.titulo || `Oferta destacada ${slotActivo + 1}`
      });

      if (!guardado) {
        throw new Error('No se pudo guardar la referencia de la oferta generada.');
      }

      setEnlaces((actual) => {
        const siguiente = [...actual];
        siguiente[slotActivo] = enlaceFinal;
        return siguiente;
      });

      setMensaje({
        tipo: 'ok',
        texto: `Imagen WebP (${formatearBytes(blob.size)}) guardada en src/assets/sales e inyectada en OfertaDestacada.`
      });
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto:
          error.message ||
          'No se pudo guardar en assets. Verifica que el servidor de desarrollo esté activo.'
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleQuitarOferta = () => {
    if (eliminarOfertaGenerada(slotActivo)) {
      setOfertas(obtenerOfertasGeneradas());
      setMensaje({
        tipo: 'ok',
        texto: `Se restauró la oferta base de la posición ${slotActivo + 1}.`
      });
    }
  };

  const ofertasVista = useMemo(
    () =>
      OFERTAS_BASE.map((imagenBase, indice) => ({
        imagen: ofertas[indice]?.imagen ? urlMedia(ofertas[indice].imagen) : imagenBase,
        enlace: enlaces[indice] || ENLACE_POR_DEFECTO
      })),
    [ofertas, enlaces]
  );

  return (
    <section className="admin-box generador-panel">
      <div className="generador-head">
        <div>
          <h2 className="admin-section-title mb-0">Generador de tarjetas de producto</h2>
        </div>
      </div>

      <div className="generador-body row g-4">
        <div className="col-12 col-xl-5">
          <form
            className="generador-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleGuardar();
            }}
          >
            {/* 1. Precios */}
            <div className="generador-group">
              <div className="generador-group-head">
                <span className="generador-num">1</span>
                Precios y descuento
              </div>
              <div className="generador-group-body">
                <div className="generador-seg" role="group" aria-label="Modo de cálculo">
                  <button
                    type="button"
                    className={form.modo === 'descuento' ? 'active' : ''}
                    onClick={() => cambiarModo('descuento')}
                  >
                    Precio normal + %
                  </button>
                  <button
                    type="button"
                    className={form.modo === 'oferta' ? 'active' : ''}
                    onClick={() => cambiarModo('oferta')}
                  >
                    Precio normal + oferta
                  </button>
                </div>

                <div className="row g-2">
                  <div className="col-12 col-sm-4">
                    <label className="form-label admin-label mb-1" htmlFor="generador-precio-normal">
                      Precio normal
                    </label>
                    <input
                      id="generador-precio-normal"
                      type="number"
                      min="0"
                      step="10"
                      className="form-control form-control-sm rounded-1 admin-mono"
                      value={form.precioNormal}
                      onChange={(event) => actualizarCampo('precioNormal', event.target.value)}
                    />
                  </div>

                  <div className="col-6 col-sm-4">
                    <label className="form-label admin-label mb-1" htmlFor="generador-descuento">
                      Descuento (%)
                    </label>
                    <input
                      id="generador-descuento"
                      type="number"
                      min="0"
                      max="100"
                      className={`form-control form-control-sm rounded-1 admin-mono ${
                        form.modo !== 'descuento' ? 'bg-light' : ''
                      }`}
                      value={form.modo === 'descuento' ? form.descuento : precios.descuento}
                      readOnly={form.modo !== 'descuento'}
                      onChange={(event) => actualizarCampo('descuento', event.target.value)}
                    />
                  </div>

                  <div className="col-6 col-sm-4">
                    <label className="form-label admin-label mb-1" htmlFor="generador-precio-oferta">
                      Precio oferta
                    </label>
                    <input
                      id="generador-precio-oferta"
                      type="number"
                      min="0"
                      step="10"
                      className={`form-control form-control-sm rounded-1 admin-mono ${
                        form.modo === 'descuento' ? 'bg-light' : ''
                      }`}
                      value={form.modo === 'descuento' ? precios.oferta : form.precioOferta}
                      readOnly={form.modo === 'descuento'}
                      onChange={(event) => actualizarCampo('precioOferta', event.target.value)}
                      onBlur={() => {
                        if (form.modo === 'oferta' && form.redondear) {
                          actualizarCampo('precioOferta', String(precios.oferta));
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="form-check">
                  <input
                    id="generador-redondear"
                    type="checkbox"
                    className="form-check-input"
                    checked={form.redondear}
                    onChange={(event) => actualizarCampo('redondear', event.target.checked)}
                  />
                  <label className="form-check-label admin-muted" htmlFor="generador-redondear">
                    Redondear el precio de oferta a un valor comercial terminado en 90 (ej. $19.990)
                  </label>
                </div>
                <div className="generador-hint">
                  Se usa el valor comercial terminado en 90 inmediatamente inferior. Así cada
                  porcentaje de descuento conserva un precio final distinto.
                </div>
              </div>
            </div>

            {/* 2. Imagen */}
            <div className="generador-group">
              <div className="generador-group-head">
                <span className="generador-num">2</span>
                Imagen del producto
              </div>
              <div className="generador-group-body">
                <ImagenProductoUploader
                  archivo={imagenArchivo}
                  onSeleccionar={seleccionarImagen}
                  onQuitar={() => seleccionarImagen(null)}
                  imagenActual={imagenSrc}
                />

                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-escala">
                      Escala de imagen <span className="generador-valor">{form.escalaImagen}%</span>
                    </label>
                    <input
                      id="generador-escala"
                      type="range"
                      className="form-range"
                      min="40"
                      max="150"
                      value={form.escalaImagen}
                      onChange={(event) => actualizarCampo('escalaImagen', Number(event.target.value))}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-offset-y">
                      Ajuste vertical <span className="generador-valor">{form.offsetY}px</span>
                    </label>
                    <input
                      id="generador-offset-y"
                      type="range"
                      className="form-range"
                      min="-60"
                      max="60"
                      value={form.offsetY}
                      onChange={(event) => actualizarCampo('offsetY', Number(event.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Textos */}
            <div className="generador-group">
              <div className="generador-group-head">
                <span className="generador-num">3</span>
                Textos e información
              </div>
              <div className="generador-group-body">
                <div>
                  <label className="form-label admin-label mb-1" htmlFor="generador-titulo">
                    Título del producto
                  </label>
                  <input
                    id="generador-titulo"
                    type="text"
                    className="form-control form-control-sm rounded-1"
                    placeholder="Ej: Taladro Percutor 20V Max XR"
                    value={form.titulo}
                    onChange={(event) => actualizarCampo('titulo', event.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label admin-label mb-1" htmlFor="generador-descripcion">
                    Descripción corta
                  </label>
                  <textarea
                    id="generador-descripcion"
                    rows="2"
                    className="form-control form-control-sm rounded-1"
                    placeholder="Ej: Motor brushless, 2 baterías y maletín incluido"
                    value={form.descripcion}
                    onChange={(event) => actualizarCampo('descripcion', event.target.value)}
                  />
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-tamano-titulo">
                      Tamaño título <span className="generador-valor">{form.tamanoTitulo}px</span>
                    </label>
                    <input
                      id="generador-tamano-titulo"
                      type="range"
                      className="form-range"
                      min="18"
                      max="40"
                      value={form.tamanoTitulo}
                      onChange={(event) => actualizarCampo('tamanoTitulo', Number(event.target.value))}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-tamano-desc">
                      Tamaño descripción{' '}
                      <span className="generador-valor">{form.tamanoDescripcion}px</span>
                    </label>
                    <input
                      id="generador-tamano-desc"
                      type="range"
                      className="form-range"
                      min="11"
                      max="22"
                      value={form.tamanoDescripcion}
                      onChange={(event) =>
                        actualizarCampo('tamanoDescripcion', Number(event.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Estilos */}
            <div className="generador-group">
              <div className="generador-group-head">
                <span className="generador-num">4</span>
                Espaciado y colores
              </div>
              <div className="generador-group-body">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-margen-inferior">
                      Espaciado inferior{' '}
                      <span className="generador-valor">{form.margenInferior}px</span>
                    </label>
                    <input
                      id="generador-margen-inferior"
                      type="range"
                      className="form-range"
                      min="0"
                      max="36"
                      value={form.margenInferior}
                      onChange={(event) =>
                        actualizarCampo('margenInferior', Number(event.target.value))
                      }
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-margen-lateral">
                      Margen lateral <span className="generador-valor">{form.margenLateral}px</span>
                    </label>
                    <input
                      id="generador-margen-lateral"
                      type="range"
                      className="form-range"
                      min="8"
                      max="36"
                      value={form.margenLateral}
                      onChange={(event) =>
                        actualizarCampo('margenLateral', Number(event.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-color-caja">
                      Color caja de precio
                    </label>
                    <div className="generador-color-row">
                      <input
                        id="generador-color-caja"
                        type="color"
                        className="form-control form-control-color"
                        value={form.colorCaja}
                        onChange={(event) => actualizarCampo('colorCaja', event.target.value)}
                      />
                      <span className="generador-valor">{form.colorCaja.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="col-6">
                    <label className="form-label admin-label mb-1" htmlFor="generador-color-destacado">
                      Color destacado
                    </label>
                    <div className="generador-color-row">
                      <input
                        id="generador-color-destacado"
                        type="color"
                        className="form-control form-control-color"
                        value={form.colorDestacado}
                        onChange={(event) => actualizarCampo('colorDestacado', event.target.value)}
                      />
                      <span className="generador-valor">{form.colorDestacado.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Destino */}
            <div className="generador-group">
              <div className="generador-group-head">
                <span className="generador-num">5</span>
                Destino en la tienda
              </div>
              <div className="generador-group-body">
                <div>
                  <label className="form-label admin-label mb-1" htmlFor="generador-enlace">
                    Enlace de la oferta
                  </label>
                  <input
                    id="generador-enlace"
                    type="text"
                    className="form-control form-control-sm rounded-1"
                    placeholder={ENLACE_POR_DEFECTO}
                    value={enlaces[slotActivo] ?? ENLACE_POR_DEFECTO}
                    onChange={(event) => actualizarEnlace(event.target.value)}
                  />
                  <div className="generador-hint mt-1">
                    Este enlace se guarda automáticamente por cada oferta. Si se deja vacío se
                    utiliza <code>{ENLACE_POR_DEFECTO}</code>.
                  </div>
                </div>

                <div>
                  <span className="form-label admin-label mb-1 d-block">Posición de la oferta</span>
                  <div className="generador-slot-grid">
                    {Array.from({ length: TOTAL_SLOTS_OFERTA }, (_, indice) => {
                      const oferta = ofertas[indice];
                      return (
                        <button
                          key={indice}
                          type="button"
                          className={`generador-slot ${slotActivo === indice ? 'active' : ''}`}
                          onClick={() => seleccionarSlot(indice)}
                          aria-label={`Seleccionar oferta ${indice + 1}`}
                          aria-pressed={slotActivo === indice}
                        >
                          {oferta?.imagen ? (
                            <img src={urlMedia(oferta.imagen)} alt={`Oferta ${indice + 1}`} />
                          ) : (
                            <span className="generador-slot-empty">Vacía</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {ofertas[slotActivo]?.imagen && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger rounded-1 align-self-start"
                    onClick={handleQuitarOferta}
                  >
                    Quitar imagen de esta oferta
                  </button>
                )}
              </div>
            </div>

            {mensaje && (
              <div className={`generador-alert generador-alert--${mensaje.tipo}`} role="status">
                {mensaje.texto}
              </div>
            )}

            <div className="generador-actions">
              <button
                type="submit"
                className="btn btn-ambar admin-btn-strong rounded-1"
                disabled={guardando || cargandoImagen}
              >
                <i className="bi bi-magic me-2"></i>
                {guardando ? 'Generando y guardando...' : 'Generar y guardar en assets'}
              </button>
            </div>
          </form>
        </div>

        <div className="col-12 col-xl-7">
          <div className="generador-preview-sticky">
            <div className="generador-preview-card">
              <div className="generador-preview-head">
                <div>
                  <h3 className="generador-preview-title">Vista previa de la tarjeta</h3>
                  <span className="admin-muted">
                    {TARJETA_ANCHO} × {TARJETA_ALTO} px · salida WebP
                  </span>
                </div>
              </div>

              <div className="generador-preview-stage">
                <canvas
                  ref={canvasRef}
                  className="generador-card-canvas"
                  aria-label="Vista previa de la tarjeta de producto"
                />
              </div>
            </div>

            <div className="generador-preview-card mt-3">
              <div className="generador-preview-head">
                <div>
                  <h3 className="generador-preview-title">Así se verá en OfertaDestacada</h3>
                  <span className="admin-muted">
                    Las posiciones guardadas se inyectan automáticamente en la página de inicio.
                  </span>
                </div>
                <span className="admin-badge-soft">{enlaceActivo || ENLACE_POR_DEFECTO}</span>
              </div>

              <div className="generador-oferta-preview">
                <OfertaDestacada
                  ofertas={ofertasVista.map(({ imagen, enlace }) => ({
                    img: imagen,
                    link: enlace
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GeneradorProductos;
