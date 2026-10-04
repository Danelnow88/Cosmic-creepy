# COSMIC ROLL — Prototipo 3D real 02

Proyecto independiente de NEON VOID. Primera entrega: 3 de octubre de 2026.

El objetivo es probar la correspondencia del juego actual con una presentación 3D, conservando combate, enemigos, pilotos, armas, especiales, oleadas, progresión y audio del snapshot local. El nombre es provisional y sirve para distinguir esta copia.

## Abrir en Windows

Desde la carpeta del Escritorio `COSMIC ROLL - Prototipo 3D real`, abrí **JUGAR COSMIC ROLL.cmd** o **COSMIC ROLL.exe**. No requiere Node, instalación ni conexión. Conservá toda la carpeta junto al ejecutable.

En el lobby elegí uno de los cuatro pilotos y pulsá JUGAR. WASD/flechas: mover; mouse/clic: apuntar/disparar; Shift: dash; Espacio: especial; P: pausa; F11: pantalla completa. El manual del juego mantiene el resto de controles.

El panel COSMIC ROLL permite comparar 3D y referencia 2D sin reiniciar la partida. La cámara está inclinada como en una mesa de pool; el control permite pasar de 30° a 62° para estudiar cómo se lee el avance y retroceso sobre el plano.

## Qué representa esta versión

- Se copió el motor real: aceleración, frenado, dash, ataques, colisiones, IA, datos y progresión. No hay una simulación alternativa inventada para esta demo.
- El espacio de representación es 3D. El combate conserva dos coordenadas sobre el plano de arena; la altura visual no concede evasión ni cambia las reglas.
- Cada piloto es una esfera geométrica real, con pinches, aros, ojos y color propios. La esfera y sus detalles rotan de acuerdo con el desplazamiento físico del jugador.
- Los enemigos son sólidos geométricos y el jefe es un sol tridimensional con núcleo esférico, pinches y anillos. Los proyectiles activos son esferas 3D.
- El suelo, cuadrícula, bordes, iluminación, niebla y sombras pertenecen a una escena 3D. El HUD y los menús permanecen en pantalla.
- La puntería transforma pantalla a espacio sobre el suelo 3D. Guardados, ajustes y perfil Windows pertenecen a esta aplicación independiente.

**Es una base de geometría 3D real, no un dibujo 2D extruido.** Todavía no es el remaster final: faltan modelos particulares por enemigo, VFX tridimensionales para cada ataque y una revisión artística completa de los cuatro pilotos. La altura sigue siendo visual; no añade salto ni cambia las reglas de combate.

No se cambió el código de la carpeta JuegoDemo ni se actualizaron sus builds. Esta copia contiene el snapshot local que existía al crearla, incluidas las mejoras de audio en curso; no se sincroniza automáticamente con trabajos posteriores del original.

## Estructura de los fuentes

En la entrega Windows, los fuentes editables están en `resources/app/`:

- `js/engine/`, `js/data/`, `js/audio/`: sistemas copiados del juego.
- `js/render/`: renderer original, disponible para la referencia 2D.
- `prototype/roll.js`: escena, cuerpos geométricos, rodamiento, cámara, proyectiles y puntería 3D.
- `prototype/roll.css`: panel de comparación.
- `js/game.js`: dos puntos de conexión de render y reubicación del HUD de oleada a la capa de pantalla, sin cambios a las reglas.
- `desktop/main.cjs`: contenedor independiente con perfil y protocolo propios, recursos locales y sin acceso Node desde el juego.
- `prototype/source-manifest.json`: hashes del snapshot de origen.
- `prototype/verify-source.cjs`: comprueba fuentes conservados y sintaxis.
- `desktop/verify.cjs` y `qa/`: comprobación integrada y capturas.
- `vendor/`: Three.js 0.160.0 fijado y licencia MIT, incluido localmente por compatibilidad con este estudio.

Con Node disponible, `node prototype/verify-source.cjs` desde `resources/app` comprueba la integridad de los archivos originales. Para repetir la comprobación real del EXE: `COSMIC ROLL.exe --depth-qa`; usa un perfil temporal, tarda unos segundos y escribe evidencias en `resources/app/qa`. El proyecto no necesita instalar paquetes npm para jugar.

## Próxima etapa

Validar la vista y el desplazamiento con el usuario. Después, reconstruir un piloto y una familia enemiga como modelos completos, conservando sus curvas de animación y paleta; comparar estados de ataque y muerte. Extender ese criterio al resto del plantel y traducir los efectos planos a geometría/materiales 3D. Revisar avisos y puntería antes de adoptar un ángulo definitivo.

Para el trabajo de fidelidad más exigente: GPT-6 Astra con razonamiento Extra alto. Alternativa equilibrada: GPT-6.1 Sol con Extra alto. Es una recomendación para este proyecto basada en la [guía oficial de selección de modelos](https://developers.openai.com/api/docs/guides/model-selection); disponibilidad según la cuenta.

## Guardados y licencias

El perfil Windows es `%APPDATA%/CosmicRollPrototype`, distinto al del original. El protocolo local es `depthgame://prototype`. No se importa progreso del original automáticamente.

El código y el arte del juego conservan su condición privada. Three.js usa MIT; se incluye `vendor/THREE-LICENSE.txt`. El runtime Electron conserva `LICENSE` y `LICENSES.chromium.html` en la raíz de la entrega. No se publicó ni distribuyó fuera del equipo.
