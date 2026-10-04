# COSMIC ROLL 3D · Muñecos y máscaras · 0.17.0

Lore estético del usuario aplicado a TODOS: jugador, miembros de equipos,
34 enemigos y jefe. Tela cosida, porcelana gastada, ojos hundidos y seis
sonrisas inquietantes; rostros curvos, colores propios y texturas compartidas.
Leer PERSONAJES-LORE-ESTETICO.md y referencias-personajes. Física, objetivos,
oscuridad y luz conservadas. Cerrar instancia anterior y abrir launcher.

Oscuridad anterior a 0.15.1 restaurada: luz 10000/18000 y halo original, sin
levantar globalmente el render. Vela retirada; cristales E/Q siguen activos.
Singularidad rehecha: disco cálido contenido, horizonte/anillo fino, polvo
orbital, cuerpo con sus colores y fundido breve para el cambio de mapa.
Leer OSCURIDAD-Y-SINGULARIDAD.md. Objetivos, circuito y turnos conservados.

P → Objetivos + sigilo: sintonizar tres resonadores con E, seis segundos
quieto por cada uno; abrir la brecha con ocho segundos más. Circuito completo
= 24 puntos sin bajas. Progreso compartido por equipo, interrupción por daño,
movimiento o rival; ruido revela. Nuevos iconos y progreso en HUD.
Leer DIRECCION-OBJETIVOS-Y-TERROR.md: referencia preferida Identity V y hoja
de ruta de rescate/distracción/escape. Red requiere 0.17.0 en ambas PC.

Lente gravitacional y arcos de luz con oclusión por profundidad conservados.
Absorción corregida hasta el horizonte real. Q activa 22 segundos; rangos
conservados. AGUJERO-NEGRO-Y-LUZ.md es historial de una entrega revertida.

Cerrar la instancia anterior y abrir JUGAR COSMIC ROLL 3D.cmd.
P → Objetivos + sigilo → Partida local por turnos. E interactúa, Enter termina,
G usa la herramienta seleccionada por icono, Q ilumina con energía, M abre mapa.
Meta: 24 puntos, ganar sin bajas es posible; último equipo vivo también gana.
Último equipo en pie sigue como modo separado. Nombres/emojis y Umbral I/II conservados.

Leer OBJETIVOS-Y-SIGILO.md: ocho herramientas reales, balizas/carga/zona/PvE/
contratos privados, usos máximos tres, cajas, ocultación y límites.
Refugios/luz y colisión exacta de esquinas incluidos. Red directa conserva
autoridad del anfitrión y filtra contratos/posiciones ocultas.
Catálogo adicional pendiente; no destructibilidad del terreno ni péndulo de soga.

---

## Historial técnico (reglas históricas, no defaults actuales)

# COSMIC ROLL 3D — Turnos · Expedición 0.12.0

Abrí **JUGAR COSMIC ROLL 3D.cmd** en
`C:\Users\party\Desktop\COSMIC ROLL 3D`.
Cerrá cualquier instancia anterior y volvé a abrir. La esquina superior dice
**TURNOS · EXPEDICIÓN · 0.12.0**. Todo funciona offline.

## Arsenal y suministros 0.12.0

Munición con reserva individual: R transfiere balas, no las crea. Después de
resolución hay 2.8 s de cajas con paracaídas cerca de alguien al azar; E recoge.
H botiquín, J escudo, K antídoto, L combustible/cerilla. Enemigos pesados envenenan.
P → Nombres de equipos y jugadores para editar el perfil local antes de jugar.
Comentarios originales contextuales con nombres, como texto y sin API en vivo.
ARSENAL-Y-SUMINISTROS.md explica cantidades, caída y reglas compartidas local/online.

## Reglas y conexión con amigo 0.11.0

P → Crear sala / Conectar: conexión directa entre dos PC en red privada o VPN.
Dos equipos de 1–6 personajes según el anfitrión; cada PC maneja su equipo y observa el otro turno.
Ver JUGAR-CON-AMIGO.md para IP/código, puerto 49321 y límites de esta primera prueba.
20 puntos o 10 minutos: relés +5, PvE +1, rival +2, caída −1. Reaparición al próximo
turno, sin victoria por eliminar el equipo. Varios ataques por turno, Enter termina.
La web publicada sigue sin red: esta función usa el ejecutable de escritorio.

