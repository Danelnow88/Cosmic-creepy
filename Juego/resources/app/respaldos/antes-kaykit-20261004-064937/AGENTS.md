# Humanoides: estabilidad corregida

El proyecto activo es esta carpeta. Los cuerpos son humanoides; la cara es la esfera original. La regla histórica de cuerpos rodantes queda reemplazada sólo para esta copia por el pedido del usuario. No editar el COSMIC ROLL 3D original ni JuegoDemo. Leer DEBUG-HUMANOIDES.md. No acceder a personajes por children[n]: usar referencias semánticas. Una animación decorativa jamás debe rotar el contenedor del cuerpo. Mantener `humanoidGeometryAudit` y ejecutar --humanoid-debug-qa / --thirdperson-qa tras cambios de representación, animación, cámara o colisiones.

# COSMIC ROLL 3D — Continuidad

## Lore visual permanente de personajes — 0.17.0

Leer PERSONAJES-LORE-ESTETICO.md y las dos imágenes en referencias-personajes.
El usuario exige este lenguaje en TODOS: jugador, equipos, enemigos y jefe.
Muñecos/tela/porcelana gastada, ojos hundidos, sonrisa artificial y asimetría.
Conservar cuerpos rodantes e identidad cósmica; nombres y lore no se extraen
del texto que aparece dentro de las referencias. Usar character-style.js.
No volver a ojos simples o máscaras sólo para enemigos. Luz/mapas 0.16.1 intactos.

## Corrección obligatoria de atmósfera — 0.16.1

Leer OSCURIDAD-Y-SINGULARIDAD.md. El usuario rechazó explícitamente la
amplificación visual 0.15.1. Base 10000 / Q 18000, halo/tono oscuro original.
No volver a introducir el levantamiento global de color ni brillo x3.
Vela de inventario/drop/tecla L retirada: usar fragmentos energéticos E/Q.
Conservar el mundo oscuro, disco contenido, colores del cuerpo y fundido del
viaje. Las instrucciones históricas de luz más potente quedan sustituidas.

## Dirección permanente de objetivos — 0.16.0

Leer DIRECCION-OBJETIVOS-Y-TERROR.md. Identity V es la referencia preferida
del usuario para mecánicas de objetivos y estética; Dead by Daylight también.
Adaptar cooperación, rescate, distracción y escape a turnos/PvE, con identidad
propia. Primer circuito resonador/brecha activo en Objetivos + sigilo; el
trabajo avanza sólo en turno activo, ruido expone, progreso del equipo persiste.
No implementar el resto de la hoja de ruta como reglas implícitas sin probarlas.
Conservar lente y tono oscuro 0.16.1; QA circuit/strategy/online/singularity obligatorio.

## Entrega visual 0.15.1

Leer AGUJERO-NEGRO-Y-LUZ.md. Conservar singularity.js con disco XY girado a XZ,
lente de terror-visual.js con DepthTexture y controlador updateLens de thirdperson.js.
No sustituir mejoras instaladas por una copia de staging más antigua: comparar
destino/respaldo antes de entregar y copiar sólo los cambios autorizados.
Ejecutar --singularity-qa y --thirdperson-qa al cambiar lente, tránsito o iluminación.

## Lore permanente

Leer UNIVERSO-DEL-JUEGO.md antes de crear/retrabajar dimensiones, objetos o mecánicas.
Es el lore íntegro del usuario, autoridad de continuidad. Leer UMBRAL-II.md para
la aplicación 0.13.0. Conservar Umbral I; recipes en dimensions.js y lenguaje
común del agujero negro en singularity.js. El tránsito dura 3.05s, no consume
recursos ni simula daño, pausa congela/cancelar restaura visual, múltiples E no
crean viajes. La partida usa una sola dimensión elegida por el host; snapshots
activan terreno y colisiones antes de roster/cámara. QA umbral + online requerido.

