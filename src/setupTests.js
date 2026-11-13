// Configuración común de los tests (Vitest + Testing Library).
import { configure } from '@testing-library/react';

// Espera por defecto de findBy*/waitFor: 1 s es poco si la máquina está ocupada (varias suites en paralelo).
configure({ asyncUtilTimeout: 5000 });
