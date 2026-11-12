import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import productosUpload from "./vite-plugin-productos-upload.js"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // La URL de la API se incrusta en el bundle al compilar. En el build de PRODUCCIÓN es obligatoria: sin ella el
  // sitio publicado apuntaría a localhost. Desarrollo (npm run dev), tests y cobertura no la exigen (tienen valor por defecto).
  if (command === "build" && mode === "production") {
    const env = loadEnv(mode, process.cwd(), "VITE_")
    if (!env.VITE_API_URL || !env.VITE_API_URL.trim()) {
      throw new Error(
        "\n\n[Ferrefix] Falta VITE_API_URL para compilar en modo production.\n" +
        "Defínela al compilar, por ejemplo:\n" +
        "    VITE_API_URL=http://<ELASTIC_IP>:8080 npm run build\n" +
        "o créala en un archivo .env (copia .env.example). Ver README.\n"
      )
    }
  }

  return {
    plugins: [react(), productosUpload()],
    test: {
      environment: "jsdom",
      globals: true,
      // Holgura para equipos lentos o con varias suites en paralelo (los formularios con ~350 comunas pesan en jsdom)
      testTimeout: 15000,
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        include: [
          "src/api/**",
          "src/context/**",
          "src/hooks/**",
          "src/utils/**",
          "src/data/**",
          "src/components/**",
          "src/pages/**"
        ],
        exclude: ["src/main.jsx", "src/App.jsx"]
      }
    },
  }
})
