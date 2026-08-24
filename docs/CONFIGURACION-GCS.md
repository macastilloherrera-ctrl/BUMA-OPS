# Configurar Google Cloud Storage para archivos de BUMA OPS

El código ya está listo para GCS. Falta crear el bucket y cargar tres variables
en Railway. Hasta que eso ocurra, subir un archivo devuelve un **503 con un
mensaje claro** ("El almacenamiento de archivos no está configurado"), no un
error opaco.

## Contexto

Antes el storage apuntaba al *sidecar de Replit* (`127.0.0.1:1106`), que no
existe en Railway. Por eso, desde la migración, **ninguna** subida funcionaba:
ni boletas de egresos, ni fotos de tickets, ni fotos de visitas, ni archivos de
edificios. Configurar esto revive todo junto.

---

## Parte 1 — En Google Cloud (una sola vez)

1. **Proyecto**: en https://console.cloud.google.com elegí un proyecto o creá
   uno nuevo (ej. `buma-ops`). Anotá el **Project ID** (no el nombre).

2. **Activar la API**: buscá "Cloud Storage API" en la consola y activala.

3. **Crear el bucket**: Cloud Storage → Buckets → *Create*.
   - Nombre: `buma-ops-archivos` (debe ser único a nivel global; si lo toma otro,
     agregá un sufijo).
   - Región: `southamerica-west1` (Santiago) para menor latencia.
   - Clase: *Standard*.
   - Control de acceso: **Uniform**.
   - **Dejá activado** "Prevent public access" — los archivos se sirven a través
     de OPS, que valida permisos y alcance de edificios antes de entregarlos.

4. **Crear la cuenta de servicio**: IAM y administración → Cuentas de servicio →
   *Crear*.
   - Nombre: `buma-ops-storage`.
   - Rol: **Storage Object Admin** (`roles/storage.objectAdmin`). Alcanza para
     leer, escribir y firmar; no le des permisos de administrador del proyecto.

5. **Descargar la llave**: entrá a la cuenta creada → pestaña *Claves* →
   *Agregar clave* → *Crear clave nueva* → **JSON**. Se descarga un archivo.
   Guardalo en un lugar seguro: **es una credencial, no la subas al repo.**

6. **CORS del bucket** (necesario porque el navegador sube el archivo directo al
   bucket). Creá un archivo `cors.json`:

   ```json
   [
     {
       "origin": ["https://ops.buma.cl"],
       "method": ["PUT", "GET", "HEAD"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

   y aplicalo con la CLI de Google Cloud:

   ```
   gcloud storage buckets update gs://buma-ops-archivos --cors-file=cors.json
   ```

   Si no aplicás esto, la subida falla en el navegador con un error de CORS
   aunque el resto esté bien.

---

## Parte 2 — Variables en Railway

Proyecto `heartfelt-upliftment` → servicio `BUMA-OPS` → pestaña *Variables*.

| Variable | Valor |
|---|---|
| `GCS_SERVICE_ACCOUNT_KEY` | El contenido del JSON del paso 5. Se acepta el JSON tal cual **o** en base64 (recomendado en Railway, que maneja mal los saltos de línea). |
| `PRIVATE_OBJECT_DIR` | `/buma-ops-archivos/private` — o sea `/<nombre-del-bucket>/private`. Ajustá el nombre si usaste otro. |
| `GCS_PROJECT_ID` | *(opcional)* El Project ID del paso 1. Si lo omitís, se toma del JSON. |

Para generar la versión base64 de la llave:

```
# Linux / macOS
base64 -w0 buma-ops-storage.json

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("buma-ops-storage.json"))
```

Railway redeploya solo al guardar las variables.

---

## Parte 3 — Verificar

1. Entrá a **Egresos**, abrí un egreso y usá *Adjuntar boleta*. Subí un PDF.
2. Guardá y confirmá que en la columna **Boleta** aparece el ícono de descarga.
3. Hacé clic y verificá que el archivo baja correctamente.

Chequeo rápido por consola (con sesión iniciada, debe devolver `uploadURL`):

```
POST https://ops.buma.cl/api/uploads/request-url
{"name":"prueba.pdf","size":100,"contentType":"application/pdf"}
```

- **503** → faltan variables o están mal cargadas.
- **401** → no hay sesión iniciada.
- **200 con `uploadURL`** → configurado correctamente.

---

## Notas

- El bucket queda **privado**. Las descargas pasan siempre por
  `GET /objects/*`, que verifica sesión, rol y alcance de edificios, y **deniega
  archivos que no estén catalogados** en la base.
- Las boletas se guardan en la tabla `attachments` con
  `entity_type = "expense"`, así que un egreso admite **varias**.
- Límites actuales en la pantalla de Egresos: hasta 5 archivos por egreso, 10 MB
  cada uno.
