// Test: useCarga: informa carga, resultado y error, vuelve a cargar al cambiar la clave y al reintentar, e ignora respuestas de una carga anterior
// Función: useCarga()

import { describe, test, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCarga } from '../hooks/useCarga.js';
import { diferido } from './helpers/fetchMock.js';

describe('useCarga', () => {
  test('Empieza cargando, entrega los datos y deja de cargar', async () => {
    const { result } = renderHook(() => useCarga(() => Promise.resolve([1, 2]), 'a'));
    expect(result.current.cargando).toBe(true);
    expect(result.current.datos).toBeNull();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.datos).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  test('Si la función falla (o lanza al ejecutarse) entrega el error y recargar lo reintenta', async () => {
    let falla = true;
    const { result } = renderHook(() =>
      useCarga(() => (falla ? Promise.reject(new Error('sin red')) : Promise.resolve('ok')), 'b')
    );
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error.message).toBe('sin red');
    expect(result.current.datos).toBeNull();

    falla = false;
    act(() => result.current.recargar());
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.datos).toBe('ok'));
    expect(result.current.error).toBeNull();

    const { result: lanzador } = renderHook(() => useCarga(() => { throw new Error('boom'); }, 'c'));
    await waitFor(() => expect(lanzador.current.error?.message).toBe('boom'));
  });

  test('Al cambiar la clave vuelve a cargar de inmediato y descarta la respuesta tardía de la clave anterior', async () => {
    const lenta = diferido();
    const { result, rerender } = renderHook(({ clave }) => useCarga(() => (clave === 'lenta' ? lenta.promesa : Promise.resolve('rapida')), clave), {
      initialProps: { clave: 'lenta' }
    });
    rerender({ clave: 'rapida' });
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.datos).toBe('rapida'));
    await act(async () => lenta.resolver('LENTA'));
    expect(result.current.datos).toBe('rapida');
  });

  test('"ultimos" conserva el último resultado bueno mientras se recarga (la lista no desaparece de la pantalla)', async () => {
    let n = 0;
    const { result } = renderHook(() => useCarga(() => Promise.resolve(`lista-${(n += 1)}`), 'x'));
    expect(result.current.ultimos).toBeNull();
    await waitFor(() => expect(result.current.datos).toBe('lista-1'));
    act(() => result.current.recargar());
    expect(result.current.cargando).toBe(true);
    expect(result.current.datos).toBeNull();
    expect(result.current.ultimos).toBe('lista-1');
    await waitFor(() => expect(result.current.datos).toBe('lista-2'));
    expect(result.current.ultimos).toBe('lista-2');
  });
});
