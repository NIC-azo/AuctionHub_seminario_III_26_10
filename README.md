# AuctionHub

AuctionHub es un proyecto de subastas con frontend React + TypeScript, backend Node.js + Express + Prisma y PostgreSQL. El entorno de desarrollo se orquesta con Docker Compose; el flujo recomendado en Windows sincroniza las fuentes con Compose Watch.

> **Estado del proyecto:** `docker compose up --build -d` levanta MinIO, PostgreSQL, el inicializador del bucket, cAdvisor, Prometheus, Grafana, backend y frontend. Compose Watch sincroniza al contenedor los cambios de las fuentes seleccionadas del host. El backend ya expone Express, autenticación JWT y rutas de productos; para usar las rutas que acceden a datos primero se debe aplicar la migración Prisma inicial.

## Requisitos

- Git.
- Docker Desktop iniciado y con soporte para Docker Compose.
- Visual Studio Code para editar el proyecto localmente.
- Opcional: pgAdmin 4 instalado en Windows para administrar PostgreSQL con interfaz gráfica.

No es necesario instalar Node.js, pnpm ni dependencias JavaScript en Windows para el flujo con Compose Watch. Las dependencias se instalan dentro de las imágenes Docker.

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
| `.devcontainer/devcontainer.json` | Configuración heredada de Dev Containers. No se usa en el flujo recomendado de Compose Watch desde la unidad USB. |

### Backend

| Archivo | Responsabilidad |
|---|---|
| `backend/package.json` | Dependencias y scripts pnpm: `dev` usa `tsx watch`, `build` compila TypeScript, `start:prod` ejecuta `dist/index.js`, y hay scripts para generar Prisma, migrar y abrir Prisma Studio. Prisma, `@prisma/client` y `@prisma/adapter-pg` están fijados en `6.19.3`; `pg` proporciona el pool PostgreSQL; AWS S3 SDK y Multer gestionan imágenes. |
| `backend/.env.example` | Plantilla de configuración para ejecución local del backend. Su URL de ejemplo usa `localhost:5433`; Compose la reemplaza por la dirección interna `postgres:5432` al ejecutar el backend en Docker. |
| `backend/.env` | Variables privadas locales del backend. No subir a Git. |
| `backend/Dockerfile.dev` | Imagen de desarrollo Node/pnpm; habilita polling y ejecuta el modo `tsx watch` al iniciarse mediante Compose. |
| `backend/Dockerfile` | Imagen multietapa de producción: instala dependencias, genera el cliente Prisma, compila TypeScript y ejecuta el resultado compilado. |
| `backend/.dockerignore` | Evita incluir archivos locales, dependencias y artefactos en el contexto de build. |
| `backend/tsconfig.json` | Configura TypeScript para Node.js, modo estricto, salida `dist` y alias `@/*`. |
| `backend/prisma/schema.prisma` | Define el datasource PostgreSQL, el generador del cliente Prisma y los modelos `User`, `Product` y `Purchase`. |
| `backend/src/config/prisma.ts` | Carga las variables de entorno, conecta PostgreSQL mediante `pg.Pool` y `PrismaPg`, y exporta un cliente Prisma singleton para el backend. |
| `backend/src/models/` | Acceso a datos con operaciones CRUD de Prisma para usuarios, productos y compras. |
| `backend/src/services/` | Casos de uso de autenticación/productos, carga de imágenes en MinIO y middleware de Multer. |
| `backend/src/controllers/` y `backend/src/routes/` | Validan las peticiones HTTP, devuelven respuestas JSON y conectan los endpoints con los servicios. |
| `backend/src/middlewares/` | Verifica JWT y convierte errores en respuestas JSON estructuradas. |
| `backend/src/index.ts` | Configura CORS y JSON, monta las rutas `/api`, expone health check y escucha en el puerto configurado. |

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
- `.devcontainer/devcontainer.json`: configuración heredada; no abrir el contenedor como workspace al usar Compose Watch desde `E:`.
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
5. Asegúrate de que Docker Desktop esté iniciado. Desde PowerShell en la raíz del proyecto, inicia todos los servicios y la sincronización automática:

   ```powershell
   docker compose up --build --watch
   ```

   Deja ese terminal abierto mientras trabajas: Compose Watch sincroniza los cambios del host al contenedor. Si prefieres servicios en segundo plano, usa dos terminales:

   ```powershell
   # Terminal 1: iniciar servicios en segundo plano
   docker compose up --build -d

   # Terminal 2: iniciar el observador
   docker compose watch --no-up
   ```

   `--build` instala las dependencias dentro de las imágenes, sin crear `node_modules` en Windows. Con el modo adjunto, `Ctrl+C` detiene los servicios; en el modo de dos terminales, `Ctrl+C` detiene el observador y deja los servicios activos. Revisa el estado con `docker compose ps -a`.
