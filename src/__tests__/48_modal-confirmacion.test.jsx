// Test: Modal de confirmación: explica la consecuencia, confirma o cancela, se bloquea mientras procesa y muestra el error sin cerrarse
// Función: ModalConfirmacion()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import ModalConfirmacion from '../components/ModalConfirmacion.jsx';

const montar = (extra = {}) => {
  const props = { titulo: '¿Eliminar producto?', mensaje: <>Se eliminará <strong>"Taladro"</strong>.</>, textoConfirmar: 'Eliminar', onConfirmar: vi.fn(), onCancelar: vi.fn(), ...extra };
  render(<ModalConfirmacion {...props} />);
  return props;
};

describe('ModalConfirmacion', () => {
  afterEach(() => cleanup());

  test('es un diálogo accesible con su título y el mensaje de la consecuencia', () => {
    montar();
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar producto?' });
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText(/Se eliminará/)).toBeTruthy();
  });

  test('Confirmar y Cancelar llaman a su callback', () => {
    const props = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(props.onConfirmar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onCancelar).toHaveBeenCalledTimes(1);
  });

  test('mientras procesa deshabilita ambos botones y lo indica', () => {
    montar({ procesando: true });
    expect(screen.getByRole('button', { name: 'Procesando…' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(true);
  });

  test('si la acción falló muestra el error dentro del modal y los botones vuelven a estar disponibles', () => {
    montar({ error: 'No pudimos confirmar la operación; revisa la lista antes de volver a intentar' });
    expect(screen.getByRole('alert').textContent).toBe('No pudimos confirmar la operación; revisa la lista antes de volver a intentar');
    expect(screen.getByRole('button', { name: 'Eliminar' }).disabled).toBe(false);
  });
});
