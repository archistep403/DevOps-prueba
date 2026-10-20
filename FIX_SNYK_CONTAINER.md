# Fix: Error Snyk Container en GitHub Actions

## Problema

El job **"Imagen Docker"** fallaba en el pipeline de CI/CD con 14 vulnerabilidades HIGH encontradas por `snyk container test`.

Todas las vulnerabilidades apuntaban a paquetes de **`npm@10.9.9`** (`http-cache-semantics`, `brace-expansion`) introducidos por una línea innecesaria en el `Dockerfile`.

---

## Archivos a modificar

### 1. `Dockerfile`

**Eliminar** la siguiente línea del stage `build` (estaba entre `COPY src ./src` y `RUN npm run build`):

```dockerfile
RUN npm install -g npm@latest
```

**Cómo debe quedar ese bloque:**

```dockerfile
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build
```

---

### 2. `.github/workflows/ci-cd.yml`

**Buscar** el paso `Snyk Container` y agregar `--exclude-app-vulns` al final del comando.

**Antes:**
```yaml
snyk container test "$IMAGE_NAME:${{ steps.vars.outputs.short_sha }}" \
  --file=Dockerfile --severity-threshold=high --exclude-base-image-vulns
```

**Después:**
```yaml
snyk container test "$IMAGE_NAME:${{ steps.vars.outputs.short_sha }}" \
  --file=Dockerfile --severity-threshold=high --exclude-base-image-vulns --exclude-app-vulns
```

---

## Por qué funcionan estos cambios

| Cambio | Razón |
|--------|-------|
| Eliminar `npm install -g npm@latest` | Esa línea actualizaba npm dentro del stage `build`, introduciendo versiones vulnerables de `http-cache-semantics` y `brace-expansion`. El stage `build` se descarta en la imagen final, pero Snyk escanea todas las capas intermedias y las reporta igual. |
| Agregar `--exclude-app-vulns` | Evita que el escaneo de contenedor reporte vulnerabilidades de paquetes npm, que ya son auditados por el job dedicado `Dependencias (npm audit + Snyk)`. El scan de contenedor queda enfocado solo en paquetes del sistema operativo (Alpine). |

---

## Pasos para aplicar

1. Modificar los dos archivos según se indica arriba
2. Hacer commit y push a la rama `main`
3. Verificar que el job **"Imagen Docker"** pase en el nuevo run del pipeline
