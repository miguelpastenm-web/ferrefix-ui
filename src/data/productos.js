import taladroPercutor from '../assets/products/taladro-percutor.webp';
import sierraCircular from '../assets/products/sierra-circular.webp';
import esmerilAngular from '../assets/products/esmeril-angular.webp';
import cementoBioBio from '../assets/products/cemento-biobio.webp';
import setBrocas from '../assets/products/set-brocas.webp';
import generadorElectrico from '../assets/products/generador-electrico.webp';
import llaveMonomando from '../assets/products/llave-monomando.webp';
import esmalteCeresita from '../assets/products/esmalte-ceresita.webp';
import arnesSeguridad from '../assets/products/arnes-seguridad.webp';
import tornillosDrywall from '../assets/products/tornillos-drywall.webp';
// Fotos reales de los productos de maderas y seguridad.
import cubiertaMelamina from '../assets/products/cubierta-melamina.webp';
import osbMultiplac from '../assets/products/osb-multiplac.webp';
import terciadoRanurado from '../assets/products/terciado-ranurado.webp';
import terciadoEstructural from '../assets/products/terciado-estructural.webp';
import guantesNitrilo from '../assets/products/guantes-nitrilo.webp';
import lentesProteccion from '../assets/products/lentes-proteccion.webp';
import chalecoReflectante from '../assets/products/chaleco-reflectante.webp';
import cascoConstruccion from '../assets/products/casco-construccion.webp';
// Tarjetas diseñadas para las ofertas destacadas del home.
import ofertaCubiertaMelamina from '../assets/sales/oferta-1-cubierta-melamina-cafe-1.webp';
import ofertaOsbMultiplac from '../assets/sales/oferta-2-osb-multiplac.webp';
import ofertaTerciadoRanurado from '../assets/sales/oferta-3-terciado-ranurado.webp';
import ofertaTerciadoEstructural from '../assets/sales/oferta-4-terciado-estructural.webp';
import ofertaGuantesNitrilo from '../assets/sales/guantes-de-nitrilo-card.webp';
import ofertaLentesProteccion from '../assets/sales/lentes-de-protecci-n-card.webp';
import ofertaChalecoReflectante from '../assets/sales/chaleco-reflectante-card.webp';
import ofertaCascoConstruccion from '../assets/sales/casco-de-construcci-n-est-ndar-card.webp';
import { CATEGORIAS_PRODUCTOS } from './categorias';
// Lista base de productos iniciales
export const PRODUCTOS_INICIALES = [
  {
    idProducto: '5422223214',
    nombre: 'Taladro Percutor Inalámbrico 20V Max XR',
    marca: 'DeWalt',
    categoria: 'Herramientas',
    precioVenta: 129990,
    imagen: taladroPercutor,
    stock: 12,
    descripcion: 'Taladro percutor inalámbrico compacto con motor sin carbones (Brushless) de alto rendimiento. Ofrece mayor autonomía y durabilidad para perforaciones exigentes en concreto, madera y metal. Cuenta con luz LED integrada con temporizador para iluminar el área de trabajo en espacios reducidos.',
    especificaciones: {
      'Potencia / Voltaje': '20V MAX',
      'Tipo de Motor': 'Brushless (Sin escobillas)',
      'Velocidad variable': '0 - 550 / 0 - 2,000 RPM',
      'Impactos por minuto': '0 - 34,000 GPM',
      'Mandril': '1/2 pulgada (13 mm) metálico autoajustable',
      'Peso': '1.6 kg',
      'Garantía': '3 años oficial de la marca',
      'Incluye': '2 Baterías 20V 2.0Ah, cargador rápido y maletín rígido'
    }
  },
  {
    idProducto: '5422223215',
    nombre: 'Sierra Circular 7-1/4" 1800W con Guía Láser',
    marca: 'Makita',
    categoria: 'Herramientas',
    precioVenta: 149990,
    imagen: sierraCircular,
    stock: 8,
    descripcion: 'Sierra circular potente diseñada para cortes longitudinales y transversales precisos en madera maciza y derivados. Equipada con base de aluminio resistente, soplador de polvo integrado y empuñadura ergonómica antideslizante para mayor control y seguridad.',
    especificaciones: {
      'Potencia': '1800 Watts',
      'Diámetro del disco': '7-1/4" (185 mm)',
      'Velocidad sin carga': '5,800 RPM',
      'Profundidad de corte a 90°': '64 mm',
      'Profundidad de corte a 45°': '43 mm',
      'Peso': '4.2 kg',
      'Garantía': '1 año oficial Makita',
      'Incluye': 'Disco de carburo de 24 dientes, guía paralela y llave'
    }
  },
  {
    idProducto: '5422223216',
    nombre: 'Esmeril Angular 4-1/2" 850W Heavy Duty',
    marca: 'Bosch',
    categoria: 'Herramientas',
    precioVenta: 54990,
    imagen: esmerilAngular,
    stock: 25,
    descripcion: 'Esmeril angular profesional diseñado para corte, desbaste y lijado en metales y mampostería. Su carcasa compacta permite un agarre cómodo con una sola mano, mientras que sus rejillas de ventilación optimizadas extienden la vida útil del motor.',
    especificaciones: {
      'Potencia': '850 Watts',
      'Diámetro del disco': '4-1/2" (115 mm)',
      'Velocidad': '11,000 RPM',
      'Eje': 'M14 estándar',
      'Peso': '1.9 kg',
      'Garantía': '2 años oficial Bosch',
      'Incluye': 'Empuñadura auxiliar, guarda de protección y llave de brida'
    }
  },
  {
    idProducto: '5422223217',
    nombre: 'Cemento Especial Bío Bío Saco 25 kg',
    marca: 'Bío Bío',
    categoria: 'Construcción',
    precioVenta: 4890,
    imagen: cementoBioBio,
    stock: 140,
    descripcion: 'Cemento de uso general de fraguado controlado y alta resistencia mecánica inicial y final. Formulado para la confección de hormigones estructurales, morteros de pega, estucos y radieres residenciales e industriales.',
    especificaciones: {
      'Presentación': 'Saco de 25 kg',
      'Tipo': 'Cemento hidráulico alta resistencia',
      'Norma': 'NCh148 Of.68',
      'Rendimiento estimado': 'Aprox. 0.02 m³ de mortero por saco',
      'Uso recomendado': 'Cimientos, sobrecimientos, losas y albañilería',
      'Almacenamiento': 'Lugar seco y bajo techo sobre tarima'
    }
  },
  {
    idProducto: '5422223218',
    nombre: 'Set de Brocas y Puntas Mixtas 100 Piezas en Estuche',
    marca: 'Bosch',
    categoria: 'Fijaciones',
    precioVenta: 29990,
    imagen: setBrocas,
    stock: 18,
    descripcion: 'Set integral para taladrado y atornillado compatible con todas las marcas de taladros del mercado. Incluye brocas para madera, metal (HSS-TiN) y concreto, además de una amplia variedad de puntas Phillips, Pozidriv, Torx y hexagonales con adaptador magnético.',
    especificaciones: {
      'Cantidad de piezas': '100 unidades',
      'Material brocas metal': 'Acero rápido con recubrimiento de titanio',
      'Brocas para concreto': 'Punta de carburo de tungsteno (3 a 8 mm)',
      'Brocas para madera': 'Puntas centradoras helicoidales (3 a 10 mm)',
      'Estuche': 'Maletín modular de plástico de alto impacto',
      'Garantía': '6 meses'
    }
  },
  {
    idProducto: '5422223219',
    nombre: 'Generador Eléctrico a Gasolina 3000W 7HP Monofásico',
    marca: 'KRAFTER',
    categoria: 'Electricidad',
    precioVenta: 289990,
    imagen: generadorElectrico,
    stock: 5,
    descripcion: 'Generador a combustión ideal para respaldo eléctrico en hogares, parcelas o faenas de construcción donde no hay suministro de red. Posee regulador automático de voltaje (AVR) que protege artefactos sensibles contra fluctuaciones eléctricas.',
    especificaciones: {
      'Potencia Nominal': '2800 Watts',
      'Potencia Máxima': '3000 Watts',
      'Motor': '4 tiempos 7.0 HP OHV monocilíndrico',
      'Capacidad estanque': '15 Litros',
      'Autonomía': 'Aprox. 9 horas a media carga',
      'Voltaje / Frecuencia': '220V / 50 Hz',
      'Sistema de partida': 'Manual retráctil',
      'Garantía': '1 año'
    }
  },
  {
    idProducto: '5422223220',
    nombre: 'Set Llave Monomando Lavaplatos Cuello Flexible Negro Mate',
    marca: 'Stretto',
    categoria: 'Gasfitería',
    precioVenta: 42990,
    imagen: llaveMonomando,
    stock: 15,
    descripcion: 'Grifería monomando moderna con caño de silicona flexible de 360 grados y terminación negro mate de alta resistencia a la corrosión. Incorpora cartucho cerámico antifuga de 35 mm y aireador que reduce hasta un 40% el consumo de agua.',
    especificaciones: {
      'Material': 'Cuerpo de latón macizo y cuello flexible de silicona',
      'Acabado': 'Negro Mate electrostático',
      'Tipo de cierre': 'Cartucho cerámico 35 mm',
      'Conexión': 'Flexibles de acero inoxidable G 1/2"',
      'Presión de trabajo': '1 a 5 bar',
      'Garantía': '5 años'
    }
  },
  {
    idProducto: '5422223221',
    nombre: 'Esmalte al Agua Profesional Blanco Semibrillo 1 Galón',
    marca: 'Ceresita',
    categoria: 'Pinturas',
    precioVenta: 31990,
    imagen: esmalteCeresita,
    stock: 32,
    descripcion: 'Pintura esmalte al agua de formulación premium con tecnología antihongos y antibacterias. Posee excelente lavabilidad, secado rápido y bajo olor, ideal para aplicación en muros interiores y exteriores de baños, cocinas, piezas y fachadas.',
    especificaciones: {
      'Formato': '1 Galón (3.785 Litros)',
      'Terminación': 'Semibrillo',
      'Rendimiento': '40 a 45 m² por mano por galón',
      'Tiempo de secado al tacto': '30 a 60 minutos',
      'Repintado': '4 a 6 horas',
      'Base': 'Acuosa (Lavable con agua)',
      'Uso': 'Interior y exterior'
    }
  },
  {
    idProducto: '5422223222',
    nombre: 'Arnés de Seguridad 4 Argollas Anticaídas con Cabo de Vida',
    marca: 'Steelpro',
    categoria: 'Seguridad',
    precioVenta: 45990,
    imagen: arnesSeguridad,
    stock: 20,
    descripcion: 'Arnés de cuerpo entero diseñado para detención de caídas y posicionamiento en trabajos en altura. Fabricado en cintas de poliéster de alta tenacidad con costuras reforzadas, hebillas de conexión rápida y almohadilla lumbar transpirable para mayor confort.',
    especificaciones: {
      'Argollas': '1 dorsal anticaídas, 2 laterales de posicionamiento, 1 esternal',
      'Cinta': 'Poliéster 45 mm resistencia a la tracción > 25 kN',
      'Cabo de vida': 'Incluido con absorbedor de impacto y mosquetones doble seguro',
      'Certificación': 'Norma Chilena NCh 1258 y certificación CESMEC',
      'Capacidad máxima': '140 kg (usuario + herramientas)',
      'Garantía': '1 año contra defectos de fabricación'
    }
  },
  {
    idProducto: '5422223223',
    nombre: 'Pack 1000 Tornillos Autoperforantes Drywall 6x1-1/4"',
    marca: 'Mamut',
    categoria: 'Fijaciones',
    precioVenta: 11990,
    imagen: tornillosDrywall,
    stock: 55,
    descripcion: 'Tornillos fosfatizados negros con punta broca diseñados para la fijación de planchas de yeso cartón (Volcanita/Gyplac) a perfiles metálicos estructurales (Metalcon) de hasta 0.85 mm de espesor sin necesidad de guía previa.',
    especificaciones: {
      'Medida': '6 x 1-1/4" (Aprox. 32 mm longitud)',
      'Cabeza': 'Trompeta ranura Phillips N°2',
      'Punta': 'Broca autoperforante',
      'Recubrimiento': 'Fosfatizado negro anticorrosivo',
      'Presentación': 'Caja de 1000 unidades',
      'Uso recomendado': 'Tabiquería, cielos falsos y perfiles Metalcon'
    }
  },
  {
    idProducto: '5422223224',
    nombre: 'Cubierta Melamina Café 15mm 60x120cm',
    marca: 'Masisa',
    categoria: 'Maderas',
    precioVenta: 9990,
    imagen: cubiertaMelamina,
    imagenOferta: ofertaCubiertaMelamina,
    stock: 45,
    descripcion: 'Cubierta de melamina tono café de 15 mm y 60x120 cm, diseñada para la construcción de muebles, cubiertas de closet, escritorios y superficies de trabajo. Su laminado melamínico resiste la humedad, los rayados y la limpieza diaria, entregando una terminación uniforme sin necesidad de barniz.',
    especificaciones: {
      'Espesor': '15 mm',
      'Medidas': '60 x 120 cm',
      'Color': 'Café',
      'Terminación': 'Melamina',
      'Cara': 'Doble cara melamínica',
      'Uso recomendado': 'Mueblería, closet y superficies de trabajo',
      'Presentación': '1 cubierta'
    }
  },
  {
    idProducto: '5422223225',
    nombre: 'Tablero OSB Multiplac 8mm 122x244cm',
    marca: 'Multiplac',
    categoria: 'Maderas',
    precioVenta: 10990,
    imagen: osbMultiplac,
    imagenOferta: ofertaOsbMultiplac,
    stock: 60,
    descripcion: 'Tablero OSB de 8 mm y 122x244 cm, fabricado con virutas de madera encoladas y prensadas en capas cruzadas. Ideal para revestimiento de muros, tabiques, cielos y bases de mobiliario, con buena resistencia mecánica y estabilidad dimensional.',
    especificaciones: {
      'Espesor': '8 mm',
      'Medidas': '122 x 244 cm',
      'Tipo': 'OSB (Oriented Strand Board)',
      'Superficie': 'Aspecto natural de viruta',
      'Certificación': 'Baja emisión de formaldehído (E1)',
      'Uso recomendado': 'Construcción, revestimiento y mobiliario',
      'Presentación': '1 tablero'
    }
  },
  {
    idProducto: '5422223226',
    nombre: 'Terciado Ranurado 9mm 122x244cm',
    marca: 'Multiplac',
    categoria: 'Maderas',
    precioVenta: 10990,
    imagen: terciadoRanurado,
    imagenOferta: ofertaTerciadoRanurado,
    stock: 38,
    descripcion: 'Terciado ranurado de 9 mm con listones verticales que imitan madera machihembrada. Su cara ranurada entrega un acabado decorativo inmediato, ideal para revestir muros, cielos, tabiques y fondos de muebles en interiores.',
    especificaciones: {
      'Espesor': '9 mm',
      'Medidas': '122 x 244 cm',
      'Tipo': 'Terciado ranurado',
      'Ranurado': 'Vertical decorativo tipo machihembrado',
      'Terminación': 'Natural, lista para barnizar o pintar',
      'Uso recomendado': 'Revestimientos decorativos e interiores',
      'Presentación': '1 tablero'
    }
  },
  {
    idProducto: '5422223227',
    nombre: 'Terciado Estructural 9mm 122x244cm',
    marca: 'Multiplac',
    categoria: 'Maderas',
    precioVenta: 15290,
    imagen: terciadoEstructural,
    imagenOferta: ofertaTerciadoEstructural,
    stock: 30,
    descripcion: 'Terciado estructural de 9 mm y 122x244 cm, conformado por chapas de madera encoladas en capas cruzadas que le entregan alta resistencia mecánica y estabilidad dimensional. Diseñado para soportar cargas y reforzar estructuras de madera en construcción y habilitación de espacios.',
    especificaciones: {
      'Espesor': '9 mm',
      'Medidas': '122 x 244 cm',
      'Tipo': 'Terciado estructural (plywood)',
      'Resistencia': 'Alta resistencia a cargas mecánicas',
      'Encolado': 'Cola estructural resistente a la humedad',
      'Uso recomendado': 'Estructuras, refuerzos y habilitación de espacios',
      'Presentación': '1 tablero'
    }
  },
  {
    idProducto: '5422223228',
    nombre: 'Guantes de Nitrilo Alta Destreza',
    marca: 'Steelpro',
    categoria: 'Seguridad',
    precioVenta: 2090,
    imagen: guantesNitrilo,
    imagenOferta: ofertaGuantesNitrilo,
    stock: 80,
    descripcion: 'Guante de alta destreza para trabajos de precisión. Fabricado en poliéster 13 gauge con palma recubierta de espuma de nitrilo, entrega buen agarre en superficies mojadas y resistencia a hidrocarburos.',
    especificaciones: {
      'Material': 'Poliéster 13 gauge',
      'Recubrimiento': 'Espuma de nitrilo en la palma',
      'Agarre': 'Alto desempeño en seco y mojado',
      'Resistencia': 'Aceites e hidrocarburos',
      'Uso recomendado': 'Trabajos de precisión, manipulación y mantenimiento',
      'Presentación': '1 par'
    }
  },
  {
    idProducto: '5422223229',
    nombre: 'Lentes de Protección Envolventes ANSI Z87.1',
    marca: 'Steelpro',
    categoria: 'Seguridad',
    precioVenta: 2880,
    imagen: lentesProteccion,
    imagenOferta: ofertaLentesProteccion,
    stock: 70,
    descripcion: 'Lentes envolventes con protección lateral y lente resistente a impactos. Cumplen la norma ANSI Z87.1, ideales para obras y trabajos que exigen certificación de seguridad ocular.',
    especificaciones: {
      'Tipo': 'Envolvente con protección lateral',
      'Lente': 'Policarbonato resistente a impactos',
      'Certificación': 'ANSI Z87.1',
      'Uso recomendado': 'Construcción, taller e industria',
      'Presentación': '1 unidad'
    }
  },
  {
    idProducto: '5422223230',
    nombre: 'Chaleco Reflectante Alta Visibilidad',
    marca: 'Steelpro',
    categoria: 'Seguridad',
    precioVenta: 19990,
    imagen: chalecoReflectante,
    imagenOferta: ofertaChalecoReflectante,
    stock: 50,
    descripcion: 'Chaleco de alta visibilidad con franjas reflectantes, esencial para la seguridad en obras de construcción y trabajos nocturnos. Confeccionado en malla liviana y transpirable.',
    especificaciones: {
      'Color': 'Amarillo',
      'Material': 'Malla de poliéster',
      'Franjas': 'Reflectantes de alta visibilidad',
      'Tallas': 'M / L / XL',
      'Uso recomendado': 'Obras, tránsito y trabajos nocturnos',
      'Presentación': '1 unidad'
    }
  },
  {
    idProducto: '5422223231',
    nombre: 'Casco de Construcción Estándar EN397',
    marca: 'Steelpro',
    categoria: 'Seguridad',
    precioVenta: 4761,
    imagen: cascoConstruccion,
    imagenOferta: ofertaCascoConstruccion,
    stock: 65,
    descripcion: 'Casco de polietileno de alta densidad con arnés interior ajustable de 6 puntos, banda de sudor y ranuras universales para acoplar orejeras o viseras. Cumple norma EN397 / ANSI Z89.1.',
    especificaciones: {
      'Material': 'Polietileno de alta densidad',
      'Arnés': 'Ajustable de 6 puntos',
      'Norma': 'EN397 / ANSI Z89.1',
      'Ranuras': 'Universales para orejeras o viseras',
      'Color': 'Amarillo',
      'Presentación': '1 unidad'
    }
  }
];