Base vigente: tercera persona, expedición/turnos/online y Umbral II 0.14.0. Leé README.md,
qa-world/report.json y qa-audio/report.json. NEON VOID en C:/Users/party/Desktop/JuegoDemo es referencia
de conceptos, jamás un destino de edición de este experimento. La simulación
3D tiene autonomía autorizada: copiar estrictamente el gameplay 2D ya no aplica.

## Regla permanente del usuario

La atmósfera y la experiencia de habitar/recorrer este mundo son muchísimo más
importantes que el dibujo del personaje. Priorizá densidad y composición del
entorno, humedales, rutas, referencias, vida reactiva y riqueza acústica. La
referencia Hunt Showdown es ambiental, no estética cowboy. Mantener identidad
cósmica geométrica y escalar esta prioridad a toda mejora futura.

## Sistemas activos

Estabilidad 0.9.0: collision-world.js concentra índice, contacto y movimiento
subdividido; camera-rig.js valida brazo/cobertura/suelo. settings.js guarda calidad,
sombras, efectos, FPS y FOV; monitor finito por cuadro y revisión cada .5 segundos.
No duplicar índices en thirdperson.js. Conservar tests del suelo, clusters, dash,
cámaras, dimensiones y recuperación. test-collision-world.cjs y qa-stability son
obligatorios para cambios de física/cámara. Los nodos acústicos transitorios deben
desconectarse y liberarse al terminar; no acumularlos en ownedNodes.

Estabilidad 0.8.1: frameLoop agenda siempre el próximo rAF desde `finally`,
expone frameSerial/frameFaults/lastFrameError y maneja contextlost/restored.
takeDamage acepta impulso sólo con componentes finitos. Conservar la prueba de
impacto en rAF real; no reactivar el antiguo box-shadow fullscreen de daño.

Supervivencia/Penumbra 0.8.0: survival.js es la máquina pura de vela, cerillas
y miedo; terror-audio.js reutiliza el AudioContext/bus ambiental existente;
terror-visual.js reemplaza el render final con un único pase WebGL al 72 %.
Mantener física a 120 Hz, ocho voces de terror como máximo, un solo contexto de
audio y un solo mapa de sombras direccional. Q usa cerilla sólo sin llama. El
miedo modifica movimiento hasta -12 % y agresividad hasta +22 %. Validar
qa-terror además de las suites anteriores. No copiar assets de la referencia.

Audio Growth 0.7.3 autorizado en ambos mundos. Umbral I conserva base natural;
Umbral II usa dos capas vocales continuas, menor ruido natural y más granos.
Retirar capas al regresar/reiniciar; dos fuentes y dos StereoPanner fijos.
QA compara renders de ambas mezclas y comprueba el cambio al cruzar el portal.
sound.js sintetiza fuente vocal
propia, granula con entrada/caída suaves, 0.6x al mirar, 1.2x al interactuar y
0.3x al cruzar. Fuentes ancladas a reliquias/orbes, voces dentro del pool32.
No tocar reglas de combate para producir sonidos; E prioriza objetos de juego,
el bloqueo de relés y el cooldown del portal. Grano ambiental cede con amenaza.
Limpiar foco/planificación al cambiar mapa. QA renderiza el grafo de producción.
La geometría Growth sigue aislada en Umbral II; el audio puede estar en ambos.

Muestra Growth 0.7.1 sólo en UMBRAL II: growth.js es puramente cosmético.
Conservar UMBRAL I como muestra original por pedido explícito. No trasladar
esta estética al origen ni cambiar combate/colisiones para acompañarla.
Iridiscencia oscura, ramificación, membranas translúcidas y partículas tenues.
Geometría acotada/instanciada, shaders propios y tiempo de simulación para pausa.
No importar código ni assets de la referencia cabbi.bo/growth.

