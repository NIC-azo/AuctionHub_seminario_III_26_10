# AuctionHub

AuctionHub es un proyecto de subastas con frontend React + TypeScript, backend Node.js + Express + Prisma y PostgreSQL. El entorno de desarrollo se orquesta con Docker Compose y puede abrirse desde VS Code mediante Dev Containers.

> **Estado del proyecto:** `docker compose up --build -d` levanta MinIO, PostgreSQL, el inicializador del bucket, cAdvisor, Prometheus, Grafana, backend y frontend. En el entorno comprobado, los bind mounts desde la unidad `E:` aparecen vacíos dentro de Docker Desktop; por eso backend y frontend usan el código copiado en sus imágenes y requieren reconstrucción para incorporar cambios del host. El proceso backend permanece en modo watch, pero `backend/src/index.ts` todavía no implementa el servidor Express/API.

## Requisitos

- Git.
- Docker Desktop iniciado y con soporte para Docker Compose.
- Visual Studio Code y la extensión **Dev Containers** para abrir el workspace dentro de un contenedor.
- Opcional: pgAdmin 4 instalado en Windows para administrar PostgreSQL con interfaz gráfica.

No es necesario instalar Node.js, pnpm ni dependencias JavaScript en Windows para el flujo con Dev Containers. Las dependencias se instalan dentro de las imágenes/volúmenes de Docker al preparar los servicios.

## Estructura del proyecto

