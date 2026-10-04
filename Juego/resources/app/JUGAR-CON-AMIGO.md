# COSMIC ROLL 3D · reglas y conexión directa 0.14.0

## Propósito de partida

Gana el último equipo que conserve jugadores con HP mayor que cero, incluso un
solo jugador con 1 HP. Cero supervivientes = empate. La victoria se confirma
tras la resolución de ataques de 5 segundos. Los puntos y relés continúan como
objetivos informativos; no finalizan este modo. Leer VICTORIA-Y-EQUIPOS.md.

- Relé: +5 por equipo y sitio, una vez. Acercarse, E, quedarse quieto 2 segundos
  y despejar enemigos a menos de 16 m. Ambos equipos pueden extraer del mismo
  relé. M ubica los relés; compartir captura con el equipo no da puntos duplicados.
- Criatura derrotada: +1. Una baja rival: +2. Caer: −1 al propio equipo, mínimo 0.
- Personaje caído queda eliminado durante esta partida. Se omiten sus turnos,
  sin reaparición automática. Cuando queda un solo equipo vivo, se resuelven los
  ataques pendientes y se declara el resultado con nombres y HP supervivientes.
- Cada turno permite varios disparos, recargas, salto, dash y acciones. Disparar
  no termina la jugada. Tiempo y reserva finita/cadencia/recarga de cada arma limitan
  la ofensiva. Enter termina voluntariamente; sin nuevos ataques en resolución.
  Después caen suministros durante 2.8 s, luego comienza la próxima jugada.
  E recoge cajas; H/J/K/L consumibles. Ver ARSENAL-Y-SUMINISTROS.md.
- PvE sigue activo y los jugadores esperando siguen expuestos. Sin fuego amigo;
  mortero puede dañarte. La victoria actual depende de supervivientes, no del puntaje.
- Sin campamento de curación infinita en partida competitiva. Inventarios y
  puntuación no sobrescriben el checkpoint de expedición. Portal cerrado en sala.

## Probar con un amigo

Los dos necesitan la carpeta actualizada completa COSMIC ROLL 3D, misma versión
0.12.0, y abrir JUGAR COSMIC ROLL 3D.cmd. Esta prueba usa el ejecutable Windows;
la página web publicada no incluye conexión entre jugadores.

1. Estar en la misma red o tener una VPN privada entre ambas PC ya conectada.
   No hace falta un servicio en la nube. Para PC en casas distintas, usen la IP
   privada de esa VPN. No usar la IP pública del router como si fuera una VPN.
2. Anfitrión: P → Crear sala. Copiar IP y código que muestra el menú. Se puede
   elegir duración del turno antes de crear. Por ahora la sala tiene dos equipos
   de 1–6 personajes según el menú: anfitrión maneja equipo 1; amigo maneja equipo 2.
   Nombres se configuran en el anfitrión antes de crear; invitado los recibe.
3. Amigo: P, escribir IP del anfitrión y código → Conectar. La partida comienza
   al conectarse. Ambos ven la cámara del personaje protagonista; sólo quien
   posee su equipo puede controlarlo en ese turno. Todo el equipo comparte PC.
4. P en anfitrión pausa toda la sala. P en invitado abre su menú y libera sus
   controles, sin detener al anfitrión. Salir de sala termina la conexión.
5. Desconexión pausa al anfitrión. El invitado puede salir y volver a conectar
   usando IP/código; reanuda el estado del anfitrión, sin empezar otra partida.

TCP 49321. Si Windows pregunta por acceso de red, permitir sólo la red privada
usada para esta prueba. Este cambio no agrega reglas al firewall ni al router.
Si no conecta: misma versión/código, IP correcta de red/VPN, y permiso de red del
ejecutable en Windows. No hay invitación por link ni matchmaking automático.

## Implementación y límites

Host simula combate/PvE/física/recursos a 120 Hz y publica snapshots a 20 Hz. El
invitado envía comandos y observa estados interpolados; no resuelve daño local.
Vista, HP, equipos, reloj, objetivos, munición, enemigos, proyectiles, mortero y
eventos sonoros de combate se replican. También reservas, consumibles, cajas
con paracaídas y comentarios contextuales con los nombres elegidos. El entorno procedural estático coincide
por versión/semilla. Partículas menores, lluvia y capas ambientales son locales.
No hay predicción de movimiento: con latencia alta se nota demora de control.

Los comandos incluyen actor, turno y secuencia; el anfitrión rechaza equipo
incorrecto, comando de turno viejo y paquetes repetidos. Suelta controles tras
300 ms sin input. Hay límites de tamaño de paquete, cola, conexiones y frecuencia.
Electron mantiene aislamiento y renderer sin Node; usa un preload con métodos
específicos. TCP directo no tiene TLS propio: probar con amigos por red privada
o VPN. No es un servidor público ni un sistema competitivo contra trampas; quien
es anfitrión controla la autoridad. No se publica ni se abren puertos automáticamente.

El host necesita permanecer ejecutándose y renderizando. Al cerrar el anfitrión
no hay migración ni guardado competitivo. El jefe sigue enfocado en protagonista;
objetivos competitivos son relés, y el contrato antiguo no concede curación en
partida. El combate PvE original conserva progreso interno compartido de sesión.

Próximas etapas: lobby con nombres/equipos personalizados, cada miembro en su PC,
servidor dedicado, cifrado fuera de VPN, reconexión con identidad persistente,
inventario balanceado y predicción/reconciliación. Balancear puntuación/turnos con
partidas reales antes de ampliar el mapa o añadir dos protagonistas simultáneos.

Verificado con dos ventanas Electron ocultas conectadas por TCP real en la misma
PC: código incorrecto, conexión, transferencia de turno, movimiento, disparos,
munición, objetivo, puntaje, comando viejo, fin de turno y desconexión. Esa prueba
no sustituye jugar con latencia entre dos casas; todavía debe validarse con amigo.

Referencias técnicas oficiales:
https://www.electronjs.org/docs/latest/tutorial/ipc
https://www.electronjs.org/docs/latest/tutorial/context-isolation
https://nodejs.org/api/net.html
