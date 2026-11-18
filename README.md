# Padel Check — Frontend

Aplicación web para **gestión de torneos de pádel en clubes**: landing pública, autenticación y área de aplicación protegida (dashboard y secciones de torneos, categorías, jugadores, etc.).

## Requisitos

- **Node.js** 18+ (recomendado LTS)
- **npm** (el repo incluye `package-lock.json`)

## Stack tecnológico

| Área | Tecnología |
|------|------------|
| Runtime / UI | [React 18](https://react.dev/) |
| Lenguaje | [TypeScript](https://www.typescriptlang.org/) (modo estricto) |
| Build & dev server | [Vite 5](https://vitejs.dev/) |
| Estilos | [Tailwind CSS 3](https://tailwindcss.com/) + [PostCSS](https://postcss.org/) + [Autoprefixer](https://github.com/postcss/autoprefixer) |
| Enrutado | [React Router 6](https://reactrouter.com/) |
| Datos remotos / caché | [TanStack Query (React Query) 5](https://tanstack.com/query) |
| Formularios | [React Hook Form](https://react-hook-form.com/) |
| Validación | [Zod](https://zod.dev/) + [@hookform/resolvers](https://github.com/react-hook-form/resolvers) |
| Componentes primitivos | [Radix UI — Slot](https://www.radix-ui.com/primitives/docs/utilities/slot) |
| Utilidades de clases | [class-variance-authority (CVA)](https://cva.style/docs), [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| Iconos | [Lucide React](https://lucide.dev/) |
| Lint | [ESLint 9](https://eslint.org/) + [typescript-eslint](https://typescript-eslint.io/) + plugins React Hooks y React Refresh |

Patrón de UI alineado con enfoques tipo **shadcn/ui** (composición con Slot, variantes con CVA, clases con `tailwind-merge`).

## Estructura del código (`src/`)

- **`routes/`** — Definición de rutas, `ProtectedRoute` y router principal.
- **`context/`** — Estado global de autenticación (`AuthContext`).
- **`features/`** — Módulos por dominio:
  - `public/` — Landing, precios, FAQ, layout y componentes compartidos.
  - `auth/` — Login, registro y API de login.
  - `app/` — Layout de la app (sidebar, topbar), dashboard.
- **`lib/`** — Cliente HTTP (`api-client`), helpers (`utils`, `auth`), constantes y rutas nombradas.
- **`types/`** — Tipos compartidos (p. ej. auth).
- **`styles/`** — Estilos globales (Tailwind + variables).

Alias de importación: **`@/`** apunta a `src/` (configurado en Vite y TypeScript).

## Variables de entorno

Copiá `.env.example` a `.env` y ajustá según tu entorno:

| Variable | Descripción |
|----------|-------------|
| `VITE_API_BASE_URL` | URL base del backend (p. ej. `http://localhost:8080/api`). Si no está definida, el cliente usa el prefijo relativo `/api` (útil con el proxy de Vite en desarrollo). |

Vite solo expone al cliente variables que empiezan con `VITE_`.

## Scripts npm

```bash
npm install          # dependencias
npm run dev          # servidor de desarrollo (Vite, puerto 5173 por defecto)
npm run build        # chequeo TypeScript + build de producción
npm run preview      # sirve el build localmente
npm run lint         # ESLint sobre el proyecto
```

## Desarrollo y API

En **`vite.config.ts`** el servidor de desarrollo:

- Escucha en el **puerto 5173** (por defecto de Vite).
- Proxifica **`/api`** hacia **`http://localhost:8080`**, de modo que las peticiones al mismo origen lleguen al backend sin CORS en local.

El cliente (`src/lib/api-client.ts`) envía `Authorization: Bearer <token>` cuando hay sesión, usa `credentials: 'include'` y construye URLs con `API_BASE` definido en `src/lib/constants.ts`.

## Build de producción

`npm run build` genera los estáticos en `dist/`. Para producción, configurá `VITE_API_BASE_URL` al endpoint real del API si no usás el mismo origen que el frontend.

### Retorno de Checkout Pro

El dominio asociado en mobile es `padelcheck-fe.pages.dev`. El build genera los archivos de asociación en `dist/.well-known/` con los identificadores públicos del binario que se va a distribuir. Configurá `VITE_ANDROID_APP_LINK_SHA256` con las huellas SHA-256 de firma de Android, separadas por coma, y `VITE_IOS_APP_LINK_ID` con el identificador firmado de iOS (por ejemplo, `TeamID.BundleID`). Publicá los archivos en ese mismo dominio.

Cloudflare Pages sirve los archivos existentes directamente y aplica su fallback de SPA a las rutas de React Router. Conservá el build sin un `404.html` de nivel raíz ni una reescritura general que sustituya los archivos de asociación por `index.html`.

Una vez disponible `https://padelcheck-fe.pages.dev/billing/return`, configurá esa URL en `MP_CHECKOUT_RETURN_URL` del servicio. Aplica a las nuevas preferencias de Checkout Pro. La página permite volver a la app o seguir al panel en el navegador cuando el sistema no abre la app directamente.

## Idioma y metadatos

La app está orientada al **español** (`index.html` usa `lang="es"`). El título por defecto refleja el producto: gestión de torneos para clubes.

## Licencia y versión

Proyecto **privado** (`private: true` en `package.json`). Versión actual del paquete: **0.1.0**.

## HTTP y ambientes

Configuración local/validación, contrato de errores, cancelación y pruebas: [docs/http-environments.md](docs/http-environments.md).
