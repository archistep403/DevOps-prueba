# Documento de Evaluación — EP2 DOY0101
## Ingeniería DevOps | DUOC UC | 2025

**Proyecto:** StoreGo (React + Express + MySQL) — Pipeline CI/CD
**Integrantes:** `[nombre y matrícula estudiante 1]` / `[nombre y matrícula estudiante 2]`
**Repositorio:** `https://github.com/OWNER/REPO`
**Restricciones del equipo:** sin AWS, sin Kubernetes y sin Dependabot. Herramientas usadas: Docker Compose, SonarCloud, Snyk y cobertura LCOV (rol de JaCoCo, ver §3.4).

---

## Resumen de cumplimiento del enunciado

Apartados que exige el encargo (“El encargo debe incluir…”) y dónde se cumple cada uno:

| # | Requisito del enunciado | Indicador | Dónde se cumple | Sección |
|---|---|---|---|---|
| 1 | Dockerfile para contenerizar el microservicio | IE1 | `Dockerfile`, `.dockerignore` | §2 |
| 2a | Pipeline en GitHub Actions: construcción de imagen Docker | IE1 | job `build` en `.github/workflows/ci-cd.yml` | §2.2 |
| 2b | Pruebas unitarias (framework tipo JUnit/PyTest) | IE2 | Vitest, job `test`, umbral de cobertura | §3 |
| 2c | Escaneo de dependencias y análisis de código (SonarQube o Snyk) | IE3 | Snyk (dependencias e imagen), `npm audit` y SonarCloud | §4.1 |
| 2d | Despliegue automático en entorno simulado (Docker Compose) | IE4 | jobs `publish` y `deploy` (entorno `staging`) | §5 |
| 3 | Alertas o bloqueos si el análisis de seguridad falla | IE3 | `needs` entre jobs, Quality Gate, umbral `high`, verificación de secretos | §4.2 |
| 4 | Orquestación de contenedores (Kubernetes **o** Docker Compose) | IE5 | `docker-compose.yml` + `deploy/nginx.conf` | §6 |
| 5 | Documentar el pipeline en `README.md`: trazabilidad y calidad | IE4 | sección “Pipeline CI/CD” de `README.md` | §5.4 y README |

**Decisiones del equipo respecto al enunciado:**

| Tema | Enunciado | Decisión | Justificación |
|---|---|---|---|
| Escaneo de dependencias | “Dependabot”, y SonarQube o Snyk | **Sin Dependabot**; se usan Snyk y `npm audit`, y además SonarCloud | Decisión del equipo. Snyk cubre la detección de vulnerabilidades en dependencias y bloquea el pipeline; el enunciado acepta Snyk como herramienta de análisis |
| Orquestación | Kubernetes o Docker Compose | **Solo Docker Compose** | El enunciado permite elegir; Compose basta para db + API replicada + balanceador |
| Cloud | “Entorno cloud simulado” | **Sin AWS**; GHCR + entorno `staging` de GitHub + Compose | Simulación local, sin costo ni credenciales de nube |
| Cobertura | Frameworks de pruebas unitarias | **Vitest + LCOV** en lugar de JaCoCo | JaCoCo solo instrumenta la JVM (ver §3.4) |

Correspondencia con la pauta (cada indicador pesa 20 %): el documento presenta para cada uno la evidencia que corresponde al nivel **“Muy buen desempeño”** (todos los aspectos del indicador cubiertos). La calificación final la asigna el docente y depende de que el pipeline se ejecute correctamente (ver §8).

---

## Índice