## Turnos y estructuras 0.10.0

P → **Partida local por turnos**. Configurá equipos, miembros y segundos antes
 de empezar. Enter termina la jugada; 5 s resuelven ataques, luego cambia jugador
 y cámara. PvE siempre activo durante juego, espera vulnerable, pausa global.
Cada actor conserva vida, munición, arma y vela. También se puede probar conexión
con un amigo mediante el ejecutable, según JUGAR-CON-AMIGO.md.
M ubica Observatorio, plataforma baja y Pasaje inferior, presentes en ambos
umbrales. Nueva expedición vuelve al juego habitual. PLAN-TURNOS.md documenta
las reglas de prueba, módulos y pendientes (objetivos/economía por equipo,
consumibles, navegación vertical PvE y servidor).

## Colisiones, cámara y ajustes 0.9.0

P abre el menú: calidad Rendimiento/Equilibrada/Alta, sombras, efectos de pánico,
FPS y campo de visión de 45 a 80 grados. Se guardan las preferencias. Los presets
ajustan resolución de render y postproceso; no alteran daño, terreno ni enemigos.
El contador muestra FPS y el percentil 95 del tiempo de cuadro en milisegundos.
Verificar escena comprueba jugador, cobertura, cámara, terreno y matrices finitas.

`collision-world.js` unifica el índice usado por cuerpos, disparos, cámara y audio.
El movimiento se subdivide por radio para evitar saltarse obstáculos con dash.
Hay ocho pasadas de contacto y una búsqueda acotada de espacio libre cuando
coberturas superpuestas impiden converger; nunca se elige una salida debajo del
suelo. `camera-rig.js` limita el brazo y revalida suelo/coberturas tras interpolar.
El monitor revisa estado finito por cuadro y escena cada medio segundo; conserva
posición válida para recuperar errores y registra alertas en CR3D.diagnostics().

Los sólidos siguen siendo terreno triangular y cajas de troncos, ruinas y rocas.
Ramas, vegetación blanda y esculturas Growth son decorativas. Las cajas conservan
la aproximación anterior y no equivalen a colisiones exactas de cada triángulo.
La QA revisa cada collider frente al índice completo, cámara a ambos lados de
cada cobertura, 648 configuraciones de perspectiva y 1008 muestras de recorridos
con salto/dash/aterrizaje en ambos mapas. Detecta regresiones en esos casos; no
puede garantizar todas las situaciones futuras ni todos los dispositivos.
Los nodos transitorios de audio se desconectan al terminar y el inicio concurrente
comparte una sola promesa, evitando duplicar capas y acumular referencias.

### Estabilidad de impactos 0.8.1

El bucle garantiza el siguiente `requestAnimationFrame` aunque un frame lance
una excepción, conserva el último error en el snapshot y maneja pérdida/restauración
del contexto WebGL. El impulso de daño ignora componentes no finitos. La prueba
de combate aplica un impacto con el loop real activo y exige frames posteriores,
posición/velocidad finitas y ausencia de errores. El antiguo flash CSS fullscreen
permanece desactivado; el daño no dispara ese blur.

## Terror de supervivencia 0.8.0

La vela dura cuatro minutos y responde al viento y a amenazas cercanas. Si se
apaga o agota, Q consume una de tres cerillas y entrega 22 segundos de luz de
emergencia. El miedo es oculto: oscuridad, daño y proximidad enemiga aumentan
viñeta, grano, separación cromática, distorsión, viento filtrado y susurros HRTF.
En niveles altos reduce hasta 12 % el movimiento y aumenta hasta 22 % la presión
de enemigos. El sistema conserva retícula, telemetría y avisos de combate.

Los módulos independientes son `survival.js`, `terror-audio.js` y
`terror-visual.js`. El plan técnico, APIs, parámetros y presupuestos están en
`PLAN-TERROR-WICK.md`. La referencia sirve como dirección de tensión; todos los
shaders, sonidos procedurales y código son propios.

## Audio granular Growth 0.7.3 · contraste entre mundos

