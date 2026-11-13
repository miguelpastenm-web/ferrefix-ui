// Archivos de prueba para la subida de imágenes. (No es un test.)
export const archivoImagen = (nombre = 'foto.png', tipo = 'image/png', bytes = 100) =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo });

export const MB = 1024 * 1024;
