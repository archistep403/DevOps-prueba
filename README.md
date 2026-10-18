# StoreGo (React + Express + MySQL)

Tienda de consolas PlayStation con **React + Vite** en el frontend y una **API Express** que guarda todo en **MySQL**:
usuarios, productos (con galería de fotos), pedidos y su historial de seguimiento.

## Requisitos

- Node.js 18 o superior
- MySQL 5.7+ / 8.x (o MariaDB 10.4+) encendido

## Puesta en marcha

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# edita .env y pon tu contraseña de MySQL en DB_PASSWORD
npm run db:init             # crea la base "storego", las tablas y los datos iniciales
npm run dev:all             # web en http://localhost:5173 y API en http://localhost:3001
```

`npm run db:init` se puede repetir sin problema: solo crea lo que falta y actualiza bases antiguas (por ejemplo, agrega `pedidos.cliente_run` y lo completa en los pedidos ya hechos). También puedes ejecutar `server/schema.sql`
a mano en MySQL Workbench / phpMyAdmin (selecciona antes la base de datos).

Si prefieres dos terminales: `npm run dev` (web) y `npm run server` (API).

### Producción

```bash
npm run build
NODE_ENV=production JWT_SECRET=<texto-largo-aleatorio> npm start
```

Con `dist/` generado, la misma API entrega el sitio y atiende `/api` en un solo puerto. Usa HTTPS delante (las contraseñas viajan en la petición de login).

## Cuentas de prueba (se crean solo si no hay ningún usuario)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@duoc.cl | admin123 |
| Vendedor | vendedor@duoc.cl | vend123 |

Antes de publicar el sitio crea tu propio administrador desde **Panel → Nuevo usuario** y elimina estas cuentas:

```sql
DELETE FROM usuarios WHERE email IN ('admin@duoc.cl', 'vendedor@duoc.cl');
```

## Qué se guarda dónde

| Dato | Dónde |
|---|---|
| Usuarios (contraseña con bcrypt), productos, galería, fotos subidas, pedidos e historial | **MySQL** |
| Sesión | Token JWT (7 días) en el navegador, validado por la API en cada petición |
| Carrito | `localStorage` del navegador; al finalizar la compra pasa a MySQL como pedido |

Tablas: `usuarios`, `productos`, `producto_imagenes`, `imagenes`, `pedidos`, `pedido_items`, `pedido_historial`.

- Las fotos subidas desde el panel se guardan dentro de MySQL (tabla `imagenes`) y se sirven en `/api/imagenes/ID`. Cada foto admite hasta 3 MB; las fotos que dejan de usarse se borran solas.
- Cada pedido guarda una copia del nombre, el RUT, el precio y el teléfono del cliente: editar o borrar un producto o usuario después no cambia el historial.
- No puedes cambiar tu propio rol ni eliminar tu propia cuenta, y siempre debe quedar al menos un administrador. Al eliminar un usuario sus pedidos se conservan en el panel de pedidos.
- El servidor calcula el total con los precios de la base de datos; nunca confía en los precios que envía el navegador.

## Panel de administración

| Ruta | Rol | Qué hace |
|---|---|---|
| `/admin` | admin, vendedor | Resumen: productos, usuarios, pedidos, pendientes y ventas |
| `/admin/productos` | admin, vendedor | Agregar, editar y quitar productos, con imagen principal y galería de hasta 6 fotos |
| `/admin/pedidos` | admin, vendedor | Compras con RUT y teléfono del cliente; buscar (también por RUT), filtrar y cambiar el estado |
| `/admin/usuarios` | admin | Usuarios con número de compras y total gastado; cambiar el rol (administrador, vendedor, cliente) y eliminar usuarios |
| `/admin/usuarios/nuevo` | admin | Crear usuarios con rol |

Los usuarios ven el seguimiento de sus compras en `/mis-pedidos` (se actualiza solo cada 30 s).

## API

| Método y ruta | Acceso |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` | público / público / sesión |
| `GET /api/productos` | público |
| `POST /api/productos`, `PUT /api/productos/:id`, `DELETE /api/productos/:id` | admin, vendedor |
| `GET /api/imagenes/:id` | público |
| `POST /api/pedidos`, `GET /api/pedidos/mios` | sesión |
| `GET /api/pedidos`, `PATCH /api/pedidos/:codigo/estado` | admin, vendedor |
| `GET /api/usuarios`, `POST /api/usuarios`, `PATCH /api/usuarios/:id/rol`, `DELETE /api/usuarios/:id` | admin |
| `GET /api/admin/resumen` | admin, vendedor |