UMBRAL I conserva la base natural de la marisma y gestos resonantes discretos.
UMBRAL II añade dos capas vocales sostenidas, graves y abiertas en estéreo,
reduce el ruido natural y produce granos ambientales más frecuentes.
El portal cambia la mezcla; regresar retira las capas vocales. Ambas ceden
ante amenazas y disparos y respetan pausa y silencio. Son dos fuentes fijas,
con dos nodos StereoPanner, sin crecimiento del pool espacial.
`qa-audio/umbral-I-soundscape.wav` y `umbral-II-soundscape.wav` permiten comparar
las mezclas, renderizadas desde el grafo de producción.

La referencia https://cabbi.bo/growth/ usa fragmentos de una grabación, reproducidos
con velocidades distintas y envolventes de ataque/caída. Se recrea esa técnica
con una fuente propia de siete segundos: armónicos con formantes vocales,
desafinación lenta y textura resonante. No se incorpora su archivo holyNoises.mp3
ni se copia su código. La semejanza es una dirección tímbrica/interactiva;
no es la misma grabación ni garantiza identidad perceptiva con el original.

Mirar una reliquia, portal o núcleo activa un grano grave/lento (0.6×), una sola
vez al entrar en foco; E produce un grano breve/brillante (1.2×). Las acciones
válidas de recoger y activar relés también responden; los relés amenazados
conservan la prioridad y el bloqueo del juego. Los viajes por portal dejan una
resonancia de 3.3 segundos a 0.3×. Cerca del agua y las reliquias aparecen granos
ambientales suaves; los secretos usan la misma familia. Las esferas de Growth
tienen fuentes ancladas a sus posiciones, sin alterar su geometría o colisiones.

Una capa Growth dentro de la mezcla ambiental reduce volumen ante amenazas y
disparos. Se conservan HRTF, distancia, oclusión, reverberación, mute y pausa.
Sus voces pertenecen al pool existente de 32 y no se crean panners ilimitados.
Las envolventes suaves empiezan/terminan en cero y las fuentes se liberan con
onended. El foco, voces y planificación se limpian al cruzar o reiniciar.
`qa-audio/growth-gestures.wav` es una muestra estéreo de ocho segundos renderizada
con el mismo grafo y fuente del juego, no una grabación descargada de Growth.

## Muestra estética Growth · sólo UMBRAL II

La dirección visual toma como referencia https://cabbi.bo/growth/: ramificación
orgánica, cuerpos translúcidos, reflejos de película iridiscente y polvo fino
suspendido sobre oscuridad. Es una interpretación propia mezclada con el
humedal existente; no se importan código, shaders, música ni assets de esa obra.

`prototype/growth.js` añade 12 crecimientos metálicos oscuros (1560 segmentos
instanciados), 6 membranas esféricas con núcleos orgánicos y 1600 partículas.
Los bordes de corteza/copas/arbustos incorporan una iridiscencia moderada y la
bruma de UMBRAL II usa tonos pizarra, violeta y azul. Todo está anclado al mapa,
animado con tiempo de simulación y con cantidades fijas. No altera alturas,
colisiones, navegación, física, inventario, audio ni combate. Las esculturas
son ornamentales; no representan cobertura balística ni objetos interactivos.
UMBRAL I conserva sus materiales y escenario como comparación. Viajar de vuelta
restaura su atmósfera mediante las transiciones de color existentes.

En QA se comparan alturas y cajas con la base 0.7.0, se comprueba aislamiento
entre mapas y pausa, se capturan ambos escenarios y se mide también una muestra
de FPS dentro de UMBRAL II. La membrana es una aproximación translúcida, sin
refracción física ni un sistema de reflejos de alta fidelidad.

## Portal dimensional 0.7.0

La ruina próxima al refugio, en x=-260 / z=-450 (unos 52 m desde el inicio),
ahora contiene un portal circular. Está marcado en M. Acercate y pulsá E para
cruzar entre UMBRAL I y UMBRAL II; el mismo portal permite regresar.
Son dos mapas de 7200 × 7200 unidades (720 × 720 m) con relieve, bosque,
aguas y coberturas propios, conservando las cuatro regiones, la atmósfera,
fauna, secretos, arsenal, máscaras, contratos y jefe del juego.

