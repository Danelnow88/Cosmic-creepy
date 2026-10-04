# PROMPT MAESTRO — NEON VOID convertido a 3D real

Quiero que trabajes directamente sobre el prototipo local **COSMIC ROLL** y hagas una pasada visual integral, ambiciosa y ejecutable. No quiero solamente un análisis, un documento de diseño, una maqueta estática ni una lista de ideas: inspeccioná las referencias, implementá la mejora completa que permita la cuota disponible, probala visualmente y dejá una entrega Windows jugable.

## Proyectos y autoridad

- Proyecto objetivo editable: `C:\Users\party\Desktop\COSMIC ROLL - Prototipo 3D real\resources\app`
- Ejecutable contenedor del objetivo: `C:\Users\party\Desktop\COSMIC ROLL - Prototipo 3D real\COSMIC ROLL.exe`
- Juego original de referencia, **solo lectura**: `C:\Users\party\Desktop\JuegoDemo`
- Leé primero `AGENTS.md`, `README.md`, `qa/report.json`, `prototype/roll.js`, `prototype/roll.css`, `js/game.js` y el informe `C:\Users\party\Desktop\JuegoDemo\docs\INVESTIGACION_REMASTER_3D_2026-10-02.md`.
- El original 2D es la autoridad artística y funcional. COSMIC ROLL es la superficie de implementación.
- No modifiques, recompiles, empaquetes ni ensucies `JuegoDemo`. No publiques, no hagas push y no reemplaces entregas anteriores.

## Objetivo exacto

Convertí este prototipo en la traducción tridimensional más fiel y visualmente rica posible de **NEON VOID**. Tiene que sentirse como el mismo juego, con su misma identidad synthwave/cósmica, su misma claridad de combate y sus mismas familias visuales, pero encarnado en cuerpos, materiales, luces, partículas y espacio 3D reales.

La cámara y el desplazamiento deben comunicar una esfera rodando sobre un terreno, como la lectura espacial de una bola de pool sobre una mesa vista en perspectiva. Adelante, atrás, izquierda y derecha tienen que leerse inmediatamente como movimiento sobre profundidad real. La comparación con pool describe la cámara, la escala, el rodamiento y la sensación de superficie; **no conviertas la dirección artística en una mesa de pool literal**. El mundo sigue siendo NEON VOID: oscuro, cósmico, energético, hostil y de neón.

Conservá la simulación 2D como autoridad: `(x, y)` del gameplay corresponde a `(x, altura visual, z)` en Three.js. La altura es decorativa. No agregues salto, física vertical, gravedad jugable, nueva IA, cambios de daño, hitboxes, velocidades, cooldowns, spawns, progresión o balance. El render observa al motor; nunca decide resultados de combate.

## Forma de trabajar

Actuá con autonomía. No te detengas después de proponer un plan y no pidas confirmación para decisiones visuales reversibles. Primero inspeccioná el juego original en movimiento y sus fuentes visuales; después implementá. Usá capturas reales del original y del prototipo durante el trabajo. Iterá sobre las capturas hasta que la mejora sea evidente al tamaño normal de juego, no solamente en primeros planos.

Antes de editar, identificá las funciones 2D que dibujan pilotos, enemigos, jefes, proyectiles, warnings, dash, impactos, muerte, escenarios y especiales. Construí internamente una correspondencia entre cada señal 2D y su equivalente 3D. No hace falta entregarme esa tabla antes de actuar.

Trabajá principalmente en el renderer 3D y sus módulos nuevos. Hacé los cambios mínimos imprescindibles en `js/game.js` para exponer estados visuales faltantes. Si el puente actual no entrega algún evento necesario, agregá un adaptador de presentación que lea el estado existente sin duplicar ni alterar la lógica.

No dependas de CDN ni de descargas durante la ejecución. La entrega tiene que seguir abriendo offline. Reutilizá Three.js 0.160.0 local. Podés agregar módulos, shaders, geometrías, texturas procedurales y recursos locales. Evitá un framework o pipeline de build nuevo salvo que sea realmente necesario y quede incorporado en la entrega.

## Prioridad 1: sensación de avance y terreno

El defecto más visible hoy es que el suelo parece una cuadrícula azul estática y no transmite suficiente avance. Reconstruí el escenario para que el movimiento tenga profundidad y velocidad perceptibles incluso cuando la cámara sigue al jugador.

Combiná varias pistas coherentes:

- superficie 3D cósmica con variación de escala, detalles cercanos y líneas de fuga hacia la profundidad;
- marcas, filamentos, grietas de energía, polvo, fragmentos y hitos anclados al mundo que crucen el encuadre al desplazarse;
- parallax en al menos tres profundidades: terreno, elementos bajos y fondo lejano;
- respuesta visual a la velocidad real del jugador: flujo de partículas, compresión o extensión de estela, rodamiento correcto y acentos durante dash;
- horizonte, niebla y gradiente de profundidad que permitan leer qué está cerca y qué está lejos;
- sombras de contacto y oclusión visual bajo cuerpos para evitar que floten sin intención;
- bordes o límites de arena integrados al universo, legibles pero sin parecer paredes de debug;
- cámara con seguimiento amortiguado, look-ahead moderado según velocidad y apuntado, y encuadre estable durante combate. No introduzcas mareo, retraso de control ni pérdida de información.

