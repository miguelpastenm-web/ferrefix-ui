// VALIDACIONES DE FORMULARIO

// Nombres: letras (con tildes/ñ), espacios, apóstrofes, guiones y puntos.
export const REGEX_NOMBRE =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’.-]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’.-]+)*$/;

export const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// RUT con o sin puntos, con guion opcional: 12.345.678-9 o 12345678-9.
export const REGEX_RUT = /^\d{1,2}\.?\d{3}\.?\d{3}-?[\dKk]$/;

// Direcciones: letras, números y signos habituales (., #, °, /, -).
export const REGEX_DIRECCION = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ'’.,#°/ -]+$/;

// Razón social: puede incluir números y símbolos legales (Ltda., S.A., &).
export const REGEX_RAZON_SOCIAL = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ'’.,&°/ -]+$/;
export const CONTIENE_LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

// Teléfonos chilenos ya normalizados (solo dígitos, con +56 opcional).
export const REGEX_TELEFONO_MOVIL = /^(?:\+?56)?9\d{8}$/;
export const REGEX_TELEFONO_FIJO = /^(?:\+?56)?[2-7]\d{8}$/;

// ---- Utilidades ------------------------------------------------------------

const texto = (valor) => String(valor ?? '').trim();
const estaVacio = (valor) => texto(valor) === '';

// Deja el RUT solo con números y el dígito verificador (K mayúscula).
export const limpiarRut = (rut) => texto(rut).replace(/[^0-9kK]/g, '').toUpperCase();

// Quita espacios, puntos, guiones y paréntesis de un teléfono.
export const normalizarTelefono = (telefono) =>
  texto(telefono).replace(/[\s.\-()]/g, '');

// Calcula el dígito verificador de un cuerpo de RUT (módulo 11).
export const calcularDigitoVerificador = (cuerpo) => {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
};

// Valida un RUT chileno completo (cuerpo + dígito verificador).
export const validarRut = (rut) => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return calcularDigitoVerificador(cuerpo) === dv;
};

// Da formato 12.345.678-9 a un RUT mientras se escribe.
export const formatearRut = (rut) => {
  const limpio = limpiarRut(rut);
  if (limpio.length <= 1) return limpio;
  const cuerpo = limpio
    .slice(0, -1)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
};

// Da formato +56 9 1234 5678 a un teléfono chileno.
export const formatearTelefono = (telefono) => {
  let digitos = texto(telefono).replace(/\D/g, '');
  if (digitos.startsWith('56') && digitos.length > 2) digitos = digitos.slice(2);
  if (!digitos) return '';
  if (digitos.startsWith('9')) {
    const resto = digitos.slice(1, 9);
    const partes = [resto.slice(0, 4), resto.slice(4, 8)].filter(Boolean);
    return `+56 9${partes.length ? ` ${partes.join(' ')}` : ''}`;
  }
  return `+56 ${digitos}`;
};

// ---- Validadores -----------------------------------------------------------

export const validadores = {
  nombre: (valor) => {
    const v = texto(valor);
    if (!v) return 'El nombre es obligatorio.';
    if (v.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    if (v.length > 60) return 'El nombre no puede superar los 60 caracteres.';
    if (/\d/.test(v)) return 'El nombre no puede contener números.';
    if (!REGEX_NOMBRE.test(v)) return 'El nombre solo puede contener letras y espacios.';
    return '';
  },

  rut: (valor) => {
    const v = texto(valor);
    if (!v) return 'El RUT es obligatorio.';
    if (!REGEX_RUT.test(v)) return 'Formato inválido. Usa el formato 12.345.678-9.';
    if (!validarRut(v)) return 'El RUT no es válido (dígito verificador incorrecto).';
    return '';
  },

  razonSocial: (valor) => {
    const v = texto(valor);
    if (!v) return 'El nombre o razón social es obligatorio.';
    if (v.length < 3) return 'Debe tener al menos 3 caracteres.';
    if (v.length > 80) return 'No puede superar los 80 caracteres.';
    if (!CONTIENE_LETRA.test(v)) return 'Debe incluir al menos una letra.';
    if (!REGEX_RAZON_SOCIAL.test(v)) return 'El nombre o razón social contiene caracteres no permitidos.';
    return '';
  },

  email: (valor) => {
    const v = texto(valor);
    if (!v) return 'El correo electrónico es obligatorio.';
    if (!REGEX_EMAIL.test(v)) return 'Ingresa un correo válido (ej: nombre@correo.cl).';
    return '';
  },

  telefono: (valor) => {
    const v = texto(valor);
    if (!v) return 'El teléfono es obligatorio.';
    const limpio = normalizarTelefono(v);
    if (!REGEX_TELEFONO_MOVIL.test(limpio) && !REGEX_TELEFONO_FIJO.test(limpio)) {
      return 'Teléfono chileno inválido (ej: +56 9 1234 5678).';
    }
    return '';
  },

  telefonoOpcional: (valor) => {
    if (estaVacio(valor)) return '';
    return validadores.telefono(valor);
  },

  direccion: (valor) => {
    const v = texto(valor);
    if (!v) return 'La dirección es obligatoria.';
    if (v.length < 5) return 'La dirección debe tener al menos 5 caracteres.';
    if (v.length > 80) return 'La dirección no puede superar los 80 caracteres.';
    if (!REGEX_DIRECCION.test(v)) return 'La dirección contiene caracteres no permitidos.';
    return '';
  },

  detalle: (valor) => {
    const v = texto(valor);
    if (!v) return 'El detalle es obligatorio.';
    if (v.length < 10) return 'Describe tu requerimiento con al menos 10 caracteres.';
    return '';
  },

  requerido: (etiqueta = 'Este campo') => (valor) =>
    estaVacio(valor) ? `${etiqueta} es obligatorio.` : '',

  password: (valor) => {
    const v = texto(valor);
    if (!v) return 'La contraseña es obligatoria.';
    if (v.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'; // mismo mínimo que el backend
    return '';
  }
};

// Valida un formulario completo a partir de un mapa de reglas.
//   validarFormulario({ email: validadores.email }, form) => { email: '...' }
export const validarFormulario = (reglas, datos) => {
  const errores = {};
  Object.entries(reglas).forEach(([campo, validador]) => {
    const mensaje =
      typeof validador === 'function' ? validador(datos[campo], datos) : validador;
    if (mensaje) errores[campo] = mensaje;
  });
  return errores;
};