La vida, armas recogidas y munición acompañan al jugador. Contratos, botín y
enemigos de cada mapa se conservan por separado durante la sesión. Los disparos
y efectos transitorios se limpian al cruzar. Llegada sobre terreno real, breve
protección y bloqueo de 1.2 s evitan rebotes o daño inmediato. El índice de
colisión/acústica se reconstruye y sólo el mundo activo se dibuja y actualiza.
La primera entrada genera la segunda dimensión; puede haber una pausa breve.
Se mantienen como máximo dos mapas en memoria para volver sin regenerarlos.

Límite del guardado: el checkpoint existente sigue siendo del mundo original.
Cerrar o Nueva expedición vuelve a UMBRAL I; los estados de UMBRAL II se guardan
solamente durante la sesión, no en disco. No es un guardado completo de dos mundos.

Facialidad 0.6.3: todos los enemigos y el Leviatán llevan una máscara curva
de porcelana envejecida. Tres expresiones propias por rol: sonrisa rígida,
mirada entrecerrada y ojos muy abiertos con pupilas diminutas. Dientes desiguales,
cejas elevadas y asimetría crean incomodidad; pequeñas inclinaciones usan tiempo
de simulación y quedan congeladas al pausar. Tres texturas compartidas se generan
una vez; sin assets comerciales, nuevas colisiones ni cambios de daño. El jefe
mira al jugador durante el encuentro. Referencia de dirección: alegría forzada
e inquietante de We Happy Few, adaptada a la identidad geométrica del prototipo.

## Dirección ambiental 0.6.2

Primer paso gradual hacia miedo, incertidumbre y curiosidad: ciclos lentos de
silencio parcial ambiental, crujidos localizados en vegetación y resonancias
bajas en ruinas. Eventos espaciados, de baja prioridad, suprimidos durante
combate o peligro cercano. No imitan disparos ni pasos hostiles.
Tres círculos de piedras fuera del recorrido principal emiten una resonancia
espacial tenue que invita a investigar. Son secretos ambientales, sin recompensa
ni misión todavía. 960 volúmenes de arbustos agrupados enmarcan rutas, con
niebla baja que deriva lentamente. La vegetación es blanda y no ofrece cobertura
balística. Se conservan los límites de voces y emisores.

Regla de dirección: tensión mediante contraste, silencio y señales ancladas
al mundo. Los sonidos útiles del combate conservan prioridad. PvP sigue siendo
una intención futura; la entrega es PvE local.

## Mortero y recogida de armas

El mortero está junto al refugio inicial, hacia la derecha y atrás del núcleo,
en una pequeña base con icono flotante ámbar. Acercate y pulsá **E**. Se equipa
en la **ranura 4**, antes bloqueada; las cuatro ranuras permiten cambiar con
teclas o botones. Pistola, rifle y escopeta siguen disponibles desde el inicio.

Con el mortero equipado, girar la cámara o apuntar con el cursor ajusta el arco.
Ves la trayectoria, puntos móviles, círculo de explosión, distancia y tiempo
de vuelo antes de disparar. **Clic/F** lanza una esfera bajo gravedad;
**R** recarga tres proyectiles en 2,3 segundos. Intervalo de disparo: 1,2 s.
Alcance nominal 10–65 metros, ajustado a altura, terreno y obstáculos.

Previsión y disparo usan la misma curva balística y barrido a 120 Hz, contra
el terreno, coberturas y criaturas. El arco cambia a rojo si encuentra una
cobertura temprana. Enemigos móviles pueden alterar el impacto tras el disparo.
La explosión tiene radio de daño de 4,2 metros, caída gradual, daño base 95
y bloqueo por cobertura; un impacto muy próximo también puede dañar al jugador.
Las mejoras existentes se aplican al daño del mortero.

### Estándar de telemetría fluida

La telemetría 0.6.1 se actualiza en cada frame visible y sigue el apuntado con
amortiguación exponencial independiente de los FPS (respuesta 32 s⁻¹). La
colisión continúa resolviéndose mediante barrido fijo a 120 Hz; después se
reconstruye el arco con 100 muestras temporales uniformes. Así, dibujo y física
quedan separados sin sacrificar precisión. El punto de impacto, el círculo, la
cinta, las partículas móviles y los números proceden de una sola predicción.