export { CATEGORIAS_PRODUCTOS };

// SISTEMA DE PERSISTENCIA Y OPERACIONES CRUD (SIMULACIÓN DE BD)
const STORAGE_KEY = 'ferrefix_productos_v1';
export const EVENTO_PRODUCTOS_ACTUALIZADOS = 'ferrefix:productos_actualizados';

// Ruta del endpoint que guarda las imágenes dentro de src/assets/products
const API_SUBIR_IMAGEN = '/api/productos/imagen';
export const TAMANO_MAXIMO_IMAGEN_BYTES = 6 * 1024 * 1024; // 6 MB

/**
 * Convierte un archivo de imagen a Data URL (respaldo cuando no hay servidor).
 */
const archivoADataUrl = (archivo) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    lector.readAsDataURL(archivo);
  });

/**
 * Sube una imagen de producto al servidor de desarrollo, la cual queda guardada
 * físicamente en la carpeta `src/assets/products` y retorna su URL pública.
 * Si el servidor no está disponible, se devuelve la imagen como Data URL para
 * que siga funcionando sin perder el registro.
 */
export const subirImagenProducto = async (archivo) => {
  if (!archivo) return null;

  if (!archivo.type || !archivo.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido (6 MB).');
  }

  try {
    const respuesta = await fetch(API_SUBIR_IMAGEN, {
      method: 'POST',
      headers: {
        'Content-Type': archivo.type,
        'X-File-Name': encodeURIComponent(archivo.name || 'imagen')
      },
      body: archivo
    });

    const tipoRespuesta = respuesta.headers.get('content-type') || '';

    // Solo se considera exitoso si el servidor de Vite guardó el archivo y
    // respondió con la ruta pública de la imagen.
    if (respuesta.ok && tipoRespuesta.includes('application/json')) {
      const datos = await respuesta.json();
      if (datos.url) return datos.url;
    }

    // El servidor no pudo guardar el archivo: se usa la imagen embebida.
    return archivoADataUrl(archivo);
  } catch {
    // Sin servidor (sitio publicado como estático): se usa Data URL.
    return archivoADataUrl(archivo);
  }
};

