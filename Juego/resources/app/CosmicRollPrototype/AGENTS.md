# COSMIC ROLL: fidelidad antes de ampliar

Este proyecto es una copia independiente del juego NEON VOID para estudiar un remaster visual 3D. No edites el original en C:/Users/party/Desktop/JuegoDemo como parte de esta tarea.

Leé README.md y el informe qa/report.json vigente antes de continuar. El prototipo usa cuerpos, jefe y proyectiles geométricos 3D reales; no lo describas como un remaster final completo.

Mantené las autoridades actuales de gameplay. No inventes otra IA, física, progresión o balance para facilitar el render. Conservá las curvas canónicas de pilotos y el concepto de enemigos, avisos y ataques. La altura actual es visual, no jugable. El HUD es plano y su hit testing debe conservarse.

Los principales archivos nuevos son prototype/roll.js, prototype/roll.css y desktop/main.cjs. js/game.js añade begin y compose en el pipeline de dibujo y reubica el HUD de oleada a pantalla. Cualquier cambio de mecánicas necesita una solicitud explícita.

Verificá con prototype/verify-source.cjs y el EXE --depth-qa. Las pruebas usan perfiles temporales. Revisá capturas reales además de resultados automáticos. Guardados y configuración de esta copia pertenecen a CosmicRollPrototype.

No publiques, hagas commit ni push por una petición de experimentación local. No sobrescribas ni borres builds previas. Preservá licencias del runtime y de Three.js.