Aplicar este estándar a futuras miras, granadas, poderes y marcadores dinámicos:

1. Estado físico autoritativo y determinista.
2. Presentación evaluada al ritmo de render, sin temporizadores visibles lentos.
3. Entrada suavizada con `1 − exp(−respuesta × dt)`, nunca con un porcentaje fijo.
4. Muestreo visual uniforme y suficientemente denso para el tamaño en pantalla.
5. Un único estado alimenta geometría, impacto y texto; el DOM cambia solo si
   cambia su contenido.
6. Métricas de densidad, continuidad y cadencia disponibles para QA.

El efecto visual es compacto: destello caliente, fuego con textura irregular,
luz cálida breve sobre el entorno, chispas con gravedad, humo con expansión y
deriva, y marca transitoria de contacto. Texturas procedurales locales y pools
de seis proyectiles/cuatro explosiones; el audio tiene lanzamiento y detonación
posicionales. La referencia de composición es el sistema de partículas por
componentes de [CRYENGINE](https://www.cryengine.com/docs/static/engines/cryengine-5/categories/23756816/pages/36867945).
Combina un núcleo geométrico animado por shader y sprites con profundidad y
transparencia; no es una simulación volumétrica ni una reproducción de assets
de Hunt Showdown. Revisar visualmente en cada ampliación.

La posesión del mortero se guarda localmente, junto al avance de la expedición.
Retomar y volver a abrir conservan esa posesión; **N** vuelve a dejarlo en el suelo.
Su munición se repone al retomar/refugio, igual que el arsenal de esta etapa.

## Prioridad de diseño

El ambiente y la experiencia de recorrer el mundo son la prioridad permanente.
La referencia de Hunt Showdown es su sensación de vida, tensión, densidad y
lectura del espacio; la identidad sigue siendo cósmica y geométrica. NEON VOID
aporta regiones, contratos, fragmentos, progresión, arsenal y enemigos.
Esta rama tiene simulación independiente y adapta esas ideas a 3D.

## Expedición jugable

1. Explorá Umbral, Fundición, Fractura y Corazón del Vacío. **M** muestra el mapa;
   la brújula indica el objetivo más próximo y su distancia.
2. Eliminá guardianes de los tres relés. Acercate y usá **E** para sincronizar.
3. Los relés despiertan al **Leviatán del Vacío** en el Santuario. Tiene 900 HP,
   preparación visible, proyectiles radiales y pulsos de suelo. La segunda fase
   acelera ataques. Saltar evita el pulso de suelo; dash y cobertura ayudan
   contra proyectiles.
4. Recogé fragmentos de las bajas. El refugio cura, rellena cargadores y
   calibra el arsenal por 20 fragmentos: +10% de daño, hasta tres mejoras.
5. Derrotá al jefe y permanecé cinco segundos en el refugio para extraer.

Descubrir regiones, sincronizar relés y eliminar criaturas da experiencia. Cada
100 XP sube el nivel y añade 3% de daño. Los fragmentos se atraen al acercarte.
Hay 34 enemigos locales: perseguidores, tiradores y guardianes, más el jefe.
Patrullan, reaccionan a cercanía/disparos y comprueban cobertura antes de atacar.

## Ambiente y sonido

Terreno de 7200 × 7200, bosque con hasta 620 árboles, raíces, 9000 juncos,
750 hongos luminosos, 32 charcas, ruinas atravesables y señales del contrato.
Vegetación con viento, fauna en vuelo que se altera al disparar, luciérnagas,
bruma baja y llovizna. Las regiones cambian suelo, niebla, luz y referencias
celestes: ceniza, fragmentos flotantes y una singularidad distante.

El audio empieza con la primera tecla de juego o clic. Probalo con auriculares
estéreo. Es un **sistema procedural avanzado inspirado en mezcla AAA**:

- Escucha HRTF anclada al personaje, orientada con yaw y pitch reales de cámara.
  Girar cambia la localización; el zoom no cambia la distancia al personaje.
  Diez unidades equivalen al metro que muestra el HUD.
- Agua, árboles, juncos, ruinas, cristales y fauna tienen fuentes derivadas de
  su posición real en el mapa. El ruido difuso estéreo sostiene el fondo.
  Las cuatro regiones se funden al recorrer sus fronteras; lluvia y refugio
  cambian mezcla y reverberación. La fauna baja su actividad sonora al disparar.
- Distancia, caída de volumen, alcance y pérdida de agudos dependen de la
  categoría. Tres rayos contra coberturas y muestras del terreno aproximan
  la obstrucción: filtran agudos y atenúan sin cortar de golpe.
- Rodadura continua sobre tierra, ceniza y agua, contactos y aterrizajes;
  armas con ataque, cuerpo y cola propios; impactos blandos o resonantes;
  proyectiles hostiles que cruzan cerca con sonido móvil de pasada.
- Enemigos, jefe y objetivo emiten capas localizables. Cercanía, preparación
  de ataque, fase del jefe y vida baja producen tensión ambiental gradual.
- Nueve buses: master, ambient, weather, biome, combat, weapons, enemies,
  boss y signals. Compresión suave, techo de salida, reflexiones y cola
  reverberante. Los disparos reducen brevemente el ambiente.
- Hasta 32 voces transitorias y 12 emisores persistentes; panners reutilizados
  y prioridad para ataques/alertas. La obstrucción se consulta a 10 Hz, mientras
  la escucha y los emisores móviles se actualizan cada frame. Pausa y silencio
  apagan también las colas; reiniciar libera voces y conserva preferencias.

Todo se sintetiza localmente, sin descargas ni grabaciones comerciales.
Para comprobarlo jugando: acercate a la charca inicial, girá la cámara frente
a una criatura, interponé una ruina y compará las tres armas. P pausa; V silencio.

## Controles

| Acción | Control |
| --- | --- |
| Movimiento relativo a cámara | WASD / flechas |
| Salto / dash combinables | Espacio / Shift |
| Disparo continuo | Clic izquierdo o F |
| Precisión: zoom y menor velocidad | Mantener clic derecho |
| Pistola / rifle / escopeta / mortero recogido | 1 / 2 / 3 / 4 |
| Recargar | R |
| Interactuar / mapa | E / M |
| Cámara libre / fija / autoseguimiento | C |
| Pausa / continuar | P |
| Silenciar sonido | V |
| Nueva expedición | N |
| Liberar mouse / pantalla completa | Esc / F11 |

Pistola: 14 cartuchos; rifle: 28; escopeta: 6, con ocho perdigones.
Cada arma tiene cadencia, dispersión, retroceso, velocidad y recarga diferentes.
Las reservas son infinitas en esta etapa. Cambiar arma cancela la recarga.
Los disparos recorren segmentos: terreno y cobertura frenan balas incluso
cuando atraviesan mucha distancia entre pasos.

Cámara libre: clic captura mouse; si falla, botón derecho y arrastrar.
Cámara fija: apunta con cursor. Autoseguimiento permite mirar y vuelve hacia
el movimiento tras 1,2 s; no recentra al apuntar/disparar.

## Checkpoint

Activar relés, descansar/calibrar y derrotar al jefe guardan relés, etapa, XP,
fragmentos y mejoras localmente. Al abrir se retoma ese avance desde el origen
con vida/cargadores completos y enemigos comunes restaurados. No conserva
posición, bajas ni salud individual enemiga. Si el jefe fue derrotado, sigue
la extracción. En pausa, **Retomar checkpoint** recarga ese avance. **N** borra
el checkpoint activo para empezar limpio. Una expedición completada permite
empezar otra, sin volver a despertar automáticamente al jefe anterior.

## Arquitectura y validación

- `prototype/thirdperson.js`: movimiento, armas, encuentros, cámara y paso fijo.
- `prototype/physics.js`: consultas de terreno, segmentos y cuerpos. El
  controlador usa un índice espacial; física y dibujo comparten triángulos.
- `prototype/world.js`: regiones, vegetación instanciada, agua, clima y lugares.
- `prototype/sound.js`: mezcla, sonidos posicionales, preferencias y medición.
- `prototype/survival.js`: vela, cerillas, oscuridad y miedo determinista.
- `prototype/terror-audio.js`: viento filtrado, susurros HRTF y stingers acotados.
- `prototype/terror-visual.js`: postproceso WebGL de una pasada.
- `prototype/expedition.js`: contrato, jefe, botín, niveles, mapa y checkpoint.
- `prototype/mortar.js`: pickup, posesión, previsión balística, proyectil y fuego.
- `prototype/thirdperson.html`, `world.css`, `combat.css`: interfaz.
- `desktop/main.cjs`: contenedor aislado offline; perfil CosmicRollThirdPerson.
- `desktop/verify-combat.cjs` y `verify-world.cjs`: recorridos integrados.
- `desktop/verify-audio.cjs`: muestras estéreo del grafo de producción y acústica.
- `desktop/verify-mortar.cjs`: recogida, trayectoria real, radio, coberturas y pools.
- `desktop/verify-terror.cjs`: recursos de luz, pánico, audio compartido y shader.

`node prototype/test-physics.cjs`: ocho pruebas de colisión.
`node prototype/test-collision-world.cjs`: doce comprobaciones del índice/cuerpos.
`COSMIC ROLL 3D.exe --thirdperson-qa`: 28 comprobaciones de combate, 32 de mundo
y 41 de audio, más 26 de mortero, 22 de dimensiones, 13 de terror y 16 de estabilidad: 178 en total.
Capturas e informes en `resources/app/qa-combat`, `qa-world`, `qa-audio`,
`qa-mortar`, `qa-dimensions`, `qa-terror` y `qa-stability`.
`verify-dimensions.cjs` valida viaje real con E, terreno distinto,
inventario, contratos separados, regreso, pausa y reinicio. `qa-dimensions`
contiene informe y capturas del portal y UMBRAL II.
El render offline reutiliza sintetizadores, buffers, filtros,
panners y salida del juego para medir distancia, obstrucción, inversión de
canales al girar y margen frente a clipping. También se prueban fuentes reales,
trayectorias de proyectiles, mezcla regional, boss, pausa, mute y liberación
natural de voces. Los verificadores de Electron exportan funciones: ejecutarlos
con Node directamente no corre sus pruebas; los ejecuta el EXE con ese argumento.
Las mediciones no reemplazan una escucha subjetiva ni garantizan rendimiento
en otros equipos. La prueba de FPS es una muestra breve.

## Límites y continuidad

Expedición PvE local, con un contrato y un jefe. PvP real requiere simulación
de servidor, sincronización y diseño de sesiones; todavía no está implementado.
Física arcade de esfera y cajas, sin motor de cuerpos rígidos. Los enemigos
tienen evasión local de obstáculos, todavía sin navegación global. El mundo
está limitado al terreno, sin streaming de mapas. Agua poco profunda, sin
natación. Fauna, bruma y clima son decorativos. Geometría y audio procedural
con pools limitados; todavía requieren composición y diseño más detallados.

Acústica: HRTF genérica del navegador, fuentes puntuales, oclusión aproximada por
cajas/terreno; no hay simulación de difracción, transmisión por material ni
propagación física del sonido. Las reflexiones usan una respuesta procedural
compartida, con cantidad ajustada cerca de ruinas; no se calcula una sala real.
El sonido aún requiere escucha y composición humana. No equivale a la
producción sonora de Hunt/CryEngine con grabaciones, middleware y mezcla propia.

Próximas ampliaciones: rutas y humedales mejor compuestos, fauna con respuestas
locales, acústica por materiales y salas, encuentros regionales, más contratos y navegación.
Cada ampliación debe mejorar ambiente, lectura espacial y juego antes que
cosmética del personaje. Mundo, sonido y contratos separados permiten avanzar
por etapas.

Los archivos 2D heredados permanecen como referencia. No se modificó NEON VOID.
La entrega conserva respaldos de los archivos reemplazados y las licencias.

Umbral II 0.13.0: leer UMBRAL-II.md y UNIVERSO-DEL-JUEGO.md. P permite elegir dimensión para expedición, turnos y salas; E cruza el agujero negro en expedición con tránsito de 3.05 s.

0.14.0: victoria por último equipo vivo y perfiles con nombres/emojis propios. Leer VICTORIA-Y-EQUIPOS.md. P -> Crear equipos. Sin reaparición en el modo actual; objetivos quedan informativos. Ambos mapas/local/online comparten la regla.
