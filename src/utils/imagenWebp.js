/**
 * Utilidades de imágenes para los generadores del panel administrativo.
 *
 * Toda imagen generada se dibuja en un <canvas>, se convierte a WebP y se
 * sube al backend (POST /api/v1/imagenes), que la guarda y la sirve en /media/<destino>/.
 * Lo que se guarda es la RUTA RELATIVA que devuelve el servidor (se muestra con urlMedia).
 */
import { subirImagen } from '../api/imagenes';

// Destinos del backend (lista cerrada: productos, ofertas, banners, maquinas)
export const DESTINO_PRODUCTOS = 'productos';
export const DESTINO_OFERTAS = 'ofertas';
export const DESTINO_BANNERS = 'banners';

// Límite para las imágenes que se cargan en el lienzo del generador (la imagen que se sube pesa mucho menos)
const TAMANO_MAXIMO_IMAGEN_BYTES = 12 * 1024 * 1024;

/** Carga una imagen a partir de una URL, Data URL u objeto URL. */
export const cargarImagen = (fuente) =>
  new Promise((resolve, reject) => {
    if (!fuente) {
      reject(new Error('No se recibió una imagen para cargar.'));
      return;
    }

    const imagen = new Image();
    imagen.crossOrigin = 'anonymous';
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    imagen.src = fuente;
  });

/** Convierte un File/Blob de imagen a un objeto URL temporal. */
export const archivoAObjectUrl = (archivo) => {
  if (!archivo) return '';
  return URL.createObjectURL(archivo);
};

/** Libera un objeto URL creado con archivoAObjectUrl. */
export const liberarObjectUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/** Convierte un canvas a WebP. */
export const convertirCanvasAWebp = (canvas, calidad = 0.92) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blobWebp) => {
        if (blobWebp) {
          resolve(blobWebp);
          return;
        }

        canvas.toBlob(
          (blobPng) => {
            if (blobPng) {
              resolve(blobPng);
              return;
            }
            reject(new Error('No se pudo convertir el canvas a WebP.'));
          },
          'image/png'
        );
      },
      'image/webp',
      calidad
    );
  });

/**
 * Convierte cualquier archivo de imagen a WebP, limitando su ancho máximo.
 * Útil para preparar imágenes de entrada antes de dibujarlas o subirlas.
 */
export const convertirArchivoAWebp = async (
  archivo,
  { calidad = 0.9, anchoMaximo = 1600, altoMaximo = 1600, fondo = null } = {}
) => {
  if (!archivo) {
    throw new Error('No se recibió ningún archivo.');
  }

  if (!archivo.type || !archivo.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido (12 MB).');
  }

  const urlTemporal = archivoAObjectUrl(archivo);

  try {
    const imagen = await cargarImagen(urlTemporal);
    const factor = Math.min(
      1,
      anchoMaximo / imagen.naturalWidth,
      altoMaximo / imagen.naturalHeight
    );

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagen.naturalWidth * factor));
    canvas.height = Math.max(1, Math.round(imagen.naturalHeight * factor));

    const ctx = canvas.getContext('2d');
    if (fondo) {
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

    return await convertirCanvasAWebp(canvas, calidad);
  } finally {
    liberarObjectUrl(urlTemporal);
  }
};

/** Genera un nombre de archivo seguro y corto. */
export const nombreArchivoSeguro = (texto, respaldo = 'imagen') => {
  const limpio = String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return limpio || respaldo;
};

/**
 * Sube al backend una imagen ya convertida (WebP) y devuelve su ruta relativa (/media/<destino>/<uuid>.webp).
 * Lanza el ApiError del backend (400 si no es una imagen válida, 413 si supera 6 MB, 403/401 por permisos o sesión).
 */
export const guardarImagenGenerada = async (blob, nombre, destino = DESTINO_OFERTAS) => {
  if (!blob) {
    throw new Error('No hay una imagen para guardar.');
  }
  const extension = blob.type === 'image/png' ? '.png' : '.webp';
  const { url } = await subirImagen(blob, destino, `${nombreArchivoSeguro(nombre)}${extension}`);
  return url;
};

/** Formatea bytes para mostrarlos en la interfaz. */
export const formatearBytes = (bytes) => {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
  return `${(valor / (1024 * 1024)).toFixed(2)} MB`;
};
