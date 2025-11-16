# Formato Estándar para Documentos Estáticos y Dinámicos

## Estructura General

Cada documento debe seguir esta estructura exacta para que el sistema pueda identificar y procesar las secciones correctamente.

## Reglas de Formato

### 1. Títulos de Sección
- **Formato obligatorio**: `N. Título de la Sección` (donde N es el número de sección)
- El título DEBE estar en un párrafo completamente separado
- NO debe haber contenido en la misma línea que el título
- Ejemplo correcto:
  ```
  1. Objeto y Alcance de la Propuesta
  ```
- ❌ Incorrecto:
  ```
  1. Objeto y Alcance de la Propuesta Este es el contenido...
  ```

### 2. Sección 0 (Introducción)
- Todo el contenido ANTES de la primera sección numerada es la Sección 0
- No necesita título numerado
- Puede tener múltiples párrafos
- Ejemplo:
  ```
  Este es el contenido de introducción.
  Puede tener múltiples párrafos.
  
  1. Primera Sección Numerada
  ```

### 3. Contenido de Secciones
- El contenido de cada sección va DESPUÉS del título, en párrafos separados
- Puede tener múltiples párrafos
- Puede incluir listas, tablas, etc.
- Ejemplo:
  ```
  1. Objeto y Alcance de la Propuesta
  
  Este es el primer párrafo del contenido.
  
  Este es el segundo párrafo.
  
  - Lista de puntos
  - Otro punto
  
  2. Siguiente Sección
  ```

### 4. Separación entre Secciones
- DEBE haber al menos un párrafo vacío entre el final de una sección y el título de la siguiente
- Ejemplo:
  ```
  1. Primera Sección
  
  Contenido de la primera sección.
  
  2. Segunda Sección
  
  Contenido de la segunda sección.
  ```

## Ejemplo Completo de Documento

```
Este es el contenido de introducción de la propuesta.
Puede incluir información general sobre el proyecto.

1. Objeto y Alcance de la Propuesta

El objeto de esta propuesta es definir el alcance del proyecto...

Este párrafo también forma parte de la sección 1.

2. Metodología de Trabajo

La metodología que se utilizará incluye las siguientes fases:

- Fase 1: Análisis
- Fase 2: Diseño
- Fase 3: Implementación

3. Cronograma

El cronograma del proyecto se detalla a continuación...

4. Presupuesto

El presupuesto estimado es el siguiente...
```

## Documentos Estáticos vs Dinámicos

### Documento Estático
- Contiene TODAS las secciones con su contenido completo
- Las secciones que también existen en el documento dinámico se marcan como "dinámicas" pero tienen contenido de ejemplo
- Ejemplo:
  ```
  1. Objeto y Alcance de la Propuesta
  
  [Contenido estático que se copiará tal cual]
  
  2. Metodología de Trabajo
  
  [Contenido estático]
  
  3. Cronograma
  
  [Contenido estático]
  ```

### Documento Dinámico
- Contiene SOLO las secciones que son dinámicas (editables)
- Las secciones dinámicas pueden tener contenido de ejemplo o estar vacías
- El sistema identificará qué secciones son dinámicas comparando ambos documentos
- Ejemplo:
  ```
  1. Objeto y Alcance de la Propuesta
  
  [Este contenido será reemplazado por el usuario]
  
  3. Cronograma
  
  [Este contenido será reemplazado por el usuario]
  ```

## Reglas Importantes

1. ✅ **SÍ hacer**:
   - Usar formato `N. Título` para todas las secciones numeradas
   - Poner cada título en su propio párrafo
   - Dejar párrafos vacíos entre secciones
   - Mantener la numeración consecutiva (1, 2, 3, ...)

2. ❌ **NO hacer**:
   - Mezclar título y contenido en el mismo párrafo
   - Usar formatos como "Sección 1:", "1-", "1)", etc. (solo `N.`)
   - Saltar números en la numeración (1, 2, 4, 5 - falta el 3)
   - Poner contenido antes del título en la misma línea

## Notas Técnicas

- El sistema identifica secciones usando el patrón: `^(\d+)\.\s*(.+)$`
- El `startIndex` de cada sección es el índice del párrafo que contiene el título
- El contenido se inserta después del final del párrafo del título
- La sección 0 no tiene título numerado y es todo el contenido antes de "1."

