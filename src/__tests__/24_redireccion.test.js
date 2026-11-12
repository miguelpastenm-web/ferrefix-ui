// Test: Redirecciones seguras: el parámetro next solo acepta rutas internas y cada rol tiene su página inicial
// Función: rutaInternaSegura(), rutaInicialPorRol()

import { describe, test, expect } from 'vitest';
import { rutaInternaSegura, rutaInicialPorRol } from '../utils/redireccion.js';

describe('rutaInternaSegura', () => {
  test.each([
    ['/carrito', '/carrito'],
    ['/admin?tab=ordenes', '/admin?tab=ordenes'],
    ['/catalogo#ofertas', '/catalogo#ofertas'],
    ['  /cuenta  ', '/cuenta']
  ])('acepta la ruta interna %s', (entrada, esperado) => {
    expect(rutaInternaSegura(entrada, '/x')).toBe(esperado);
  });

  test.each([
    ['//malo.example'],
    ['///malo.example'],
    ['/\\malo.example'],
    ['https://malo.example'],
    ['http://malo.example/x'],
    ['javascript:alert(1)'],
    ['data:text/html,x'],
    ['carrito'],
    ['/a\\b'],
    ['/a\nb'],
    ['/a\tb'],
    ['/login'],
    ['/LOGIN'],
    ['/Registro'],
    ['/LogIn/'],
    ['/%6Cogin'],
    ['/%zz'],
    ['/login?next=/admin'],
    ['/registro'],
    [''],
    [null],
    [undefined],
    [42]
  ])('rechaza %j y devuelve el valor por defecto', (entrada) => {
    expect(rutaInternaSegura(entrada, '/x')).toBe('/x');
  });

  test('el valor por defecto es "/" si no se indica', () => {
    expect(rutaInternaSegura('https://malo.example')).toBe('/');
  });
});

describe('rutaInicialPorRol', () => {
  test('ADMIN va al panel; CLIENTE o sin roles, al catálogo', () => {
    expect(rutaInicialPorRol(['ADMIN'])).toBe('/admin');
    expect(rutaInicialPorRol(['CLIENTE'])).toBe('/catalogo');
    expect(rutaInicialPorRol()).toBe('/catalogo');
  });
});
