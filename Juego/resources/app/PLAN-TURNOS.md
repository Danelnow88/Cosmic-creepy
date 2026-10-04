# COSMIC ROLL 3D · base táctica y conexión directa 0.14.0

## Dirección elegida para probar

Una sola jugada protagonista y una cámara a la vez. Los equipos alternan y cada
equipo rota sus miembros vivos; los caídos quedan eliminados. Gana el último
equipo en pie. Ver VICTORIA-Y-EQUIPOS.md para la regla actual. No fijamos el tamaño definitivo: el menú admite
2–4 equipos de 1–6 miembros. Es una partida local compartiendo teclado y pantalla,
sin cuentas ni servidor dedicado. Además hay conexión directa entre dos PC
con dos equipos de dos personajes: ver JUGAR-CON-AMIGO.md. La expedición sigue siendo
el modo inicial; P → Partida local por turnos inicia esta prueba.

45 segundos por defecto, configurables en el menú. Enter termina la jugada.
Siguen 5 segundos sin nuevos controles para resolver ataques y 2.8 s de cajas
con paracaídas; después se cambia
actor y cámara. PvE, proyectiles y estados continúan en ambas fases; la pausa
detiene toda la simulación. Los jugadores esperando son inmóviles y vulnerables.
Gana por puntos (20) o por máximo puntaje a los 10 minutos. Eliminar todos los
miembros de un equipo no termina la partida; reaparecen al recibir turno.
La muerte de un miembro no pausa ni termina por sí sola la partida.

## Implementado

- turns.js: autoridad local independiente de Three/DOM, equipos, orden estable,
  reloj, fases, bajas/reaparición, puntos por relés/PvE/PvP, ganador y snapshots.
- turn-view.js: cuerpos en espera, color por equipo, nombres/vida/estados,
  proximidad para selección de víctima PvE y posiciones individuales.
- thirdperson.js conserva una fachada de jugador para los sistemas existentes.
  Al cambiar turno guarda posición, velocidad, orientación, HP, munición,
  arma/mortero, cerillas, combustible y miedo; restaura los del próximo actor.
  Cámara y escucha espacial siguen exclusivamente a ese actor. Las velas y
  enfriamientos de actores inactivos quedan congelados; veneno sí avanza.
- Enemigos comunes eligen al actor vivo cercano. Balas hostiles dañan cuerpos
  activos o esperando; balas y mortero del jugador dañan rivales. Sin fuego amigo
  entre miembros del equipo; el mortero conserva daño propio. Los cuerpos en
  espera bloquean desplazamiento y no reciben empujones. El jefe aún enfoca al
  protagonista de turno: ajustar su selección de víctima en la próxima etapa.
- Estado poison: daño continuo en segundos de mundo, incluso esperando.
  Estado shield: reduce daño a la mitad mientras dura. Son API de preparación,
  hay consumibles reales de escudo/antídoto, botiquines y vela. Enemigos pesados
  envenenan; cajas aportan objetos o munición con reserva finita por actor.
- Contrato, exploración, botín y mejoras siguen siendo progreso compartido de
  sesión. Puntos competitivos se atribuyen por equipo, con relés +5 únicos,
  PvE +1, baja rival +2 y caída -1. No hay curación infinita de campamento.
  Estado protegido 3s al reaparecer. Inventario/recompensas extensos pendientes. La partida
  no se guarda ni reanuda al cerrar; el checkpoint existente es de expedición.

## Verticalidad mínima en ambos umbrales

Observatorio (x480, z1150): escalera y plataforma elevada de ~12 m, con cobertura
estructural. Plataforma baja contigua (x620, z1090). Pasaje inferior (x900, z620):
depresión de terreno ~13 m cubierta por techo, paredes laterales y columnas,
abierta en sus extremos. Ambos lugares figuran en M. Se usan 26 sólidos por mapa
en el mismo índice de cuerpos, armas, acústica y cámara. Ascenso de escalones de
hasta 14 unidades sólo apoyado; no permite escalar paredes altas o atravesar
techos. No es un sistema de excavación ni terreno destruible: el túnel es un
pasaje hundido con una estructura encima, no una cueva dentro de un voxel.

## Siguiente implementación por etapas

1. Definir reglas antes de expandir: daño a quien espera, velas fuera de turno,
   créditos de bajas/botín por actor/equipo, condición de objetivo/extracción,
   posible muerte por PvE del último equipo y duración de resolución balística.
   Por ahora prevalece una única jugada; dos jugadores simultáneos requieren
   cambiar el concepto de turno exclusivo y la presentación de cámaras.
2. Implementados inventarios por actor, munición/consumibles y pickups compartidos,
   veneno/antídoto/escudo obtenibles, nombres y objetivos por equipo. Pendientes
   objetos arrojables, inventarios balanceados por partida y persistencia. Separar progreso compartido de expedición
   antes de conceder recompensas competitivas. Desactivar checkpoint competitivo
   o darle un formato propio; mantener el aislamiento actual de expedición. El portal queda
   cerrado durante partida, porque todos los actores comparten un mismo mapa.
3. Navegación PvE vertical: soporte de superficies y rutas por escaleras, patrullas
   del pasaje y selección de víctimas del jefe. Hoy los enemigos comunes usan
   altura del terreno; estructuras brindan ventaja vertical y no tienen navmesh.
4. Cámaras de observación: perspectiva principal autoritativa, transición breve,
   panel individual de vida/estados/equipo/objeto. Más adelante espectador local
   libre como opción, conservando la vista protagonista por defecto.
5. Red 0.11.0: anfitrión Electron es autoridad con TCP e IPC, snapshots20Hz,
   controles por actor/turno/secuencia. Invitado observa y manda comandos; no
   decide física/daño. Desconexión pausa, reconexión conserva estado del host.
   Dos renderers reales probados en loopback; partida entre casas por validar.
   Próxima etapa: servidor dedicado como única autoridad de turnos, reloj, HP, recursos, PvE y
   disparos; comandos con actorId/turnId/secuencia validados, snapshots con tick,
   deltas y eventos reproducibles. Renderer interpola snapshots; no decide daño.
   Agregar lobby, identidad/reconexión robusta, abandono y pruebas de latencia.
   Protocolo actual para amigos por LAN/VPN, sin matchmaking/TLS propio.
6. Mapas con varios pisos/dimensiones y objetos globales después de estabilizar
   estas reglas. Mantener presupuesto de iluminación, voces y colliders acotado.

Referencia conceptual de Team17: alternancia, protagonismo individual y recursos
por equipo, sin copiar assets ni confundir esta base con Worms multijugador:
https://www.team17.com/news/team17s-100-games-part-seventeen-2016-overcooked-worms-w-m-d-and-more

## Verificación

node prototype/test-turns.cjs · node prototype/test-physics.cjs ·
node prototype/test-collision-world.cjs · Electron . --thirdperson-qa.
qa-turns verifica menú, reloj/pausa, rotación/restauración de munición, inmovilidad,
PvE a actor esperando, balas rivales/fuego amigo, mortero, veneno, escalera,
plataforma y pasaje en ambos mapas. qa-stability recorre los colliders y cámara.
