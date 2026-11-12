// Test: Formulario Registro: acepta nombre, correo y contraseña válidos, rechaza una contraseña de 7 caracteres y un RUT inválido, y acepta los límites mínimos de 3 y 8 caracteres
// Función: validarFormulario()

import { describe, test, expect } from 'vitest';
import { validarFormulario, validadores } from '../data/validaciones.js';

const REGLAS_REGISTRO = {
  nombre: validadores.nombre,
  rut: validadores.rut,
  email: validadores.email,
  password: validadores.password
};

describe('Formulario Registro de Cliente', () => {
  test('Formulario Registro: acepta nombre, correo y contraseña válidos, rechaza una contraseña de 7 caracteres y un RUT inválido, y acepta los límites mínimos de 3 y 8 caracteres', () => {
    const correcto = validarFormulario(REGLAS_REGISTRO, {
      nombre: 'Juan Pérez',
      rut: '12.345.678-5',
      email: 'juan@ferrefix.cl',
      password: 'segura123'
    });
    expect(Object.keys(correcto)).toHaveLength(0);

    const passwordCorta = validarFormulario(REGLAS_REGISTRO, {
      nombre: 'Juan Pérez',
      rut: '12.345.678-5',
      email: 'juan@ferrefix.cl',
      password: '1234567'
    });
    expect(passwordCorta.password).toContain('8 caracteres');
    expect(passwordCorta.nombre).toBeUndefined();
    expect(passwordCorta.email).toBeUndefined();

    const enElLimite = validarFormulario(REGLAS_REGISTRO, {
      nombre: 'Ana',
      rut: '12.345.678-5',
      email: 'ana@correo.cl',
      password: '12345678'
    });
    expect(Object.keys(enElLimite)).toHaveLength(0);

    const rutMalo = validarFormulario(REGLAS_REGISTRO, {
      nombre: 'Ana',
      rut: '12.345.678-9',
      email: 'ana@correo.cl',
      password: '12345678'
    });
    expect(rutMalo.rut).toBeTruthy();
  });
});