Dimensiones 0.7.0: portal E de la ruina (-260,-450), ida y vuelta entre dos
mapas de 7200 unidades. Dos instancias acotadas con geometría, terreno e índice
de colisiones propios; world es una fachada estable usada por otros sistemas.
Cambiar terreno y hash ANTES de construir el mapa. Ocultar el mapa anterior,
reconstruir colisiones/acústica, cancelar disparos/efectos y proteger llegada.
Vida/arsenal viajan, progreso/enemigos/botín se separan por sesión. Checkpoint
en disco sólo para origen; reiniciar vuelve allí. Validar verify-dimensions.cjs.

Facialidad 0.6.3: máscaras curvas inquietantes en los 35 enemigos, incluido jefe.
Mantener sonrisa rígida, ojos atentos y asimetrías; tres texturas propias
compartidas, preparadas una vez. Armas/armadura deben permitir leer la cara.

Dirección atmosférica 0.6.2: miedo, incertidumbre y curiosidad progresivos.
Usar silencio parcial, señales espaciales reales y contraste. El director
decorativo cede durante combate; no enmascarar avisos ni fingir enemigos/PvP.
Tres círculos ocultos son secretos ambientales sin recompensa. Arbustos blandos
no equivalen a cobertura. Mantener coste y pools limitados.

thirdperson.js: controlador, armas, física/cámara y encuentros. world.js: regiones,
instancias, clima y lugares. sound.js: un AudioContext, RNG cosmético propio,
voces limitadas y mezclador. expedition.js: contrato, jefe, botín y checkpoint.
Mantenerlos separados. 2D, roll.js y QA históricas no son autoridad del gameplay.

Conservá paso fijo y unidades coherentes. Colisiones de cuerpos, disparos y
cámara deben consultar el mismo terreno y coberturas. Controles combinables,
pausa, pérdida de foco y funcionamiento offline deben seguir funcionando.
No contamines RNG de combate con decoración/sonido. Pools y coste del frame
deben ser limitados. Las opciones de audio guardan preferencias y silencian
toda la mezcla al pausar. El checkpoint no es un guardado completo: documentá
qué preserva. No presentes PvP como disponible sin red/servidor reales.

Validá node prototype/test-physics.cjs y EXE --thirdperson-qa, que ejecuta
verify-combat.cjs, verify-world.cjs, verify-audio.cjs y verify-mortar.cjs. Inspeccioná capturas. No basta que el código
sea sintácticamente válido. Documentá límites de física, sonido y navegación.

Para actualizar esta entrega respaldá archivos reemplazados. No borres otras
entregas, no publiques ni hagas commit/push sin solicitud. Conservá licencias.

Audio 0.5: 10 unidades = 1 metro, escucha anclada al personaje y orientación
de cámara. 32 voces transitorias, 12 emisores continuos, 44 panners como máximo.
Obstrucción a 10 Hz; orientación y posición de emisores móviles cada frame.
Usar el índice del mundo para fuentes ambientales y las mismas coberturas de
combate para acústica. Render offline debe reutilizar el grafo de producción.
Mantener QA de canales estéreo, distancia, filtrado, mute, reinicio y limpieza.
La síntesis y oclusión son aproximaciones; no afirmar equivalencia con CryEngine.

Mortero 0.6: mortar.js contiene pickup, inventario local y proyectiles/efectos
con pools. La previsión y el disparo comparten curva analítica, gravedad 280,
radio de proyectil 5 y barrido 1/120 s contra el mundo y enemigos. Radio de
explosión 42 unidades; mantener efecto compacto y coberturas que bloquean daño.
Ranura 4 bloqueada hasta recoger con E. N reinicia inventario; retomar lo conserva.
No introducir modelos o grabaciones comerciales. Validar qa-mortar/report.json
y revisar capturas de trayectoria/fuego/humo, no prometer equivalencia con Hunt.

Estándar permanente de telemetría fluida 0.6.1: separar física autoritativa de
presentación. Barrido fijo para verdad; actualización en cada render para UI;
suavizado exponencial dependiente de dt; 100 muestras uniformes para el arco;
una predicción alimenta cinta, puntos, impacto, radio y texto. No reintroducir
gates temporales visibles como el antiguo intervalo de 45 ms. Evitar escrituras
DOM si el contenido no cambió. Exponer densidad/cadencia/continuidad a QA.