/**
 * Notifica a los componentes React que los productos cambiaron en tiempo real
 */
const notificarCambio = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_PRODUCTOS_ACTUALIZADOS));
  }
};

// Rutas de las imágenes temporales que usaban los productos de fábrica antes de
// contar con fotos reales. Sirven para migrar los datos ya guardados en localStorage.
const MARCAS_IMAGEN_ANTIGUA = [
  'assets/sales/',
  'oferta-1-cubierta-melamina',
  'oferta-2-osb-multiplac',
  'oferta-3-terciado-ranurado',
  'oferta-4-terciado-estructural',
  'guantes-de-nitrilo-card',
  'lentes-de-protecci-n-card',
  'chaleco-reflectante-card',
  'casco-de-construcci-n-est-ndar-card'
];

const usaImagenAntigua = (imagen) => {
  const valor = String(imagen || '').toLowerCase();
  return MARCAS_IMAGEN_ANTIGUA.some((marca) => valor.includes(marca));
};

/**
 * Obtiene todos los productos desde localStorage.
 * Si no existen, inicializa con PRODUCTOS_INICIALES.
 * (Operación READ - Leer todos)
 */
export const obtenerProductos = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return PRODUCTOS_INICIALES;
  }

  try {
    const dataGuardada = localStorage.getItem(STORAGE_KEY);
    if (!dataGuardada) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTOS_INICIALES));
      return PRODUCTOS_INICIALES;
    }

    const productosGuardados = JSON.parse(dataGuardada);
    const listaBase = Array.isArray(productosGuardados) ? productosGuardados : [];

    // Migra las imágenes temporales de versiones anteriores a las fotos reales.
    // Solo modifica productos de fábrica que aún apuntan a un asset de oferta,
    // por lo que respeta las imágenes subidas o editadas desde el admin.
    let huboCambios = false;
    const productosMigrados = listaBase.map((producto) => {
      const base = PRODUCTOS_INICIALES.find(
        (p) => String(p.idProducto) === String(producto.idProducto)
      );

      if (!base) return producto;

      let actualizado = producto;

      // Reemplaza la imagen temporal vieja por la foto real del catálogo.
      if (producto.imagen !== base.imagen && usaImagenAntigua(producto.imagen)) {
        actualizado = { ...actualizado, imagen: base.imagen };
        huboCambios = true;
      }

      // Agrega o sincroniza la tarjeta diseñada que se muestra en las ofertas.
      if (base.imagenOferta && actualizado.imagenOferta !== base.imagenOferta) {
        actualizado = { ...actualizado, imagenOferta: base.imagenOferta };
        huboCambios = true;
      }

      return actualizado;
    });

    // Incorpora los productos de fábrica nuevos (por ejemplo, los agregados al
    // catálogo) sin borrar los creados o editados desde el panel admin.
    const idsGuardados = new Set(productosMigrados.map((p) => String(p.idProducto)));
    const faltantes = PRODUCTOS_INICIALES.filter((p) => !idsGuardados.has(String(p.idProducto)));

    if (faltantes.length === 0 && !huboCambios) return productosMigrados;

    const listaCompleta = [...productosMigrados, ...faltantes];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listaCompleta));
    return listaCompleta;
  } catch (error) {
    console.error('Error al leer productos desde localStorage:', error);
    return PRODUCTOS_INICIALES;
  }
};

