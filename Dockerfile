# Etapa 1: compilar el front con Vite.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# La URL de la API se incrusta al COMPILAR y no tiene valor por defecto: sin ella, "npm run build" falla con un
# mensaje claro (ver vite.config.js). Uso: docker build --build-arg VITE_API_URL=http://<IP-DEL-BACKEND>:8080 .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: servir los archivos estáticos con nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q --spider http://127.0.0.1/ || exit 1
