# AdrithStore — Recomendaciones de evolución

Este documento recoge oportunidades de mejora identificadas durante el desarrollo académico. No constituye una lista de funcionalidades implementadas ni una garantía de preparación para producción. La continuación profesional del proyecto se desarrolla por separado bajo el nombre N-Vor.

## Consolidación técnica

- **Integridad de ventas:** garantizar que inventario, venta, pagos y tesorería se confirmen o reviertan conjuntamente ante rechazos y fallos.
- **Concurrencia:** evitar pérdida de movimientos por operaciones simultáneas y formularios con datos desactualizados; impedir dobles anulaciones.
- **Permisos:** definir y verificar una matriz de autorización por operación y dato, incluyendo costos, exportaciones y respuestas de API.
- **Compras:** verificar las implementaciones existentes de descuentos, percepción, bonificaciones, reposición con stock cero/negativo y validación de productos duplicados. Conservar las reglas aprobadas y contrastar las pruebas antes de ampliar el flujo.

## Evolución funcional

- **Ajustes, anulaciones y devoluciones:** definir políticas de valoración y reversión financiera después de movimientos posteriores, con trazabilidad y protección contra duplicados.
- **Servicios y analítica:** calcular costos autoritativos en backend y aplicar filtros consistentes a ingresos y costos. Distinguir principal movilizado, comisión y costo directo real.
- **Costos de productos:** diferenciar costo faltante de cero válido; separar edición general, apertura y revalorización con motivo e historial.
- **Precisión:** mostrar costos/CPP con dos decimales en frontend y conservar cuatro decimales en backend para cálculo y almacenamiento. Redondear de forma explícita al conciliar importes monetarios finales.
- **Inventario inicial:** registrar cantidad y valor de apertura; definir límites de ciclo para que documentos anteriores no alteren un inventario reiniciado.
- **Transformación de productos:** estudiar consumo de insumos, resultados, mermas, transferencia de valor y reversión como una operación propia y auditable. Requiere reglas de negocio antes de implementar.

## Infraestructura y evaluación

- Validar las métricas ya incorporadas y recoger una línea base real de actividad, latencia, errores, JVM y conexiones.
- Evaluar PostgreSQL administrado y despliegue cloud en entornos de prueba, verificando latencia, consumo, persistencia de imágenes, backup y restauración antes de producción.
- Evitar consultas periódicas innecesarias del monitor y distinguir métricas medidas, estimadas y no disponibles.

## Ampliaciones profesionales propuestas

N-Vor podrá evaluar soporte para sucursales y despliegues independientes por cliente con un código común. Estas capacidades no se declaran implementadas en AdrithStore.

## Criterio académico

Priorizar integridad, autorización y pruebas antes de añadir módulos. Conservar costos históricos y no recalcular datos masivamente sin una política aprobada. Cerrar la etapa académica no equivale a resolver todos los defectos conocidos.

El respaldo completo de los issues, sus reglas y comentarios se conserva por separado para la continuidad profesional. Este resumen no lo sustituye. La auditoría de credenciales en el historial permanece como pendiente de seguridad, no como una función opcional.