/**
 * Busca un producto por su idProducto
 * (Operación READ - Leer uno)
 */
export const obtenerProductoPorId = (id) => {
  const productos = obtenerProductos();
  return productos.find((p) => String(p.idProducto) === String(id)) || null;
};

/**
 * Agrega un nuevo producto a la base de datos simulada
 * (Operación CREATE - Crear)
 */
export const crearProducto = (nuevoProducto) => {
  const productos = obtenerProductos();

  const productoAInsertar = {
    ...nuevoProducto,
    idProducto: nuevoProducto.idProducto || String(Date.now()),
    stock: Number(nuevoProducto.stock) || 0,
    precioVenta: Number(nuevoProducto.precioVenta) || 0,
    categoria: nuevoProducto.categoria || 'Herramientas',
    imagen: (nuevoProducto.imagen && nuevoProducto.imagen.trim()) || '/banner-web.webp',
    descripcion: nuevoProducto.descripcion || 'Producto de alta calidad disponible en Ferrefix.',
    especificaciones: nuevoProducto.especificaciones || {
      'Disponibilidad': 'Entrega inmediata en tienda o despacho a domicilio',
      'Garantía': 'Garantía legal 6 meses oficial Ferrefix'
    }
  };

  // Se añade al final de la lista como fue requerido
  const nuevaLista = [...productos, productoAInsertar];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaLista));
  notificarCambio();
  return productoAInsertar;
};

