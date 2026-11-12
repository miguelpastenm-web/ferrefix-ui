![Ferrefix](/public/banner-web.webp)

Tienda online de Ferrefix para la venta de productos de ferretería, con navegación simple, diseño responsivo y una experiencia de compra clara, pensada para facilitar la búsqueda y selección de productos desde cualquier dispositivo.

## Tecnologías

- **React + Vite**
- **Bootstrap 5** (Responsividad & Framework)
- **Bootstrap Icons**
- **React Router Dom**
- **CSS nativo** (`src/index.css`)

## Instalación

```bash
npm install
npm run dev

## Configuración de la API

El front consume el backend de Ferrefix (Spring Boot). La URL se define con `VITE_API_URL`:

```bash
cp .env.example .env        # ajusta VITE_API_URL (por defecto http://localhost:8080)
npm run dev
```

- Desarrollo, tests y cobertura usan `http://localhost:8080` si no está definida.
- **El build de producción exige la variable** (se incrusta al compilar): `VITE_API_URL=http://<ELASTIC_IP>:8080 npm run build`.
- Tests: `npm test`. Cobertura (texto, HTML en `coverage/` y `coverage/coverage-summary.json`): `npm run test:coverage`.
