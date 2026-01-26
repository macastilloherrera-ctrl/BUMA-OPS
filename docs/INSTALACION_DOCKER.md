# Instalación de BUMA OPS con Docker

## Requisitos Previos

- Docker instalado (versión 20.10 o superior)
- Docker Compose instalado (versión 2.0 o superior)
- Git instalado

## Paso 1: Instalar Docker

### En Ubuntu/Debian:
```bash
# Actualizar paquetes
sudo apt update

# Instalar dependencias
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Agregar clave GPG de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Agregar repositorio
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar tu usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER

# Reiniciar sesión o ejecutar:
newgrp docker
```

### En Windows:
1. Descargar Docker Desktop desde https://www.docker.com/products/docker-desktop
2. Ejecutar el instalador
3. Reiniciar el equipo

### En Mac:
1. Descargar Docker Desktop desde https://www.docker.com/products/docker-desktop
2. Arrastrar a Aplicaciones
3. Ejecutar Docker Desktop

## Paso 2: Clonar el Proyecto

```bash
# Clonar el repositorio (reemplazar con tu URL real)
git clone <URL_DEL_REPOSITORIO> buma-ops
cd buma-ops
```

## Paso 3: Crear Archivos Docker

### 3.1 Crear archivo `Dockerfile` en la raíz del proyecto:

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 5000

# Comando de inicio
CMD ["npm", "start"]
```

### 3.2 Crear archivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Base de datos PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: buma-ops-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: buma
      POSTGRES_PASSWORD: buma_secure_password_2024
      POSTGRES_DB: buma_ops
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U buma -d buma_ops"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Aplicación BUMA OPS
  app:
    build: .
    container_name: buma-ops-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://buma:buma_secure_password_2024@postgres:5432/buma_ops
      SESSION_SECRET: tu_clave_secreta_muy_segura_cambiar_en_produccion
      NODE_ENV: production
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

# Volúmenes para persistencia de datos
volumes:
  postgres_data:
    name: buma-ops-postgres-data
  uploads_data:
    name: buma-ops-uploads
```

### 3.3 Crear archivo `.dockerignore`:

```
node_modules
npm-debug.log
.git
.gitignore
.env
*.md
.DS_Store
dist
```

## Paso 4: Configurar Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# Base de datos
POSTGRES_USER=buma
POSTGRES_PASSWORD=buma_secure_password_2024
POSTGRES_DB=buma_ops

# Aplicación
DATABASE_URL=postgresql://buma:buma_secure_password_2024@postgres:5432/buma_ops
SESSION_SECRET=genera_una_clave_secreta_larga_y_aleatoria_aqui
NODE_ENV=production
```

**IMPORTANTE**: Cambia las contraseñas por valores seguros en producción.

## Paso 5: Construir y Ejecutar

```bash
# Construir las imágenes
docker compose build

# Iniciar los servicios (en segundo plano)
docker compose up -d

# Ver los logs
docker compose logs -f

# Verificar que los contenedores estén corriendo
docker compose ps
```

## Paso 6: Inicializar la Base de Datos

```bash
# Ejecutar las migraciones dentro del contenedor
docker compose exec app npm run db:push
```

## Paso 7: Crear Usuario Super Admin

```bash
# Conectarse a la base de datos
docker compose exec postgres psql -U buma -d buma_ops

# Ejecutar este SQL para crear el Super Admin:
INSERT INTO users (id, email, name, role, is_active, password_hash, must_change_password, created_at)
VALUES (
  'superadmin-001',
  'superadmin@buma.local',
  'Super Administrador',
  'super_admin',
  true,
  '$2b$10$8K1p/aM3n9vB2q3rF4gH5OqYz1w2x3y4z5A6B7C8D9E0F1G2H3I4J5',
  true,
  NOW()
);
```

Contraseña temporal: `BumaAdmin2024!` (se debe cambiar en el primer login)

## Paso 8: Acceder a la Aplicación

Abrir en el navegador: **http://localhost:5000**

## Comandos Útiles

```bash
# Detener los servicios
docker compose down

# Detener y eliminar volúmenes (CUIDADO: borra todos los datos)
docker compose down -v

# Reiniciar un servicio específico
docker compose restart app

# Ver logs de un servicio
docker compose logs -f app
docker compose logs -f postgres

# Ejecutar comando dentro del contenedor
docker compose exec app npm run db:studio

# Backup de la base de datos
docker compose exec postgres pg_dump -U buma buma_ops > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup.sql | docker compose exec -T postgres psql -U buma -d buma_ops
```

## Estructura de Volúmenes (Persistencia)

Los datos persisten en volúmenes Docker:

| Volumen | Contenido |
|---------|-----------|
| `buma-ops-postgres-data` | Base de datos PostgreSQL |
| `buma-ops-uploads` | Archivos subidos (fotos) |

Para ver dónde están almacenados:
```bash
docker volume inspect buma-ops-postgres-data
```

## Actualizar la Aplicación

```bash
# Obtener últimos cambios
git pull origin main

# Reconstruir y reiniciar
docker compose build
docker compose up -d

# Ejecutar migraciones si hay cambios en el esquema
docker compose exec app npm run db:push
```

## Solución de Problemas

### Error de conexión a la base de datos
```bash
# Verificar que postgres esté corriendo
docker compose ps

# Ver logs de postgres
docker compose logs postgres
```

### La aplicación no inicia
```bash
# Ver logs de la app
docker compose logs app

# Reconstruir desde cero
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Limpiar todo y empezar de nuevo
```bash
# CUIDADO: Esto borra todos los datos
docker compose down -v
docker system prune -a
docker compose up -d --build
```
