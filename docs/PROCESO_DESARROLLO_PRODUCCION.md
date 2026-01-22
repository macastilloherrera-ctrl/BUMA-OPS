# Proceso de Desarrollo y Producción - BUMA OPS

Este documento describe el flujo de trabajo para identificar errores, corregirlos y desplegar cambios de manera segura.

## Entornos

### Entorno de Desarrollo
- **URL**: La URL del Repl (ej: `https://tu-repl.replit.app`)
- **Base de datos**: Base de datos de desarrollo (separada de producción)
- **Propósito**: Realizar cambios, pruebas y correcciones sin afectar usuarios reales

### Entorno de Producción
- **URL**: La URL publicada (ej: `https://ops.buma.cl` o `tu-app.replit.app`)
- **Base de datos**: Base de datos de producción con datos reales
- **Variable identificadora**: `REPLIT_DEPLOYMENT=1`

## Flujo de Trabajo para Corrección de Errores

### Paso 1: Identificar el Error

**En Producción:**
1. Acceder al panel de publicación en Replit
2. Ir a la pestaña "Logs" para ver registros en tiempo real
3. Revisar la pestaña "Resources" para métricas de rendimiento
4. Documentar el error: mensaje, hora, usuario afectado, pasos para reproducir

**Reportes de Usuarios:**
- Solicitar capturas de pantalla
- Pedir descripción detallada de los pasos realizados
- Identificar el navegador y dispositivo utilizado

### Paso 2: Reproducir en Desarrollo

1. Abrir el entorno de desarrollo (este Repl)
2. Intentar replicar el escenario reportado
3. Usar los logs del servidor para identificar la causa raíz
4. Si es necesario, revisar la base de datos de desarrollo

### Paso 3: Implementar la Corrección

1. Realizar los cambios necesarios en el código
2. El servidor de desarrollo se reinicia automáticamente
3. Probar la corrección en el entorno de desarrollo
4. Verificar que no se hayan introducido nuevos errores

### Paso 4: Pruebas Antes de Publicar

**Pruebas Mínimas Recomendadas:**
- [ ] El error original está corregido
- [ ] Las funcionalidades relacionadas siguen funcionando
- [ ] Login/logout funciona correctamente
- [ ] Las operaciones principales (crear ticket, ver tickets, etc.) funcionan

### Paso 5: Publicar los Cambios

1. Hacer clic en "Publish" en Replit
2. Confirmar la publicación
3. Esperar a que el despliegue complete
4. Verificar que la aplicación esté funcionando en producción

### Paso 6: Verificación Post-Publicación

1. Acceder a la URL de producción
2. Probar la funcionalidad corregida
3. Revisar los logs de producción para confirmar que no hay errores
4. Notificar a los usuarios afectados que el problema está resuelto

## Rollback (Revertir Cambios)

### Si algo sale mal después de publicar:

**Opción 1: Checkpoints (Código + Desarrollo)**
- Replit crea checkpoints automáticos durante el desarrollo
- Puedes revertir: código, conversación con el agente, base de datos de desarrollo
- Acceder desde el panel de checkpoints en Replit

**Opción 2: Restauración de Base de Datos de Producción**
- Disponible restauración a un punto en el tiempo específico
- Útil si se corrompieron datos en producción
- Acceder desde el panel de base de datos en Replit

**Opción 3: Corrección Rápida**
- Implementar una corrección inmediata en desarrollo
- Publicar la corrección lo antes posible

## Mejores Prácticas

### Durante el Desarrollo
1. **Probar exhaustivamente** antes de publicar
2. **Documentar cambios** significativos en el código
3. **Hacer commits frecuentes** para tener puntos de restauración

### Para Errores Críticos
1. Evaluar el impacto en los usuarios
2. Considerar deshabilitar temporalmente la funcionalidad afectada
3. Comunicar a los usuarios sobre el problema y tiempo estimado de solución

### Registro de Errores
Mantener un registro de errores encontrados y sus soluciones:

| Fecha | Error | Causa | Solución | Publicado |
|-------|-------|-------|----------|-----------|
| 2026-01-21 | Fotos no se guardaban al crear ticket | URL de API incorrecta | Corregir ruta a /api/tickets/:id/photos | Sí |
| 2026-01-21 | Fecha mostraba día anterior | Conversión UTC incorrecta | Extraer fecha del string ISO directamente | Sí |

## Variables de Entorno por Ambiente

```javascript
// Detectar si estamos en producción
const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

// Ejemplo de uso
if (isProduction) {
  // Comportamiento de producción (menos logs detallados)
} else {
  // Comportamiento de desarrollo (más logs para debugging)
}
```

## Contacto para Soporte Técnico

Para problemas que requieran asistencia adicional:
1. Documentar el error con capturas y logs
2. Contactar al equipo de desarrollo
3. Para problemas de la plataforma Replit, contactar soporte de Replit

---

*Documento creado: Enero 2026*
*Última actualización: Enero 2026*