6. Abre y edita el proyecto directamente en VS Code desde la carpeta de Windows `E:`. No uses **Dev Containers: Reopen in Container** para este flujo: el bind mount del workspace interfiere con Compose Watch.

### Nota para Docker Desktop en Windows

En esta computadora Docker Desktop creó los bind mounts desde `E:` sin exponer los archivos que contienen `package.json`; montarlos sobre `/app` ocultaba el código de la imagen y provocaba `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`. Por eso Compose conserva el código inicial del build dentro de `/app` y usa **Compose Watch** para sincronizar selectivamente fuentes desde el proyecto en `E:`. Así no se monta la carpeta USB completa sobre `/app` ni se crean dependencias en el USB.

La carpeta de Windows abierta en VS Code es la fuente de verdad. Compose Watch sincroniza en una sola dirección: host → contenedor. El servicio backend ya no monta el proyecto completo en `/workspace`, porque ese bind mount impedía observar `backend/src`; por ello, el modo Dev Container no forma parte del flujo USB actual. No copies ni edites los archivos en `/app` esperando que vuelvan al USB. Si se desea trabajar dentro de Dev Containers, primero hay que preparar un flujo separado desde una copia en el sistema de archivos Linux de WSL2.

El servicio Prometheus incluye su configuración en la imagen mediante `observability/prometheus/Dockerfile`, en vez de montarla como archivo desde Windows. Esto evita que el origen del bind mount de `prometheus.yml` se interprete como directorio.

## Estado actual de servicios y direcciones locales

Los puertos publicados se definen en el `.env` raíz. Estado comprobado en Docker Desktop:

| Servicio | Dirección/puertos | Estado observado |
|---|---|---|
| Frontend | `http://localhost:5173` | Vite responde HTTP 200; Compose Watch sincroniza `frontend/src`, `public`, `index.html` y configuraciones seleccionadas. |
| Backend | `http://localhost:3000` | `tsx watch` ejecuta el backend y Compose Watch sincroniza `backend/src`. La API aún no está disponible hasta implementar el servidor Express en `backend/src/index.ts`. |
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

Compose usa `quay.io/minio/minio:latest` para el servidor. Como Quay devolvía `401 UNAUTHORIZED` para `quay.io/minio/mc:latest`, `minio-init` ahora usa la imagen pública `amazon/aws-cli:2.27.49` y se conecta a MinIO por el endpoint S3 `http://minio:9000`. Comprueba que MinIO responda, crea el bucket configurado si aún no existe, aplica lectura pública a los objetos del bucket para servir imágenes y termina con código 0; el backend espera que termine ese inicializador. El bucket se define mediante `MINIO_BUCKET` en `.env` raíz (la plantilla propone `auction-products`). Es un contenedor de tarea única, no un servicio persistente: después de crear/verificar el bucket, `Exited (0)` y el icono de detenido en Docker Desktop son el estado correcto.

## Base de datos y Prisma

El esquema está en `backend/prisma/schema.prisma`. Cuando el backend esté disponible, crea una migración inicial desde PowerShell:

```powershell
docker compose exec backend pnpm run prisma:migrate -- --name init
```

Para un cambio posterior del esquema, usa el mismo comando con un nombre descriptivo distinto, por ejemplo `--name add_auction_fields`. Las migraciones se guardan en `backend/prisma/migrations` y deben versionarse junto con el código. Compose genera el cliente Prisma al iniciar el backend.

