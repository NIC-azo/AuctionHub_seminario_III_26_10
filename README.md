# AuctionHub

AuctionHub es un proyecto de subastas con frontend React + TypeScript, backend Node.js + Express + Prisma y PostgreSQL. El entorno de desarrollo se orquesta con Docker Compose y puede abrirse desde VS Code mediante Dev Containers.

> **Estado del proyecto:** PostgreSQL está accesible desde pgAdmin y los servicios de observabilidad están levantados en el entorno local comprobado. Backend y frontend todavía no inician correctamente porque Docker Desktop no expone los archivos del workspace montados desde `F:` dentro de sus contenedores. El error reportado es que no se encuentra `package.json` en `/app`; no lo causa que falte un servidor Express en `index.ts`.

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
| `docker-compose.yml` | Define PostgreSQL, MinIO, inicialización del bucket, backend, frontend, cAdvisor, Prometheus y Grafana. Declara puertos, dependencias, health check de PostgreSQL, volúmenes y etiquetas comunes. MinIO y su cliente `mc` usan imágenes de `quay.io/minio`. |
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

## Preparar el entorno en una computadora

1. Obtén el repositorio y abre su carpeta en VS Code.
2. Copia las plantillas a archivos locales. En PowerShell, desde la raíz del proyecto:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

3. Edita `.env`, `backend/.env` y `frontend/.env` con los valores adecuados para esa computadora. Usa secretos distintos y seguros; no reutilices literalmente los marcadores de ejemplo.
   - En el `.env` raíz, `DB_USER`, `DB_PASSWORD` y `DB_NAME` configuran la base creada por PostgreSQL. Los mismos usuario, contraseña y base deben corresponder a la `DATABASE_URL` local de `backend/.env`.
   - `JWT_SECRET` debe coincidir entre la configuración usada por Compose y la que necesita el backend. `HASH_SALT` se configura en `backend/.env`.
   - `VITE_API_URL` debe apuntar a la URL que el navegador usa para acceder al backend, normalmente `http://localhost:3000/api`.
   - Si un puerto ya está ocupado, cambia el valor correspondiente en el `.env` raíz.
4. Verifica los archivos privados: `.env` y sus variantes están ignorados por Git. Comparte únicamente las plantillas `.env.example`, nunca los secretos reales.
5. Asegúrate de que Docker Desktop esté iniciado y ejecuta **Dev Containers: Reopen in Container** desde la paleta de comandos de VS Code (`Ctrl+Shift+P`).

Dev Containers construye las imágenes de desarrollo y arranca los servicios de Compose. La primera preparación puede tardar porque Docker descarga imágenes e instala las dependencias dentro de los contenedores. El workspace se abre en `/workspace`; el backend trabaja en `/app` y el frontend en `/app` dentro de sus respectivos servicios.

### Nota para Docker Desktop en Windows

Los bind mounts deben mostrar los archivos de `backend/` y `frontend/` dentro de `/app`. Si los contenedores informan que no encuentran `package.json` aunque sí exista en Windows, verifica que Docker Desktop tenga acceso a la unidad del proyecto. Si persiste, usa el repositorio dentro del sistema de archivos Linux de WSL2 y abre esa copia desde VS Code conectado a WSL; no borres los volúmenes ni cambies los Dockerfiles para ocultar el problema.

El servicio Prometheus incluye su configuración en la imagen mediante `observability/prometheus/Dockerfile`, en vez de montarla como archivo desde Windows. Esto evita que el origen del bind mount de `prometheus.yml` se interprete como directorio.

## Estado actual de servicios y direcciones locales

Los puertos publicados se definen en el `.env` raíz. Estado comprobado en Docker Desktop:

| Servicio | Dirección/puertos | Estado observado |
|---|---|---|
| Frontend | `http://localhost:5173` | Detenido; pnpm no encuentra `package.json` en `/app`. |
| Backend | `http://localhost:3000` | No inicia; pnpm no encuentra `package.json` en `/app`. `backend/src/index.ts` también requiere implementar el servidor Express antes de que exista una API funcional. |
| PostgreSQL | `localhost:5433` desde Windows; `postgres:5432` dentro de Compose | En ejecución y saludable; la base `auctionhub` aparece en pgAdmin. |
| MinIO API | `http://localhost:9000` | Pendiente; en este equipo las descargas de Quay devolvieron `401 UNAUTHORIZED`. |
| MinIO Console | `http://localhost:9001` | Pendiente mientras MinIO no inicie. |
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

Compose usa `quay.io/minio/minio:latest` y `quay.io/minio/mc:latest`, adaptado del Compose de otro proyecto del usuario. En este equipo, las descargas devolvieron `401 UNAUTHORIZED`; por ello MinIO y `minio-init` no iniciaron, y el backend también depende de la finalización exitosa de `minio-init`. Que PostgreSQL se vea en pgAdmin no depende de Express ni de MinIO.

## Base de datos y Prisma

El esquema está en `backend/prisma/schema.prisma`. Cuando el backend esté disponible, crea una migración inicial desde PowerShell:

```powershell
docker compose exec backend pnpm run prisma:migrate -- --name init
```

Para un cambio posterior del esquema, usa el mismo comando con un nombre descriptivo distinto, por ejemplo `--name add_auction_fields`. Las migraciones se guardan en `backend/prisma/migrations` y deben versionarse junto con el código. Compose genera el cliente Prisma al iniciar el backend.

Para ver PostgreSQL en pgAdmin no es necesario ejecutar Prisma Studio; pgAdmin se conecta directamente al servicio publicado en `localhost`.

## Desarrollo y recarga de cambios

Compose pretende montar el código local dentro de los contenedores y mantiene las dependencias en volúmenes Docker separados. **En el estado observado, backend y frontend no arrancan:** Docker Desktop ve los directorios del disco `F:` pero no sus archivos dentro de `/app`. Los logs muestran `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` (`No package.json ... found in "/app"`). El montaje sobre `/app` oculta los archivos de la imagen, así que pnpm no puede leer los manifiestos.

No es un error causado por la ausencia de Express escuchando en el puerto. El orden es: primero Docker debe exponer `package.json` en `/app`, luego pnpm ejecuta scripts; después el backend necesitará que `src/index.ts` configure Express y escuche el puerto. Frontend y backend no deben considerarse accesibles en `5173` y `3000` hasta confirmar que los contenedores están `Up`.

La corrección recomendada para el problema de montaje es ubicar una copia de trabajo del repositorio dentro del sistema de archivos Linux de WSL2 y abrirla en VS Code conectado a WSL. Alternativamente, comprobar que Docker Desktop permite compartir la unidad `F:`. No borres volúmenes para resolverlo.

Cuando los montajes funcionen, los watchers previstos son:

- **Backend:** `pnpm dev` ejecuta `tsx watch src/index.ts`; al guardar cambios TypeScript, el proceso del backend reinicia automáticamente. El polling ayuda a detectar cambios del sistema de archivos en Docker.
- **Frontend:** Vite escucha en `0.0.0.0:5173`; `DOCKER_DEV=true` activa polling y Vite aplica HMR al guardar componentes, estilos y otros módulos compatibles.
- Guardar código **no reconstruye ni reinicia todo el contenedor**: los watchers actualizan la aplicación. Cambios en Dockerfiles, `docker-compose.yml` o dependencias sí pueden requerir reconstruir/recrear servicios.
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