## Estructura

```
server/                API Express: index.js, init-db.js, schema.sql, routes/, lib/, middleware/
src/lib/api.js         cliente de la API (agrega el token a cada petición)
src/lib/useFetch.js    carga datos de la API con refresco automático
src/context/           StoreContext (productos, carrito, pedidos), AuthContext (sesión)
src/pages, components  páginas y componentes de React
```

## Problemas frecuentes

- **"Faltan la base de datos o las tablas"**: ejecuta `npm run db:init`.
- **"MySQL rechazó el usuario o la contraseña"**: revisa `DB_USER` y `DB_PASSWORD` en `.env`.
- **Error al subir una foto grande**: sube `max_allowed_packet` de MySQL (por ejemplo `SET GLOBAL max_allowed_packet = 16*1024*1024;`). En MySQL 5.7 el valor por defecto es 4 MB.
- **Las sesiones se cierran al reiniciar la API**: define `JWT_SECRET` en `.env`.

## Pipeline CI/CD (GitHub Actions + Docker Compose)

Workflow: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml). Corre en cada Pull Request y push a `main`.

```
test ──► sonarcloud ─┐
                     ├─► build ──► compose-validate ──► publish ──► deploy
dependencies ────────┘   (imagen)   (orquestación)      (GHCR)     (staging)
```

| Job | Qué hace | Bloquea si… |
|---|---|---|
| `test` | `npm run test:ci`: Vitest + cobertura v8 (`coverage/lcov.info`) | falla una prueba o la cobertura baja de 85 % (líneas/sentencias/funciones) u 80 % (ramas) — `vitest.config.js` |
| `sonarcloud` | Análisis estático + cobertura en SonarCloud | el Quality Gate no se cumple (`sonar.qualitygate.wait=true`) o falta `SONAR_TOKEN` |
| `dependencies` | `npm audit` + Snyk Open Source | hay vulnerabilidades HIGH/CRITICAL o falta `SNYK_TOKEN` |
| `build` | Construye la imagen (multi-stage, usuario no root), escanea con Snyk Container | la imagen corre como root o Snyk halla HIGH/CRITICAL propias de la aplicación |
| `compose-validate` | Levanta `db + api x2 + lb`, pruebas de humo, escala a 3 réplicas, mata una y verifica que sigue respondiendo | cualquier healthcheck o prueba de humo falla |
| `publish` | Sube la imagen a `ghcr.io/<owner>/<repo>:<sha>` y `:latest` (solo `main`) | los jobs anteriores fallan |
| `deploy` | Despliega con Compose en el entorno `staging` y compara el commit | el commit de la imagen en ejecución ≠ commit del pipeline |

**Secretos requeridos** (Settings → Secrets and variables → Actions): `SONAR_TOKEN`, `SNYK_TOKEN`. Además, edita `sonar.organization` y `sonar.projectKey` en [`sonar-project.properties`](sonar-project.properties).

**Cobertura y JaCoCo:** JaCoCo mide solo código Java/JVM. En este proyecto JavaScript, Vitest (provider `v8`, basado en c8) cumple ese rol: genera `lcov.info`, que SonarCloud muestra como cobertura y usa en el Quality Gate.

**Trazabilidad:** commit → `GIT_SHA` (build-arg) → etiqueta OCI `org.opencontainers.image.revision` y variable `GIT_SHA` → `GET /api/health` devuelve `{"ok":true,"commit":"<sha>"}` → el job `deploy` verifica que los tres coincidan. Cada imagen en GHCR lleva el SHA corto como tag.

**Calidad:** PRs con tests, cobertura mínima, Quality Gate de Sonar, auditoría de dependencias e imagen y validación de la pila completa antes de publicar.

### Ejecutar en local (Windows PowerShell, macOS y Linux)

Requiere Docker con contenedores **Linux** (en Windows: Docker Desktop + WSL 2). En PowerShell usa `curl.exe` en lugar de `curl`. Pasos completos y solución de problemas en [`CUMPLIMIENTO_EP2.md`](CUMPLIMIENTO_EP2.md) §10.

```
npm test                         # pruebas
npm run test:ci                  # pruebas + cobertura (coverage/lcov.info)
npm run docker:env               # crea .env.docker con contraseñas aleatorias (multiplataforma)
docker compose --env-file .env.docker up -d --build --wait
curl.exe -fsS http://localhost:8080/api/health      # en macOS/Linux: curl -fsS ...
docker compose --env-file .env.docker up -d --scale api=4 --no-recreate   # escalar
docker compose --env-file .env.docker down -v
```