La conexión de la aplicación se exporta como singleton desde `backend/src/config/prisma.ts`: el módulo carga `.env` al ejecutar localmente, requiere `DATABASE_URL` y conecta Prisma 6.19.3 mediante `@prisma/adapter-pg` y un `pg.Pool`. En Compose, `DATABASE_URL` se inyecta con el hostname interno `postgres`; no copies las credenciales de una computadora al código fuente.

Para ver PostgreSQL en pgAdmin no es necesario ejecutar Prisma Studio; pgAdmin se conecta directamente al servicio publicado en `localhost`.

## API del backend

Las rutas de autenticación son `POST /api/auth/register` y `POST /api/auth/login`. El registro recibe JSON con `username`, `email` y `password`; el inicio de sesión recibe `email` y `password`, y devuelve un JWT con una hora de vigencia.

`GET /api/products` lista productos disponibles. `POST /api/products` requiere `Authorization: Bearer <token>` y `multipart/form-data` con `title`, `description`, `price` e imagen en el campo `image` (JPEG, PNG o WebP; máximo 5 MB). El backend almacena la imagen en el bucket de MinIO configurado y persiste su URL pública con el producto. `POST /api/products/:id/buy` requiere JWT; marca el producto como vendido y registra la compra dentro de una transacción Prisma, con actualización condicional para evitar compras simultáneas. El vendedor no puede comprar su propio producto.

Las respuestas exitosas usan `{ "data": ... }` y los errores `{ "error": { "code": ..., "message": ... } }`. `GET /api/health` es un health check de la API. Para ejecutar fuera de Compose, configura en `backend/.env` las credenciales MinIO, `MINIO_ENDPOINT`, `MINIO_BUCKET` y `MINIO_PUBLIC_ENDPOINT`; por defecto la URL pública usa `http://localhost:9000`. Ajusta `MINIO_PUBLIC_ENDPOINT` si el frontend accederá desde otro host.

## Desarrollo y recarga de cambios

Las imágenes de desarrollo instalan dependencias con `RUN pnpm install` durante el build y copian una versión inicial del código con `COPY . .`. No se montan `node_modules` ni las carpetas `backend/` y `frontend/` del USB sobre `/app`: las dependencias quedan dentro del contenedor y Compose Watch envía los cambios seleccionados desde el host.

Inicia la observación desde la raíz con `docker compose up --build --watch`. Para servicios en segundo plano, ejecuta `docker compose up --build -d` y después `docker compose watch --no-up` en una terminal que mantengas abierta. El observador sincroniza los archivos desde Windows a `/app`; no sincroniza modificaciones hechas directamente dentro del contenedor de regreso al USB.

Los Dockerfiles distinguen desarrollo y producción:

- **Backend:** Compose Watch sincroniza `backend/src` a `/app/src`; `tsx watch src/index.ts` detecta la actualización y reinicia el proceso.
- **Prisma:** un cambio de `backend/prisma/schema.prisma` se sincroniza y ejecuta `pnpm prisma:generate` en el contenedor. La migración de base de datos continúa siendo manual.
- **Frontend:** Compose Watch sincroniza `frontend/src`, `public`, `index.html` y configuraciones seleccionadas. Vite escucha en `0.0.0.0:5173`, usa polling en Docker y aplica HMR.
- En las rutas de desarrollo, las dependencias se instalan durante el build (`RUN pnpm install`) y el `CMD` ejecuta `pnpm dev`. En el Dockerfile de producción del frontend, pnpm se usa en la etapa de build y el `CMD` del runtime ejecuta Nginx para servir el resultado estático.
- Cambios en `package.json`, `tsconfig.json` o `Dockerfile.dev` reconstruyen la imagen. Se eliminaron los volúmenes nombrados de `node_modules`, que ocultarían las dependencias actualizadas tras un rebuild.
- El proyecto no tiene `pnpm-lock.yaml` versionados todavía; si se añaden, se deben agregar reglas Watch de rebuild para esos archivos.
- Compose Watch es unidireccional (host → contenedor). Los archivos generados dentro del contenedor —por ejemplo las nuevas carpetas de migración Prisma— no aparecen automáticamente en el USB; hay que copiarlos a la fuente de trabajo antes de versionarlos.
- Para Compose Watch desde el USB, abre la carpeta local en VS Code y deja activa una de las modalidades de observación indicadas arriba. El watcher no crea `node_modules` en Windows.

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