Los elementos del terreno deben permanecer anclados a coordenadas de mundo. Las partículas de velocidad pueden responder al movimiento, pero no falsifiques la posición de enemigos o ataques. Eliminá la apariencia de grilla de prototipo/debug. Si conservás líneas, convertilas en circuitos, filamentos o corrientes de energía con jerarquía visual irregular.

Traducí los cuatro escenarios del original —nebulosa/luna, forja estelar, fractura espacial y singularidad— a variantes 3D reconocibles. Si el motor no expone todavía la región, obtenela del estado existente. Cada una debe compartir lenguaje visual pero tener paleta, fondo, terreno, hitos y atmósfera propios. Priorizá que al menos la región visible durante la prueba automática quede terminada y construí las otras sobre el mismo sistema parametrizado.

## Prioridad 2: pilotos realmente diseñados

Rehacé los cuatro pilotos como personajes energéticos 3D reconocibles y distintos. No alcanza con cambiar el color de una esfera ni colocar conos genéricos.

- **BOTI:** identidad radial entrelazada, sensación de núcleo protegido y piezas que se abrazan alrededor del cuerpo.
- **NOVA:** radial puntiaguda, agresiva y luminosa; explosión contenida, con picos bien jerarquizados.
- **ROOK:** alternancia clara de picos largos y cortos, masa más firme y lectura defensiva.
- **ENJAMBRE:** angular, asimétrico y compuesto; debe sugerir varias partes coordinadas sin perder un centro controlable.

Usá capas reales: núcleo, envolvente, placas o lóbulos, detalles orbitantes, ojos/rostro, Fresnel, emisión y pulsación. Conservá paletas, proporciones, ojos, órbitas, siluetas y ritmos del original. Las caras antes invisibles necesitan diseño deliberado; no extruyas ciegamente el contorno 2D.

El cuerpo principal debe rodar de acuerdo con distancia y dirección reales. Separá de esa rotación los ojos, el indicador de orientación y los componentes que deban mirar hacia cámara o hacia el apuntado, para que el personaje siga siendo legible. El rodamiento no puede hacer que la identidad se vuelva ruido. Agregá squash, vibración o pulsación visual sutil para reposo, aceleración, daño, especial y muerte, alimentadas por estados reales.

## Prioridad 3: enemigos y jefes con identidad

No representes a toda la plantilla mediante tetraedros, dodecaedros o icosaedros intercambiables. Reconstruí un vocabulario modular que traduzca cada familia 2D a una silueta volumétrica propia: núcleo, caparazón, apéndices, ojos, mandíbulas, anillos, tentáculos, placas, alas o satélites según corresponda al dibujo y comportamiento original.

Cada enemigo debe conservar:

- silueta reconocible a escala real de combate;
- orientación y mirada;
- ritmo corporal durante movimiento;
- preparación inequívoca de ataques;
- estado de impacto, daño y muerte;
- color funcional y señales de peligro del original.

Los jefes deben sentirse como soles o entidades astrales tridimensionales: núcleos de varias capas, picos construidos, coronas, anillos, prominencias, órbitas y deformaciones propias. No uses el mismo sol genérico para los diez jefes. Creá una base técnica común, pero derivá perfiles visuales según identidad y ataque. El jefe visible en la QA debe recibir acabado de pieza central: silueta fuerte, animación, luz local, ataques legibles y muerte satisfactoria.

Mantené la jerarquía: jugador legible primero, amenaza activa después, decoración al final. Evitá que emisión, transparencia o geometría oculten huecos seguros.

## Prioridad 4: VFX tridimensionales completos

Traducí los efectos del original a 3D. No dejes esferas lisas como representación final de todos los proyectiles.

Implementá un sistema reutilizable y con pooling para:

- disparos del jugador con núcleo, halo, estela y variación por arma;
- proyectiles hostiles con forma por familia;
- rojo como amenaza activa, amarillo secundario cuando puede aturdir y blanco como impacto;
- muzzle flash, impactos contra enemigo/suelo, chispas, fragmentos y ondas;
- dash con estela estelar volumétrica o cinta energética coherente con la velocidad;
- spawn warning con el triángulo violeta y exclamación del original, proyectado o elevado sobre el terreno y perfectamente legible;
- aparición, daño, invulnerabilidad, muerte y recolección;
- láseres con núcleo, halo, origen y contacto visibles;
- ondas, áreas de efecto y telegráficos pegados al plano de combate sin alterar su radio lógico;
- hook, especiales de los cuatro pilotos y ataques de jefe;
- partículas ambientales que refuercen profundidad sin confundirse con proyectiles.

Los efectos deben nacer, viajar y terminar en las coordenadas y tiempos reales del motor. Aislá el azar cosmético para no consumir la misma secuencia aleatoria que gameplay. Un cambio de FPS no debe cambiar timings funcionales.

## Materiales, luz y acabado