```text
.
├── .devcontainer/
│   └── devcontainer.json
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   └── index.ts
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── index.html
│   ├── package.json
│   ├── tsconfig*.json
│   └── vite.config.ts
├── observability/
│   ├── grafana/dashboards/auctionhub-dashboard.json
│   └── prometheus/
│       ├── Dockerfile
│       └── prometheus.yml
├── scripts/
│   ├── backup.ps1
│   └── minio-init.ps1
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

### Archivos raíz y entorno de desarrollo

| Archivo | Responsabilidad |
|---|---|
| `docker-compose.yml` | Orquesta PostgreSQL, MinIO, inicialización del bucket, backend, frontend, cAdvisor, Prometheus y Grafana. Declara puertos, dependencias, health check de PostgreSQL, volúmenes y etiquetas comunes. La inicialización de MinIO usa AWS CLI con endpoint S3 compatible. Todos los servicios se incluyen en `docker compose up`. |
| `.env.example` | Plantilla versionable para variables que consume Compose: usuario/contraseña representativos de PostgreSQL, secretos de ejemplo, MinIO, Grafana y puertos. No contiene las credenciales reales de una computadora. |
| `.env` | Archivo local ignorado por Git para los valores reales de Compose. No debe compartirse ni subirse al repositorio. |
| `.gitignore` | Excluye dependencias, resultados de build, archivos locales y archivos `.env`. |
| `.devcontainer/devcontainer.json` | Indica a VS Code que use `docker-compose.yml`, abra el servicio `backend`, monte el proyecto como `/workspace`, reenvíe puertos y recomiende extensiones. |

### Backend

| Archivo | Responsabilidad |
|---|---|
| `backend/package.json` | Dependencias y scripts pnpm: `dev` usa `tsx watch`, `build` compila TypeScript, `start:prod` ejecuta `dist/index.js`, y hay scripts para generar Prisma, migrar y abrir Prisma Studio. Prisma y `@prisma/client` están fijados en `6.19.3`. |
| `backend/.env.example` | Plantilla de configuración para ejecución local del backend. Su URL de ejemplo usa `localhost:5433`; Compose la reemplaza por la dirección interna `postgres:5432` al ejecutar el backend en Docker. |
| `backend/.env` | Variables privadas locales del backend. No subir a Git. |
| `backend/Dockerfile.dev` | Imagen de desarrollo Node/pnpm; habilita polling y ejecuta el modo `tsx watch` al iniciarse mediante Compose. |
| `backend/Dockerfile` | Imagen multietapa de producción: instala dependencias, genera el cliente Prisma, compila TypeScript y ejecuta el resultado compilado. |
| `backend/.dockerignore` | Evita incluir archivos locales, dependencias y artefactos en el contexto de build. |
| `backend/tsconfig.json` | Configura TypeScript para Node.js, modo estricto, salida `dist` y alias `@/*`. |
| `backend/prisma/schema.prisma` | Define el datasource PostgreSQL, el generador del cliente Prisma y los modelos `User`, `Product` y `Purchase`. |
| `backend/src/` | Código de la API. `index.ts` es el punto de entrada actual, pero todavía debe implementar el servidor Express. La ausencia de esa implementación no produce el error de pnpm que indica que falta `package.json` en `/app`. |

### Frontend

| Archivo | Responsabilidad |
|---|---|
| `frontend/package.json` | Scripts de Vite, build con TypeScript, lint y dependencias de React, TanStack Query, Zustand, Axios, Lucide y Tailwind CSS. |
| `frontend/.env.example` | Plantilla para `VITE_API_URL`, dirección base de la API accesible desde el navegador. |
| `frontend/.env` | Configuración local del frontend. No subir a Git. |
| `frontend/Dockerfile.dev` | Imagen de desarrollo que inicia Vite en `0.0.0.0:5173` y activa `DOCKER_DEV` para observación de archivos en Docker. |
| `frontend/Dockerfile` | Imagen multietapa de producción que construye los archivos estáticos y los sirve con Nginx. |
| `frontend/.dockerignore` | Excluye dependencias, variables locales y artefactos de build del contexto Docker. |
| `frontend/vite.config.ts` | Configura React, Tailwind, host accesible desde Docker, polling condicional y alias `@` hacia `src`. |
| `frontend/tsconfig.json` | Configuración raíz de TypeScript que referencia las configuraciones de aplicación y Node. |
| `frontend/tsconfig.app.json` | Opciones de TypeScript para React y alias `@/*` hacia `src/*`. |
| `frontend/tsconfig.node.json` | Opciones de TypeScript para `vite.config.ts`. |
| `frontend/src/main.tsx` | Monta la aplicación React e importa los estilos globales. |
| `frontend/src/App.tsx` | Componente raíz de la interfaz. |
| `frontend/src/index.css` | Estilos globales e importación de Tailwind CSS. |
| `frontend/index.html` | Documento HTML inicial de Vite. |
| `frontend/public/` | Recursos estáticos servidos directamente por Vite. |

### Observabilidad y scripts

| Archivo | Responsabilidad |
|---|---|
| `observability/prometheus/Dockerfile` | Crea una imagen de Prometheus que copia `prometheus.yml` dentro de la imagen, evitando el montaje del archivo de configuración desde Windows. |
| `observability/prometheus/prometheus.yml` | Configura el scraping de Prometheus y cAdvisor. |
| `observability/grafana/dashboards/auctionhub-dashboard.json` | Dashboard de Grafana del proyecto. |
| `scripts/minio-init.ps1` | Script auxiliar de PowerShell para inicializar MinIO. |
| `scripts/backup.ps1` | Script auxiliar de PowerShell para respaldos. |

## Inventario y contenido de Dockerfiles, manifests y tsconfig

Este bloque deja a la vista las configuraciones que determinan cómo se instalan, compilan e inician los entornos. El `docker-compose.yml` de la raíz es el orquestador; no existe un Dockerfile único en la raíz porque backend y frontend tienen sus propias imágenes.

### Raíz

- `docker-compose.yml`: define los ocho servicios y arranca todos con `docker compose up --build`.
- `.devcontainer/devcontainer.json`: abre el servicio backend como workspace `/workspace`.
- No hay `package.json` ni `tsconfig.json` en la raíz; cada aplicación mantiene sus propios archivos.

### Backend

#### `backend/Dockerfile.dev`

```dockerfile
FROM node:22-alpine

WORKDIR /app

ENV CHOKIDAR_USEPOLLING=true

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
```

#### `backend/Dockerfile` (producción)

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN pnpm prisma:generate \
    && pnpm build \
    && pnpm prune --prod

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.33.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "start:prod": "node dist/index.js",
    "build": "tsc",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "6.19.3",
    "bcrypt": "^6.0.0",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/cors": "^2.8.19",
    "@types/dotenv": "^8.2.3",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^25.9.1",
    "prisma": "6.19.3",
    "tsx": "^4.22.4",
    "typescript": "~6.0.3"
  }
}
```

#### `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

### Frontend

#### `frontend/Dockerfile.dev`

```dockerfile
FROM node:22-alpine

WORKDIR /app

ENV DOCKER_DEV=true

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--", "--host", "0.0.0.0"]
```

#### `frontend/Dockerfile` (producción)

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .

ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### `frontend/package.json`

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.101.2",
    "axios": "^1.18.0",
    "lucide-react": "^1.61.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.1",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.19.2",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^10.13.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.7",
    "globals": "^17.13.0",
    "tailwindcss": "^4.3.1",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.71.2",
    "vite": "^8.3.4"
  }
}
```

#### `frontend/tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

#### `frontend/tsconfig.app.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "ignoreDeprecations": "6.0",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### `frontend/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Prometheus

#### `observability/prometheus/Dockerfile`

```dockerfile
FROM prom/prometheus:v3.5.0

COPY prometheus.yml /etc/prometheus/prometheus.yml
```

## Preparar el entorno en una computadora

1. Obtén el repositorio y abre su carpeta en VS Code.
2. Copia las plantillas a archivos locales. En PowerShell, desde la raíz del proyecto:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

3. Edita `.env`, `backend/.env` y `frontend/.env` con los valores adecuados para esa computadora. Usa secretos distintos y seguros; no reutilices literalmente los marcadores de ejemplo.
   - El `.env` raíz lo lee Docker Compose para interpolar las variables de PostgreSQL, MinIO, Grafana y puertos. Ahí se configuran `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `GRAFANA_ADMIN_PASSWORD` y los puertos publicados.
   - `backend/.env` se carga al servicio backend mediante `env_file`; contiene ajustes propios del backend, como `HASH_SALT`. Compose define `DATABASE_URL` para Docker con host `postgres:5432` y pasa `JWT_SECRET` desde el `.env` raíz. La URL local que se mantenga en `backend/.env` sirve cuando el backend se ejecuta fuera de Docker.
   - `frontend/.env` se carga al servicio frontend mediante `env_file` y configura `VITE_API_URL`, normalmente `http://localhost:3000/api` para las peticiones del navegador.
   - Si un puerto ya está ocupado, cambia el valor correspondiente en el `.env` raíz.
4. Verifica los archivos privados: `.env` y sus variantes están ignorados por Git. Comparte únicamente las plantillas `.env.example`, nunca los secretos reales.
5. Asegúrate de que Docker Desktop esté iniciado y, desde PowerShell en la raíz del proyecto, levanta todos los servicios:

   ```powershell
   docker compose up --build -d
   docker compose ps -a
   ```

   `--build` construye las imágenes de backend, frontend y Prometheus cuando sea necesario; dentro de las imágenes de desarrollo `RUN pnpm install` instala las dependencias, sin instalar Node/pnpm ni crear `node_modules` en Windows. `-d` deja los servicios en segundo plano y devuelve el control de PowerShell. Sin `-d`, Compose permanece conectado a los logs; `Ctrl+C` detiene los servicios adjuntos.
6. La configuración de Dev Containers está disponible para abrir el workspace con **Dev Containers: Reopen in Container** (`Ctrl+Shift+P`). En esta PC, el montaje del proyecto desde `E:` puede aparecer vacío dentro del contenedor; para editar con el código sincronizado, usa una copia alojada en el sistema de archivos Linux de WSL2 como se explica abajo.

Dev Containers construye las imágenes de desarrollo y arranca los servicios de Compose. La primera preparación puede tardar porque Docker descarga imágenes e instala las dependencias dentro de los contenedores. El backend y el frontend trabajan en `/app` dentro de sus respectivos servicios.

### Nota para Docker Desktop en Windows

En esta computadora Docker Desktop creó los bind mounts desde `E:` sin exponer los archivos que contienen `package.json`; montarlos sobre `/app` ocultaba el código que sí estaba en las imágenes y provocaba `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`. Por eso Compose conserva el código del build dentro de `/app` y no monta `backend/` ni `frontend/` desde Windows. Los servicios pueden iniciar, pero cambios hechos en el host necesitan un nuevo `docker compose up --build -d`. Para editar con hot reload desde el host, clona el repo en el sistema de archivos Linux de WSL2 y abre esa copia en VS Code conectado a WSL antes de habilitar los bind mounts de fuentes.

El servicio Prometheus incluye su configuración en la imagen mediante `observability/prometheus/Dockerfile`, en vez de montarla como archivo desde Windows. Esto evita que el origen del bind mount de `prometheus.yml` se interprete como directorio.

## Estado actual de servicios y direcciones locales

Los puertos publicados se definen en el `.env` raíz. Estado comprobado en Docker Desktop:

| Servicio | Dirección/puertos | Estado observado |
|---|---|---|
| Frontend | `http://localhost:5173` | Contenedor en ejecución; Vite responde HTTP 200. Usa el código de la imagen, porque el bind mount de `E:` se observó vacío. |
| Backend | `http://localhost:3000` | Contenedor y watcher en ejecución. La API aún no está disponible hasta implementar el servidor Express en `backend/src/index.ts`. |
| PostgreSQL | `localhost:5433` desde Windows; `postgres:5432` dentro de Compose | En ejecución y saludable; la base `auctionhub` aparece en pgAdmin. |
| MinIO API | `http://localhost:9000` | En ejecución; `/minio/health/live` respondió HTTP 200. |
| MinIO Console | `http://localhost:9001` | Publicada por el contenedor MinIO. |
| Inicializador MinIO | Servicio `minio-init` | Termina con código 0 tras comprobar MinIO y crear el bucket si no existía; es un servicio de una sola ejecución. |
| cAdvisor | `http://localhost:8081` | En ejecución y saludable. |
| Prometheus | `http://localhost:9090` | En ejecución; su configuración se copia en la imagen propia para evitar el bind mount de Windows. |
| Grafana | `http://localhost:3001` | En ejecución. El usuario configurado inicialmente es `admin`. |

El estado puede variar según la última operación de Docker. Compruébalo con `docker compose ps --all`.

### Puertos PostgreSQL: host y contenedor

Compose publica PostgreSQL con:

```yaml
ports:
  - "${POSTGRES_PORT:-5433}:5432"
```

El primer puerto (`POSTGRES_PORT`, configurado como `5433` en el `.env` local) pertenece a Windows; el segundo es el puerto interno de PostgreSQL en el contenedor y permanece en `5432`. Por eso:

- pgAdmin instalado en Windows usa `localhost:5433`.
- Backend ejecutado en Windows usa `localhost:5433` en su `DATABASE_URL`.
- Backend dentro de Compose usa `postgres:5432`, nombre y puerto internos de la red Docker.

El cambio a `5433` evita el PostgreSQL 18 instalado localmente, que ya ocupa `localhost:5432`. Se comprobó que la contraseña local permite conectar a la base `auctionhub` por `localhost:5433`.

### Conectar pgAdmin 4

Compose no incluye un contenedor de pgAdmin; se puede usar pgAdmin instalado en Windows para conectarse al PostgreSQL del contenedor:

1. Registra un servidor en pgAdmin.
2. En **Connection**, configura host `localhost`, puerto `5433`, base de mantenimiento `postgres` o `auctionhub`, usuario `DB_USER` y contraseña `DB_PASSWORD` del `.env` raíz.
3. Si cambiaste `POSTGRES_PORT`, usa ese puerto publicado en lugar de `5433`. El puerto interno del contenedor siempre es `5432`.

La base `auctionhub` fue verificada en pgAdmin. PostgreSQL crea la **base de datos** al inicializar por primera vez su volumen. Para crear las tablas de la aplicación también se debe aplicar la migración Prisma, después de que backend y MinIO puedan iniciar.

El puerto publicado predeterminado es `5433` porque PostgreSQL instalado directamente en Windows ocupa `5432`. Usa `localhost:5433` en pgAdmin para conectarte al contenedor; `localhost:5432` dirige al servidor local de Windows, que tiene credenciales y bases independientes. La contraseña del rol PostgreSQL se establece al inicializar el volumen por primera vez; editar `DB_PASSWORD` después no cambia automáticamente la contraseña almacenada en el volumen.

## MinIO y acceso al registro

Compose usa `quay.io/minio/minio:latest` para el servidor. Como Quay devolvía `401 UNAUTHORIZED` para `quay.io/minio/mc:latest`, `minio-init` ahora usa la imagen pública `amazon/aws-cli:2.27.49` y se conecta a MinIO por el endpoint S3 `http://minio:9000`. Comprueba que MinIO responda, crea el bucket configurado si aún no existe y termina con código 0; el backend espera que termine ese inicializador. Es un contenedor de tarea única, no un servicio persistente: después de crear/verificar el bucket, `Exited (0)` y el icono de detenido en Docker Desktop son el estado correcto. Los servicios backend y frontend dependen de su finalización exitosa.

## Base de datos y Prisma

El esquema está en `backend/prisma/schema.prisma`. Cuando el backend esté disponible, crea una migración inicial desde PowerShell:

```powershell
docker compose exec backend pnpm run prisma:migrate -- --name init
```

Para un cambio posterior del esquema, usa el mismo comando con un nombre descriptivo distinto, por ejemplo `--name add_auction_fields`. Las migraciones se guardan en `backend/prisma/migrations` y deben versionarse junto con el código. Compose genera el cliente Prisma al iniciar el backend.

Para ver PostgreSQL en pgAdmin no es necesario ejecutar Prisma Studio; pgAdmin se conecta directamente al servicio publicado en `localhost`.

## Desarrollo y recarga de cambios

Las imágenes de desarrollo instalan las dependencias con `RUN pnpm install` durante el build y copian el código con `COPY . .`. Compose mantiene dependencias en volúmenes nombrados, pero no monta los directorios del host sobre `/app`, porque las pruebas en esta computadora mostraron que Docker Desktop exponía esas rutas vacías y ocultaba `package.json`.

Por este motivo, los cambios locales a los archivos fuente no llegan al contenedor automáticamente en esta ubicación de Windows; después de editar se debe reconstruir el servicio (`docker compose up --build -d`). Para habilitar sincronización/hot reload desde el host, clona o mueve el proyecto al sistema de archivos Linux de WSL2 y abre esa carpeta desde VS Code conectado a WSL; luego se puede reactivar el montaje de fuentes.

Los Dockerfiles distinguen desarrollo y producción:

- **Backend:** `pnpm dev` ejecuta `tsx watch src/index.ts`; al guardar cambios TypeScript, el proceso del backend reinicia automáticamente. El polling ayuda a detectar cambios del sistema de archivos en Docker.
- **Frontend:** Vite escucha en `0.0.0.0:5173`; `DOCKER_DEV=true` activa polling y Vite aplica HMR al guardar componentes, estilos y otros módulos compatibles.
- En las rutas de desarrollo, las dependencias se instalan durante el build (`RUN pnpm install`) y el `CMD` ejecuta `pnpm dev`. En el Dockerfile de producción del frontend, pnpm se usa en la etapa de build y el `CMD` del runtime ejecuta Nginx para servir el resultado estático.
- En la configuración actual basada en imágenes, reconstruye el servicio después de cambiar código del host. Cambios en Dockerfiles, `docker-compose.yml` o dependencias también requieren reconstruir/recrear servicios.
- Cambios en `schema.prisma` requieren generar el cliente y, cuando se cambia el modelo de datos, crear y aplicar una migración.

Comandos útiles desde la raíz del proyecto:

```powershell
# Ver estado de servicios
docker compose ps

# Seguir logs del frontend y backend
docker compose logs -f backend frontend

# Detener servicios y conservar datos
docker compose stop

# Volver a iniciarlos
docker compose start
```

Los datos de PostgreSQL, MinIO, Grafana y Prometheus se guardan en volúmenes nombrados de Docker. Detener los servicios no elimina esos datos.

## Scripts disponibles

Desde el servicio backend:

| Script | Acción |
|---|---|
| `pnpm dev` | Ejecuta el backend con recarga (`tsx watch`). |
| `pnpm build` | Compila TypeScript a `dist`. |
| `pnpm start:prod` | Ejecuta `dist/index.js` en producción, después de compilar. |
| `pnpm prisma:generate` | Genera el cliente Prisma a partir del esquema. |
| `pnpm prisma:migrate` | Ejecuta `prisma migrate dev`; agrega `-- --name nombre` para nombrar una migración. |
| `pnpm prisma:studio` | Inicia Prisma Studio; para usarlo dentro de Docker también se debe publicar/conectar su puerto. |

Desde el servicio frontend:

| Script | Acción |
|---|---|
| `pnpm dev` | Inicia Vite. |
| `pnpm build` | Ejecuta el chequeo de TypeScript y genera el build de producción. |
| `pnpm lint` | Ejecuta ESLint. |
| `pnpm preview` | Sirve localmente el build de Vite para previsualización. |

## Git y secretos

El remoto del proyecto es `https://github.com/NIC-azo/AuctionHub_seminario_III_26_10.git`, en la rama `main`. Antes de sincronizar cambios entre computadoras, revisa `git status` y conserva los cambios locales que quieras mantener. No vuelvas a ejecutar `git init` en una carpeta que ya contiene `.git`.

No agregues ni publiques `.env`, `backend/.env` ni `frontend/.env`. Si Git informa `dubious ownership`, confirma que confías en la carpeta antes de agregar esa ruta como `safe.directory`.

## Alcance de validación

La configuración Compose se validó con `docker compose config --quiet` y los archivos JSON con el parser de JSON. No se debe interpretar esa validación como una prueba de que los servicios ya estén corriendo: el build de imágenes, las migraciones Prisma y la ejecución del hot reload deben probarse al iniciar el entorno en la computadora correspondiente.
