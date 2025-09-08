# 🛡️ CÓMO ACTIVAR EL MONITOR DE SEGURIDAD

## Para Desarrolladores:

### Opción 1: Desde la consola del navegador
```javascript
// Activar modo desarrollador
enableDevMode()

// Luego recargar la página
location.reload()
```

### Opción 2: Agregar parámetro en la URL
```
http://localhost:5173/#/?dev=true
```

### Opción 3: localStorage directo
```javascript
localStorage.setItem('isDeveloper', 'true')
location.reload()
```

## Para desactivar:
```javascript
disableDevMode()
location.reload()
```

## ¿Por qué no aparece?
1. **Solo funciona en localhost** (modo desarrollo)
2. **Necesitas activar el modo desarrollador** primero
3. **Solo aparece si hay eventos de seguridad** registrados

## Testing rápido:
1. Activar con `enableDevMode()` en consola
2. Recargar página
3. Intentar login fallido varias veces
4. El botón rojo 🛡️ debería aparecer