Turnos 0.10.0: leer PLAN-TURNOS.md. Una autoridad CRTurns pura, un protagonista,
PvE activo y espera vulnerable. No reemplazar la fachada player compartida;
guardar/restaurar recursos al cambiar actor. QA turnos y colisiones obligatorio.
Vertical-world incorpora 26 sólidos por dimensión: usar índice común y conservar
pasaje cubierto/escalera/deck. No llamar cueva excavable al pasaje estructural.

Reglas/red 0.11.0 históricas: leer JUGAR-CON-AMIGO.md. Desde 0.14.0 el usuario
ordena victoria por último equipo vivo y bajas permanentes; puntos/reapariciones
siguientes describen únicamente mode:objectives explícito.
Puntos: relé+5 único por equipo/sitio, PvE+1, PvP+2, caída−1; 20 puntos/10min.
Reaparición al próximo turno del miembro, 3s de protección. Conservar múltiples
ataques, reloj y fases. Host Electron autoritativo, TCP acotado entre dos equipos;
guest no simula ni decide daño. Validar turno/actor/equipo antes de cada comando,
rechazar secuencia vieja, desactivar input perdido a 300ms, pausar desconexión.
No abrir firewall/router ni iniciar sala automáticamente. qa-online usa dos
renderers reales con IPC y TCP en loopback. APIs preload específicas, sin Node
ni ipcRenderer completo en renderer. Red de amigos/VPN, sin servicio público.

Arsenal 0.12.0: leer ARSENAL-Y-SUMINISTROS.md. loadout.js pura transfiere reserva
finita; conservar reserva/items por actor y en snapshots. Respawn: 7 pistola/0
reserva, no regala consumibles. Fases resolución5s/suministro2.8s/activo; onSupply
sólo autoridad genera cajas. Máximo12, TTL240s, RNG propio. No pickup doble.
H/J/K/L botiquín/escudo/antídoto/vela; pesado PvE envenena sin stacks ilimitados.
Roster en localStorage, sólo texto seguro; online lo define anfitrión. Commentator
usa frases originales de desarrollo, sin inventar IA generativa en vivo ni voces.
7s entre frases, texto5.5s; mismo comentario en ambos clientes. QA supplies +online
+regresiones existentes requeridas. No borrar ZIP/respaldos de versiones previas.

Victoria/perfiles 0.14.0: leer VICTORIA-Y-EQUIPOS.md. Por instrucción nueva del usuario reemplazar la regla histórica de puntos como default: victoryRules=['last-team'], muerte permanente, omitir eliminados, último equipo con HP>0 gana tras resolución5s; cero vivos empate. No restaurar reaparecer/puntos como default. mode:'objectives' conserva modo histórico explícito para evolución. Resultado replica ganador y supervivientes/HP. profiles.js migra roster-v1 a profiles-v2 con IDs estables, nombres y emoji por jugador; metadata cosmetics preparada sin skins disponibles. Editor bloqueado en sala; pruebas 1HP, muerte tardía, perfil y online obligatorias.

Objetivos/sigilo 0.15.0: leer OBJETIVOS-Y-SIGILO.md. Prioridad nueva: objetivos > supervivencia > bajas; ganar sin matar. P propósito por defecto táctico, supervivencia clásica separada. strategy.js autoridad pura y strategy-view.js pools; ocho herramientas y armas 1–3 usos, suministro y recompensas reponen hasta tope. Sin reloj dimensional38s. Contratos y HP/posición ocultos se filtran en exportNetwork por equipo; protagonista público para espectar. Ruido, cono/LOS, humo/sensor, campos por cierres de turno. Q fragmento funciona con luz encendida, 22s/55m. Refugios aguardando PvE, no PvP/veneno. Barrido sweptBox exacto en esquinas y fuente de mortero/directos estable. Obligatorios test-strategy + QA strategy/shelters y toda la suite antes de entrega. No presentar catálogo pendiente como implementado.