1. [Descripción del proyecto base](#1-descripción-del-proyecto-base)
2. [IE1 — Contenedores](#2-ie1--contenedores-20)
3. [IE2 — Pruebas automatizadas](#3-ie2--pruebas-automatizadas-20)
4. [IE3 — Seguridad y escalabilidad en el pipeline](#4-ie3--seguridad-y-escalabilidad-en-el-pipeline-20)
5. [IE4 — Despliegue automático y trazabilidad](#5-ie4--despliegue-automático-y-trazabilidad-20)
6. [IE5 — Orquestación de contenedores](#6-ie5--orquestación-de-contenedores-20)
7. [Configuración requerida antes de la primera ejecución](#7-configuración-requerida-antes-de-la-primera-ejecución)
8. [Estado de verificación](#8-estado-de-verificación)
9. [Herramientas de IA utilizadas](#9-herramientas-de-ia-utilizadas)
10. [Cómo reproducir el pipeline localmente](#10-cómo-reproducir-el-pipeline-localmente)
11. [Reflexiones individuales](#11-reflexiones-individuales)

---

## 1. Descripción del proyecto base

StoreGo es una tienda de consolas PlayStation con tres piezas:

| Pieza | Tecnología | Ubicación |
|---|---|---|
| Frontend | React 18 + Vite + React Router | `src/` |
| API | Node.js 20 + Express 4, autenticación JWT, rate limiting | `server/` |
| Base de datos | MySQL 8 (usuarios, productos, imágenes, pedidos) | `server/schema.sql` |

Es un servicio de mediana envergadura (tres componentes dependientes entre sí), lo que justifica la orquestación: la API no puede arrancar sin MySQL inicializado, y las fotos se almacenan en la base de datos.

**Cambios hechos al código para el EP2** (mínimos, sin alterar el comportamiento de la tienda):

| Archivo | Cambio | Motivo |
|---|---|---|
| `server/index.js` | `/api/health` ahora incluye `commit` (variable `GIT_SHA`) | Trazabilidad en ejecución (IE4) |
| `server/config.js`, `server/index.js` | `TRUST_PROXY` opcional → `app.set('trust proxy', n)` | Con balanceador, el rate limit del login debe ver la IP real del cliente (IE3/IE5) |
| `package.json` | Scripts `test` y `test:ci`; devDependencies `vitest` y `@vitest/coverage-v8` | IE2 |

**Archivos de entrega:**

```
.github/workflows/ci-cd.yml   pipeline completo (7 jobs)
Dockerfile, .dockerignore     imagen de la aplicación
docker-compose.yml            orquestación: db + db-init + api (réplicas) + lb
deploy/nginx.conf             balanceador con cabeceras de seguridad
.env.docker.example           variables de la orquestación
vitest.config.js, tests/      pruebas unitarias y umbrales de cobertura
sonar-project.properties      configuración SonarCloud
scripts/gen-env-docker.js     genera .env.docker (multiplataforma, ver §10)
.gitattributes                fija saltos de línea LF (compatibilidad con Windows)
README.md                     sección "Pipeline CI/CD"
```

---

## 2. IE1 — Contenedores (20%)

> Incorpora el uso de contenedores para facilitar el trabajo con aplicaciones de vanguardia en la generación de soluciones en la nube.

### 2.1 Dockerfile multi-stage (`Dockerfile`)

Tres etapas sobre `node:20-alpine`:

| Etapa | Qué hace | Por qué |
|---|---|---|
| `build` | `npm ci` + `vite build` → `dist/` | Vite y sus dependencias de desarrollo no llegan a la imagen final |
| `deps` | `npm ci --omit=dev` | Solo dependencias de producción (menor superficie de ataque y tamaño) |
| `runtime` | Copia `node_modules` de producción, `server/` y `dist/`; ejecuta `node server/index.js` | Una sola imagen sirve la web y la API (como indica el README en producción) |

Decisiones técnicas:

| Decisión | Justificación |
|---|---|
| Imagen `alpine` | Base mínima: menos paquetes, menos CVEs y menos MB |
| `USER node` | El proceso no corre como root; el pipeline lo verifica (`id -u ≠ 0`) |
| `ARG GIT_SHA` / `VERSION` → `LABEL org.opencontainers.image.revision` y `ENV GIT_SHA` | Trazabilidad commit → imagen → contenedor (IE4) |
| `HEALTHCHECK` sobre `/api/health` | Verifica también la conexión a MySQL; Compose lo usa para `--wait` y para el orden de arranque |
| `.dockerignore` | Excluye `node_modules`, `.env`, `tests`, `.git` y documentación: contexto pequeño y sin secretos en la imagen |
| `COPY package*.json` antes del código | Aprovecha la caché de capas: `npm ci` solo se repite si cambian las dependencias |

### 2.2 Construcción en el pipeline (job `build`)

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    push: false
    load: true
    tags: storego:${{ steps.vars.outputs.short_sha }}
    build-args: |
      GIT_SHA=${{ github.sha }}
      VERSION=${{ steps.vars.outputs.short_sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

- La imagen se construye **una sola vez** y se exporta como artefacto (`docker save`). Los jobs `compose-validate`, `publish` y `deploy` usan esa misma imagen (no se reconstruye).
- Caché de GitHub Actions (`type=gha`) para builds rápidos.

---

## 3. IE2 — Pruebas automatizadas (20%)

> Integra pruebas automatizadas en los pipelines de integración continua según las políticas de calidad del proyecto.

### 3.1 Framework

**Vitest** (compatible con Vite, ESM nativo) con cobertura **v8**. Las pruebas están en `tests/`:

```bash
npm test          # vitest run
npm run test:ci   # vitest run --coverage  (falla si baja de los umbrales)
```

### 3.2 Suite de pruebas (101 pruebas, 5 archivos)

| Archivo | Pruebas | Qué verifica |
|---|---|---|
| `tests/server/validators.test.js` | 54 | `validarRun` (dígito verificador numérico, 0 y K), `cleanUser` (21 casos de rechazo con campo y código 400; rol forzado a `cliente` en registro público; `allowRole`), `cleanProduct`, `makeProductId`, `cleanOrderItems` (unión de líneas, límites de cantidad y de ítems) |
| `tests/server/auth-middleware.test.js` | 10 | `requireAuth` (sin token, token inválido, token firmado con otra clave, usuario eliminado, carga desde MySQL), `requireRole` (403), `publicUser`, `asyncHandler` |
| `tests/server/images.test.js` | 13 | Detección de tipo real por bytes (`sniffMime`), rechazo de `javascript:`, `//` y MIME no permitido, límite de 3 MB (413), `purgeOrphanImages` |
| `tests/server/users.test.js` | 4 | `insertUser`: hash bcrypt, 409 por RUN o correo duplicado (con `field`) |
| `tests/client/lib.test.js` | 20 | Validadores del cliente (equivalentes a los del servidor), `api()` (token Bearer, `ApiError`, evento 401, fallo de red), `storage`, `orders`, `products`, `format` |

Casos críticos de negocio y seguridad cubiertos: validación de RUN, dominios de correo permitidos, rol no escalable desde el registro, validación de imágenes y de carrito, autenticación y autorización por rol.

Las pruebas **no necesitan MySQL**: la capa de base de datos se simula con `vi.mock`, por lo que se ejecutan en segundos y de forma determinista en el runner.

### 3.3 Política de calidad (umbral de cobertura)

Definida en `vitest.config.js`:

```js
thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 }
```

Resultado medido localmente (`npm run test:ci`):

| Métrica | Resultado | Umbral |
|---|---|---|
| Sentencias | 95,02 % | 85 % |
| Ramas | 97,52 % | 80 % |
| Funciones | 96,36 % | 85 % |
| Líneas | 95,02 % | 85 % |

`server/lib/validators.js`, `server/middleware/auth.js` y `src/lib/api.js` están al 100 % de líneas. Si la cobertura baja de los umbrales, `vitest` termina con código ≠ 0 y el job `test` falla; como `build` depende de él, no se construye ni se despliega nada.

**Alcance de la cobertura:** se mide la lógica de negocio pura y el middleware. Quedan fuera del cálculo las rutas Express (`server/routes/*`), `init-db.js` y los componentes React, porque requieren MySQL real o DOM; esas rutas se ejercitan en el job `compose-validate` con pruebas de humo contra la pila real (§6.4). Los archivos medidos están listados en `vitest.config.js` (`coverage.include`).

### 3.4 JaCoCo y cobertura en JavaScript

JaCoCo es un agente de cobertura para la JVM (Java/Kotlin) y **no puede instrumentar código JavaScript**. En este proyecto, su rol lo cumple Vitest con cobertura v8 (basada en c8) y el formato LCOV:

| Función en un proyecto Java | Equivalente en este proyecto |
|---|---|
| JaCoCo genera `jacoco.xml` | Vitest (provider `v8`) genera `coverage/lcov.info` |
| SonarCloud lee `sonar.coverage.jacoco.xmlReportPaths` | SonarCloud lee `sonar.javascript.lcov.reportPaths=coverage/lcov.info` |
| Umbral de cobertura en el build | `thresholds` en `vitest.config.js` + Quality Gate de SonarCloud |

### 3.5 Job `test` en el pipeline

```yaml
test:
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "20", cache: npm }
    - run: npm ci
    - run: npm run test:ci
    - uses: actions/upload-artifact@v4
      with: { name: coverage, path: coverage/ }
```

`npm ci` (no `npm install`) instala exactamente las versiones de `package-lock.json`. El reporte `coverage/` se sube como artefacto y lo consume SonarCloud.

---

## 4. IE3 — Seguridad y escalabilidad en el pipeline (20%)

> Ajusta parámetros de escalabilidad y seguridad dentro del pipeline de entrega continua en una arquitectura basada en contenedores.

### 4.1 Controles de seguridad automáticos

| Control | Job | Qué analiza | Bloquea cuando |
|---|---|---|---|
| **SonarCloud** | `sonarcloud` | Bugs, vulnerabilidades, *code smells*, duplicación y cobertura (LCOV) | El Quality Gate falla (`sonar.qualitygate.wait=true`) |
| **Snyk Open Source** | `dependencies` | Dependencias npm con la base de datos de Snyk | Hallazgo `HIGH` o `CRITICAL` (`--severity-threshold=high`) |
| **npm audit** | `dependencies` | Dependencias de producción (`--omit=dev`) | Hallazgo `high` o superior |
| **Snyk Container** | `build` | Paquetes de la imagen Docker | Hallazgo `HIGH`/`CRITICAL` propio de la aplicación (`--exclude-base-image-vulns`) |
| **Usuario no root** | `build` | `id -u` dentro de la imagen | El UID es 0 |

No se usa Dependabot: el escaneo de dependencias lo cubre Snyk (detección y bloqueo en cada ejecución).

### 4.2 Bloqueo y alertas

- Los jobs `sonarcloud` y `dependencies` comienzan verificando que existan `SONAR_TOKEN` y `SNYK_TOKEN`. Si falta alguno, fallan con un `::error::` explícito antes de analizar nada, para que **nunca se “aprueben” por omisión**.
- `build` depende de `test`, `sonarcloud` y `dependencies`. Si cualquiera falla, no se construye, no se publica y no se despliega:

```
[test | sonarcloud | dependencies]  ──✗──►  build ✗  compose-validate ✗  publish ✗  deploy ✗
```

- GitHub notifica el fallo por correo y en la pestaña Actions; SonarCloud además decora el Pull Request con el estado del Quality Gate. Recomendado: activar *branch protection* en `main` marcando estos jobs como obligatorios.

### 4.3 Parámetros de seguridad ajustados

| Parámetro | Dónde | Efecto |
|---|---|---|
| `permissions: contents: read` (global); `packages: write` solo en `publish` | `ci-cd.yml` | Mínimo privilegio para `GITHUB_TOKEN` |
| `concurrency` con `cancel-in-progress` | `ci-cd.yml` | Evita ejecuciones simultáneas sobre la misma rama |
| Secretos efímeros (`openssl rand`) para MySQL y JWT en cada ejecución | `compose-validate`, `deploy` | Ninguna credencial fija en el repositorio |
| `${VAR:?mensaje}` en el compose | `docker-compose.yml` | Compose se niega a arrancar sin contraseña ni `JWT_SECRET` |
| `NODE_ENV=production` | `Dockerfile` | La API exige un `JWT_SECRET` propio (no el de ejemplo) |
| `cap_drop: [ALL]`, `no-new-privileges`, `read_only: true` + `tmpfs` | `docker-compose.yml` | Contenedores con privilegios y sistema de archivos mínimos |
| Cabeceras HTTP (`nosniff`, `X-Frame-Options: DENY`, `CSP`, `Referrer-Policy`) y `server_tokens off` | `deploy/nginx.conf` | Endurecimiento del punto de entrada; verificadas en las pruebas de humo |
| Rate limit de login y registro | `server/routes/auth.js` (ya existente) | Con `TRUST_PROXY=1` ve la IP real del cliente detrás del balanceador |

### 4.4 Parámetros de escalabilidad y desempeño

| Parámetro | Valor | Dónde |
|---|---|---|
| Réplicas de la API | `STOREGO_REPLICAS` (por defecto 2); el pipeline prueba 2 → 3 | `docker-compose.yml`, `compose-validate` |
| Límites de recursos | API 0,50 CPU / 256 MB; MySQL 1 CPU / 512 MB; balanceador 0,25 CPU / 64 MB | `deploy.resources.limits` |
| Reservas | API 0,10 CPU / 64 MB | `deploy.resources.reservations` |
| `max_allowed_packet=16M` en MySQL | Necesario porque las fotos (hasta 15 MB de JSON) se guardan en la BD | `command` del servicio `db` |
| `client_max_body_size 16m` y reintentos entre réplicas | Evita que nginx rechace fotos y desvía el tráfico si una réplica falla | `deploy/nginx.conf` |
| Caché de capas Docker y de npm en CI | `type=gha`, `cache: npm` | `ci-cd.yml` |

---

## 5. IE4 — Despliegue automático y trazabilidad (20%)

> Despliega automáticamente una aplicación mediante pipelines de CI/CD configurados en un entorno cloud simulado, garantizando su trazabilidad desde el desarrollo hasta la producción.

### 5.1 Entorno cloud simulado

No se usa un proveedor cloud real. El “entorno cloud” es:

- **GitHub Container Registry (GHCR)** como registro de imágenes (equivalente a ECR/ACR, sin usar AWS).
- **GitHub Environment `staging`** + Docker Compose en el runner como entorno de despliegue simulado. GitHub registra cada despliegue (estado, URL, actor, commit) en *Settings → Environments → staging*.

### 5.2 Flujo completo

```
Pull Request ──► test ► sonarcloud ► dependencies ► build ► compose-validate     (sin publicar)

push a main  ──► test ► sonarcloud ► dependencies ► build ► compose-validate
                                                              │
                                                  publish (GHCR :sha y :latest)
                                                              │
                                              deploy → entorno "staging" (Compose)
```

`publish` y `deploy` solo se ejecutan en `push` a `main` (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`), nunca desde un PR.

### 5.3 Despliegue automático (job `deploy`)

1. Inicia sesión en GHCR con `GITHUB_TOKEN` (permiso `packages: read`).
2. Genera `.env.docker` con la imagen `ghcr.io/<owner>/<repo>:<sha-corto>` y secretos efímeros.
3. `docker compose pull api` y `docker compose up -d --wait --no-build`: despliega **la imagen publicada** y espera a que todos los healthchecks pasen.
4. Verifica la trazabilidad (§5.4). Si falla, el job falla.
5. Escribe un resumen de auditoría en el *Step Summary* y apaga el entorno (`down -v`).

### 5.4 Trazabilidad commit → imagen → contenedor

```
git commit  (SHA completo, p. ej. a1b2c3d…)
   │  build-arg GIT_SHA
   ▼
Imagen storego:a1b2c3d
   ├─ LABEL org.opencontainers.image.revision = a1b2c3d…
   └─ ENV   GIT_SHA                            = a1b2c3d…
   │  publish
   ▼
ghcr.io/<owner>/<repo>:a1b2c3d   (+ :latest)
   │  deploy
   ▼
Contenedor api en ejecución
   ├─ docker inspect  → etiqueta revision
   └─ GET /api/health → {"ok":true,"commit":"a1b2c3d…"}
```

El job `deploy` compara ambas lecturas con `$GITHUB_SHA`:

```bash
test "$LABEL"      = "$GITHUB_SHA"
test "$API_COMMIT" = "$GITHUB_SHA"
```

Si el contenedor en ejecución no corresponde al commit que disparó el pipeline, el despliegue falla. Cada imagen en GHCR conserva el SHA como tag, lo que permite volver a una versión anterior y auditar qué commit está en cada entorno.

---

## 6. IE5 — Orquestación de contenedores (20%)

> Orquesta el uso de contenedores para asegurar el correcto funcionamiento de los aplicativos de soluciones de mediana y gran envergadura.

La orquestación se implementa con **Docker Compose** (sin Kubernetes).

### 6.1 Servicios (`docker-compose.yml`)

| Servicio | Imagen | Réplicas | Función |
|---|---|---|---|
| `db` | `mysql:8.4` | 1 | Base de datos con volumen persistente `db_data` |
| `db-init` | imagen de la app | 1 (tarea única) | Ejecuta `server/init-db.js` (idempotente: tablas y datos iniciales) y termina |
| `api` | imagen de la app | `STOREGO_REPLICAS` (2) | API Express + frontend; sin puertos publicados, por lo que se puede escalar |
| `lb` | `nginx-unprivileged:1.27-alpine` | 1 | Único punto de entrada (`:8080`); reparte en round-robin entre réplicas |

### 6.2 Diagrama

```
                     red interna "backend"
Cliente ─► :8080 ─► [lb nginx] ─┬─► [api #1] ─┐
                                ├─► [api #2] ─┼─► [db MySQL 8.4] ◄─ volumen db_data
                                └─► [api #N] ─┘          ▲
                                                    [db-init] (una vez)
```

### 6.3 Mecanismos que aseguran el funcionamiento

| Mecanismo | Implementación |
|---|---|
| **Orden de arranque** | `db` (healthy) → `db-init` (completado con éxito) → `api` (healthy) → `lb` |
| **Healthchecks** | MySQL (`mysqladmin ping`), API (`/api/health`, que consulta la BD), balanceador (`/lb-health`) |
| **Autorrecuperación** | `restart: unless-stopped` en los servicios persistentes |
| **Escalado horizontal** | `STOREGO_REPLICAS=N` o `docker compose up -d --scale api=N --no-recreate`; nginx re-resuelve el DNS cada 5 s y detecta réplicas nuevas |
| **Tolerancia a fallos** | `proxy_next_upstream` reintenta en otra réplica ante error, timeout o 502/503/504 |
| **Persistencia** | Volumen nombrado `db_data` |
| **Aislamiento** | Red `backend` interna; solo `lb` publica un puerto; MySQL no es accesible desde el host |
| **Recursos acotados** | Límites de CPU y memoria por servicio (§4.4) |

### 6.4 Validación en el pipeline (job `compose-validate`)

El job levanta la pila completa y ejecuta, en orden:

1. `docker compose config -q` — valida sintaxis y variables obligatorias.
2. `docker compose up -d --wait --no-build` — falla si algún healthcheck no pasa.
3. **Pruebas de humo:** 2 réplicas activas; `/api/health` OK; `/api/productos` devuelve los productos iniciales (prueba que `db-init` y MySQL funcionan); el frontend se sirve (`<div id="root">`); cabeceras de seguridad presentes; login con la cuenta semilla devuelve token.
4. **Escalado:** pasa de 2 a 3 réplicas y comprueba que existen 3.
5. **Resiliencia:** mata una réplica con `docker kill` y confirma que 20 peticiones consecutivas siguen siendo atendidas.
6. Muestra logs si algo falla y siempre limpia (`down -v`).

---

## 7. Configuración requerida antes de la primera ejecución

El pipeline fallará de forma explícita hasta completar estos pasos (es intencional, ver §4.2):

| # | Acción | Dónde |
|---|---|---|
| 1 | Crear el proyecto en SonarCloud (importar el repositorio) y generar un token | sonarcloud.io → My Account → Security |
| 2 | Guardar el secreto `SONAR_TOKEN` | GitHub → Settings → Secrets and variables → Actions |
| 3 | Reemplazar `sonar.organization` y `sonar.projectKey` | `sonar-project.properties` |
| 4 | En SonarCloud, desactivar “Automatic Analysis” (el análisis lo hace el pipeline, con cobertura) | SonarCloud → Administration → Analysis Method |
| 5 | Crear cuenta en Snyk y guardar el secreto `SNYK_TOKEN` | app.snyk.io → Account settings |
| 6 | Crear el entorno `staging` (opcional: reglas de aprobación) | GitHub → Settings → Environments |
| 7 | Permitir que los workflows escriban paquetes (GHCR) | Settings → Actions → General → Workflow permissions |
| 8 | Proteger `main` marcando los jobs como obligatorios | Settings → Branches |

### 7.1 Subir el proyecto a GitHub (la carpeta actual no es un repositorio git)

El proyecto se recibió sin carpeta `.git`; el pipeline solo existe cuando el código está en GitHub, en una rama llamada `main`.

```bash
git init -b main
git add .
git status                      # comprueba que NO aparezcan .env, .env.docker, node_modules ni coverage
git commit -m "EP2: pipeline CI/CD con Docker Compose, SonarCloud y Snyk"
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

Los mismos comandos funcionan en PowerShell. Haz antes el repositorio en GitHub (vacío, sin README). Al primer `push` se ejecuta el pipeline; falla en `sonarcloud` y `dependencies` hasta crear los secretos del paso 2 y 5.

### 7.2 Entrega formal

Según el enunciado, el encargo se realiza **en parejas** y se entrega **mediante el enlace al repositorio de GitHub**, que se sube en AVA y se envía por correo al docente dentro del plazo. Lista de verificación:

- [ ] Repositorio en GitHub con el código, el `Dockerfile`, `docker-compose.yml` y `.github/workflows/ci-cd.yml`
- [ ] Repositorio accesible para el docente (público, o privado con acceso concedido)
- [ ] Pipeline ejecutado al menos una vez con todos los jobs en verde (capturas en §8)
- [ ] `README.md` con la sección “Pipeline CI/CD” (trazabilidad y calidad)
- [ ] Este documento con nombres, matrículas y URL del repositorio completados (cabecera)
- [ ] Reflexiones individuales (§11) redactadas por cada integrante, sin IA
- [ ] Herramientas de IA declaradas (§9)
- [ ] Enlace enviado por AVA y por correo al docente

---

## 8. Estado de verificación

Se distingue lo comprobado de lo pendiente:

| Elemento | Estado |
|---|---|
| 101 pruebas unitarias y umbrales de cobertura (`npm run test:ci`) | **Ejecutado localmente: pasa** (95 % sentencias / 97,5 % ramas) |
| `npm run build` (Vite) | **Ejecutado localmente: pasa** |
| Sintaxis YAML de `ci-cd.yml` y `docker-compose.yml` | **Verificada** (carga correcta y grafo de `needs` revisado) |
| Construcción de la imagen, Compose y pruebas de humo | **Pendiente de ejecución:** el equipo de desarrollo no tenía Docker instalado. Se ejecutarán en los jobs `build` y `compose-validate` o con los comandos de §10 |
| SonarCloud y Snyk | **Pendiente:** requieren los tokens de §7 |
| Comandos de Windows (§10.2) | **Pendiente de ejecución en Windows:** el script `npm run docker:env` se probó en macOS; los comandos PowerShell se escribieron según la documentación de Docker/PowerShell y no se ejecutaron en un equipo Windows |
| Hallazgos de `npm audit` | `react-router` (moderado, 2 avisos) y herramientas de desarrollo (`vite`/`esbuild`/`vitest`, moderado). **Ninguno es high**, por lo que no bloquea con el umbral actual; corregirlos exige subir de versión mayor y debe evaluarse aparte |

Capturas sugeridas para la entrega (completar tras la primera ejecución): pestaña Actions con todos los jobs en verde, Quality Gate de SonarCloud, panel de Snyk, Step Summary del despliegue y *Environments → staging*.

---

## 9. Herramientas de IA utilizadas

| Herramienta | Uso |
|---|---|
| IBM Bob (asistente de IA) | Generación del borrador del Dockerfile, `docker-compose.yml`, workflow de GitHub Actions, pruebas unitarias y de este documento. El equipo revisó y validó cada archivo y es responsable de las decisiones técnicas. |

Las reflexiones individuales (§11) deben ser redactadas por los integrantes sin apoyo de IA. Referencia de citación: https://bibliotecas.duoc.cl/ia

---

## 10. Cómo reproducir el pipeline localmente

El pipeline de GitHub Actions corre en runners Linux, por lo que **no depende del sistema operativo de los integrantes**. Esta sección es para reproducirlo en un equipo propio, en **Windows 10/11 (PowerShell)** o en macOS/Linux (bash).

### 10.1 Requisitos previos

| Requisito | Windows | macOS / Linux |
|---|---|---|
| Node.js 20 o superior (incluye `npm`) | Instalador de nodejs.org o `winget install OpenJS.NodeJS.LTS` | Instalador oficial, `nvm` o gestor de paquetes |
| Git | `winget install Git.Git` | Gestor de paquetes |
| Docker | **Docker Desktop** con el backend **WSL 2** y en modo **contenedores Linux** (no “Windows containers”). Compose v2 viene incluido (`docker compose`, sin guion) | Docker Engine + plugin Compose v2 |
| Snyk CLI (opcional, solo para el paso 5) | `npm install -g snyk` | `npm install -g snyk` |

Verifica: `node -v` (v20+), `docker --version`, `docker compose version` (v2.17 o superior, necesario para `--wait`).

Notas específicas de Windows:

- Usa **PowerShell** (o la terminal de Windows), no `cmd`. Los comandos de la columna bash no funcionan tal cual en PowerShell: `$(...)`, `head`, `seq`, `cp` y `curl` se comportan distinto.
- En PowerShell `curl` es un alias de `Invoke-WebRequest`; por eso se usa **`curl.exe`** (viene con Windows 10 1803+).
- Los saltos de línea están fijados a **LF** con `.gitattributes`, para que `deploy/nginx.conf`, el `Dockerfile` y el `docker-compose.yml` no lleguen con CRLF a los contenedores Linux. Si ya habías clonado el repositorio antes de ese archivo, ejecuta `git add --renormalize .` o vuelve a clonar.
- `.env.docker` se genera con `npm run docker:env` (script de Node). **No** lo crees con `echo ... > .env.docker` en PowerShell 5.1: lo guarda en UTF-16 y Docker Compose no puede leerlo.
- Si Docker Desktop pregunta por compartir la unidad, acepta; el repositorio debe estar en una carpeta local (evita OneDrive o rutas de red para que el montaje de `deploy/nginx.conf` funcione).

### 10.2 Pasos en Windows (PowerShell)

```powershell
# 1. Clonar e instalar
git clone https://github.com/OWNER/REPO.git
cd REPO
npm ci

# 2. Pruebas y cobertura (genera coverage\lcov.info)
npm run test:ci

# 3. Build del frontend
npm run build

# 4. Imagen Docker (si no hay repositorio git, usa GIT_SHA=local)
$env:GIT_SHA = (git rev-parse HEAD 2>$null)
if (-not $env:GIT_SHA) { $env:GIT_SHA = "local" }
docker build -t storego:local --build-arg GIT_SHA=$env:GIT_SHA .
docker run --rm --entrypoint id storego:local -u        # debe imprimir 1000, no 0

# 5. Escaneo con Snyk (requiere cuenta: snyk auth)
snyk test --severity-threshold=high
snyk container test storego:local --file=Dockerfile --severity-threshold=high --exclude-base-image-vulns

# 6. Orquestación (genera .env.docker con contraseñas aleatorias)
npm run docker:env
docker compose --env-file .env.docker up -d --build --wait
curl.exe -fsS http://localhost:8080/api/health          # {"ok":true,"commit":"..."}
docker compose --env-file .env.docker ps                # api x2, db, lb

# 7. Escalar y comprobar tolerancia a fallos
docker compose --env-file .env.docker up -d --scale api=3 --no-recreate --wait
$victima = (docker compose --env-file .env.docker ps -q api) | Select-Object -First 1
docker kill $victima
1..10 | ForEach-Object { curl.exe -fsS http://localhost:8080/api/health }

# 8. Limpiar
docker compose --env-file .env.docker down -v
```

### 10.3 Pasos en macOS / Linux (bash)

```bash
# 1. Clonar e instalar
git clone https://github.com/OWNER/REPO.git && cd REPO
npm ci

# 2. Pruebas y cobertura (genera coverage/lcov.info)
npm run test:ci

# 3. Build del frontend
npm run build

# 4. Imagen Docker
export GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo local)
docker build -t storego:local --build-arg GIT_SHA=$GIT_SHA .
docker run --rm --entrypoint id storego:local -u        # debe imprimir 1000, no 0

# 5. Escaneo con Snyk (requiere cuenta: snyk auth)
snyk test --severity-threshold=high
snyk container test storego:local --file=Dockerfile --severity-threshold=high --exclude-base-image-vulns

# 6. Orquestación (genera .env.docker con contraseñas aleatorias)
npm run docker:env
docker compose --env-file .env.docker up -d --build --wait
curl -fsS http://localhost:8080/api/health               # {"ok":true,"commit":"..."}
docker compose --env-file .env.docker ps                 # api x2, db, lb

# 7. Escalar y comprobar tolerancia a fallos
docker compose --env-file .env.docker up -d --scale api=3 --no-recreate --wait
docker kill $(docker compose --env-file .env.docker ps -q api | head -n1)
for i in $(seq 1 10); do curl -fsS http://localhost:8080/api/health; done

# 8. Limpiar
docker compose --env-file .env.docker down -v
```

### 10.4 Problemas frecuentes en Windows

| Síntoma | Causa y solución |
|---|---|
| `no matching manifest for windows/amd64` | Docker está en modo “Windows containers”. Clic derecho en el icono de Docker → **Switch to Linux containers** |
| `error during connect` / `cannot connect to the Docker daemon` | Docker Desktop no está iniciado o WSL 2 no está activo (`wsl --status`) |
| `unknown flag: --wait` | Docker Compose antiguo. Actualiza Docker Desktop |
| `variable is not set. Defaulting to a blank string` o `Define STOREGO_DB_PASSWORD…` | Falta `.env.docker`; ejecuta `npm run docker:env` y agrega siempre `--env-file .env.docker` |
| `invalid utf-8` / variables que no se leen | `.env.docker` quedó en UTF-16 (creado con `>` en PowerShell 5.1). Bórralo y ejecuta `npm run docker:env -- --force` |
| Puerto 8080 ocupado | Cambia `STOREGO_PORT` en `.env.docker` (y usa ese puerto en los `curl`) |
| `curl` muestra un cuadro de advertencia de Internet Explorer | Usaste el alias de PowerShell; escribe `curl.exe` |
| `'GIT_SHA' ... fatal: not a git repository` | El proyecto se descargó como .zip. Usa `GIT_SHA=local` (el paso 4 ya lo contempla) |
| `^M` o errores raros en `nginx.conf` | Archivo con CRLF. Ejecuta `git add --renormalize .` y vuelve a hacer `up -d --build` |
| `dependency failed to start: container …db-init… exited (0)` | Versión antigua de Compose que trata la tarea de inicialización como error. Actualiza Docker Desktop; la `api` ya espera a `db-init` con `service_completed_successfully` |
| La API tarda en estar lista la primera vez | MySQL inicializa su volumen (hasta ~1 minuto). `--wait` espera; si agota el tiempo, revisa `docker compose --env-file .env.docker logs db` |
| Cambiaste `STOREGO_DB_PASSWORD` y MySQL rechaza el acceso | El volumen `db_data` conserva la contraseña anterior. Ejecuta `docker compose --env-file .env.docker down -v` y vuelve a levantar |

---

## 11. Reflexiones individuales

> **Instrucción del docente:** esta sección debe ser redactada por cada integrante **sin apoyo de IA**, explicando su aprendizaje y contribución al proyecto.

### Integrante 1 — `[Nombre completo]`

*(Redactar sin IA: qué aprendiste, qué fue lo más desafiante, cómo contribuiste.)*

---

### Integrante 2 — `[Nombre completo]`

*(Redactar sin IA: qué aprendiste, qué fue lo más desafiante, cómo contribuiste.)*

---

*Documento del encargo EP2 DOY0101 – Ingeniería DevOps – DUOC UC 2025.*