Busco la calidad visual y la energía de NEON VOID 2D, reinterpretadas en 3D, no realismo físico apagado. Usá una mezcla controlada de materiales oscuros, núcleos emisivos, bordes Fresnel, transparencias ordenadas, pulsos y luces locales. El color debe sobrevivir al tone mapping sin quemarse en manchas blancas.

Mejorá:

- iluminación principal y de relleno por escenario;
- luces locales limitadas en jugador, jefe y eventos importantes;
- sombras suaves o blobs/contact shadows donde den profundidad;
- glow/bloom selectivo, mediante postproceso local o una alternativa eficiente propia;
- antialiasing, resolución adaptable y manejo correcto de DPR;
- niebla y profundidad sin lavar amenazas;
- composición de color para que UI, jugador y peligro mantengan contraste;
- animación procedural con curvas suaves y sin vibraciones accidentales.

Si implementás bloom, no hagas brillar todo. Debe distinguir energía fuerte de superficies normales. Si la transparencia causa artefactos, resolvé la estructura con capas, depthWrite/depthTest apropiados o materiales aditivos reservados para halos.

## Cámara, control y legibilidad

Conservá la cámara perspectiva tipo mesa que finalmente entendió el concepto. Elegí un ángulo base convincente tras comparar capturas, manteniendo el control de inclinación para diagnóstico. El eje hacia el fondo debe leerse como adelante; el eje hacia cámara, como atrás.

La transformación cursor→plano debe seguir siendo exacta. Verificá apuntado en centro, esquinas y con distintas relaciones de aspecto. Conservá HUD y menús en pantalla, nítidos y separados del mundo. Los warnings, radios de peligro y proyectiles no pueden quedar escondidos detrás de cuerpos 3D; usá altura, contorno, transparencia o capas cuando sea necesario.

No conviertas esto en cámara libre, tercera persona detrás del personaje ni arena con rotación de cámara. El objetivo es el mismo juego visto como un diorama/mesa cósmica 3D en perspectiva.

## Rendimiento y arquitectura

El combate real puede tener muchos cuerpos y partículas. Evitá crear y destruir geometrías o materiales cada frame. Compartí geometrías/materiales, usá pools, instancing donde tenga sentido y liberá recursos al cambiar estado. Establecé niveles de detalle visuales que reduzcan solamente decoración y partículas, nunca entidades o señales funcionales.

No introduzcas mutaciones desde render hacia las entidades salvo cachés visuales claramente aisladas. No cambies el orden de actualización. No llames `Math.random()` cosmético en rutas que puedan afectar el azar funcional. Conservá la vista 2D de comparación mientras no interfiera con el acabado 3D.

## Criterios obligatorios de aceptación

Antes de dar por terminado el trabajo, verificá todo esto:

1. Al mantener una dirección durante varios segundos, el suelo, los hitos, el parallax, el rodamiento y la cámara producen una sensación clara de avance o retroceso.
2. En una captura normal se distingue sin explicación al piloto del enemigo común y del jefe; no parecen primitivas de debug.
3. BOTI, NOVA, ROOK y ENJAMBRE tienen siluetas distintas, no solamente colores distintos.
4. El jefe de prueba se ve como una entidad solar compleja, no como una esfera con conos uniformes.
5. Disparos, impactos, dash, spawn warning, daño y muerte tienen representación 3D animada.
6. El lenguaje rojo/amarillo/blanco de amenazas conserva su función.
7. El apuntado con mouse coincide con el plano y las colisiones siguen resolviéndose por el motor original.
8. Pausa congela la simulación y los efectos ligados a ella; menús y HUD siguen funcionando.
9. No hay errores de consola, recursos remotos, geometrías acumulándose indefinidamente ni caída evidente de rendimiento en la escena densa de QA.
10. `node --preserve-symlinks-main prototype/verify-source.cjs` pasa, o documentás de forma precisa cualquier diferencia intencional del puente.
11. `COSMIC ROLL.exe --depth-qa` pasa con los cuatro pilotos, movimiento, dash, especial, pausa, alternancia 2D/3D, jefe, cursor y resize.
12. Revisaste capturas de al menos: movimiento sostenido, cada piloto, combate denso, spawn warning y jefe. No aceptes la tarea basándote únicamente en tests de código.

## Entrega

Dejá el prototipo jugable desde `JUGAR COSMIC ROLL.cmd`. Conservá el perfil independiente y el funcionamiento offline. No borres la entrega anterior: si el cambio requiere empaquetar otra carpeta, usá un nombre nuevo con fecha o versión. Actualizá `README.md` con lo realmente implementado, controles, verificaciones y límites restantes.

En tu respuesta final mostrámelo de forma concreta:

- ubicación exacta para abrirlo;
- qué cambió en terreno/avance, pilotos, enemigos/jefes y VFX;
- capturas representativas enlazadas;
- pruebas ejecutadas y resultado;
- límites reales que sigan pendientes.

No declares “calidad final” si solo completaste una fracción. Al mismo tiempo, no uses esa cautela como excusa para entregar otro prototipo de primitivas. Esta pasada debe producir el mayor salto visual coherente posible de una sola vez, priorizando lo que se ve durante juego real.