/**
 * Actualiza los datos de un producto existente
 * (Operación UPDATE - Actualizar)
 */
export const actualizarProducto = (id, datosActualizados) => {
  const productos = obtenerProductos();
  const index = productos.findIndex((p) => String(p.idProducto) === String(id));

  if (index === -1) {
    console.warn(`Producto con id ${id} no encontrado para actualizar.`);
    return null;
  }

  const productoActualizado = {
    ...productos[index],
    ...datosActualizados,
    stock: datosActualizados.stock !== undefined ? Number(datosActualizados.stock) : productos[index].stock,
    precioVenta: datosActualizados.precioVenta !== undefined ? Number(datosActualizados.precioVenta) : productos[index].precioVenta
  };

  productos[index] = productoActualizado;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
  notificarCambio();
  return productoActualizado;
};

/**
 * Elimina un producto por su idProducto
 * (Operación DELETE - Eliminar)
 */
export const eliminarProducto = (id) => {
  const productos = obtenerProductos();
  const nuevaLista = productos.filter((p) => String(p.idProducto) !== String(id));

  if (nuevaLista.length === productos.length) {
    return false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaLista));
  notificarCambio();
  return true;
};

/**
 * Restablece los productos al catálogo original de fábrica
 * (Utilidad para testing y demostraciones)
 */
export const restablecerProductos = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTOS_INICIALES));
    notificarCambio();
  }
  return PRODUCTOS_INICIALES;
};

