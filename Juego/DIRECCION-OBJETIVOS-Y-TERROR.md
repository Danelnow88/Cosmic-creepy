# Dirección permanente: objetivos y terror cooperativo

Pedido del usuario: incorporar progresivamente mecánicas aprovechables de
Identity V y Dead by Daylight. Identity V tiene preferencia tanto por sus
mecánicas como por su estética. Esta dirección complementa UNIVERSO-DEL-JUEGO.md:
se mantienen esferas, geometría cósmica, dimensiones, atmósfera y turnos.
El PvP trata de objetivos, escondite, información y recursos; matar no es la meta.

## Primera implementación — 0.16.0

En P → Objetivos + sigilo → Partida local, cada equipo puede sintonizar tres
resonadores y abrir una Brecha de retorno. La secuencia da 24 puntos y permite
ganar sin matar. Convive con balizas, carga, zona disputada, PvE y contratos.
No cambia el modo Último equipo en pie ni la expedición.

- Cada resonador requiere seis segundos de trabajo real del personaje activo.
  E inicia; quedarse quieto continúa automáticamente. Tres dan +2 cada uno.
- Cada equipo tiene progreso separado, compartido entre sus miembros. El
  avance parcial persiste entre turnos. La espera no produce avance.
- Movimiento de más de seis unidades, daño, pérdida de línea de visión o
  rival en la zona interrumpen. E permite reanudar al volver a estar seguro.
- El mecanismo revela por ruido durante el trabajo; sigilo/defensas/distracción
  existentes ayudan a completar la acción ante el PvE siempre activo.
- Brecha: los tres resonadores del equipo deben estar completos; E inicia
  ocho segundos expuestos y da +18 al completarse. No exige bajas ni munición.
- HUD: iconos, progreso porcentual, circuito 0/3 y brecha sellada/habilitada.
  Colores diferencian completado, disponible y bloqueado.
- Datos: tipos resonator/breach, workSeconds, requires, points, radius.
  No nuevas luces ni shaders; geometría reutilizada dentro del pool de 12.
- Host autoritativo; progreso/canal se replican por el snapshot existente.
  Ambas PC deben usar 0.16.1. Todavía no hay evacuación individual: la brecha
  completa un objetivo de victoria por puntaje.

## Próximas mecánicas propuestas, todavía no implementadas

1. Rescate de aliados retenidos en cápsulas: plazo en turnos del afectado,
   salvamento arriesgado, protección breve al rescatar y contrajuego al camping.
   No sustituir muerte permanente hasta probarlo como modo configurable.
2. Calibración: acción breve opcional y accesible; error emite una señal acústica,
   acierto ahorra tiempo. No penalizar la espera ni depender de latencia del guest.
3. Distracción y persecución: recompensar el tiempo comprado para que un aliado
   complete trabajo; validar amenaza real para evitar farmear puntos solo.
4. Rutas con atajos de uso limitado, cierres y obstáculos interactivos: nunca
   bloquear a todos los equipos ni alterar cámara/colisiones sin pruebas.
5. Escape alternativo contextual para equipo rezagado, con pistas y coste real;
   evita partidas decididas demasiado pronto sin regalar victoria.
6. Roles de apoyo/detección/exploración, herramientas finitas y rescates;
   evaluar asimetría frente al PvE antes de introducir un jugador cazador.

## Dirección estética a desarrollar

Inquietud teatral, mecanismos que parecen vivos, desgaste, costuras y máscaras
como motivos abstractos originales, rostros incómodos y espacios narrativos.
Adaptarlos al lore geométrico existente, especialmente en futuros escenarios;
no copiar personajes, máquinas, sillas ni recursos de las referencias.
Esta entrega no es un rediseño completo de mapas ni de personajes.

## Referencias verificadas

Identity V: objetivos de decodificación, puertas y rescate reconocibles en las
notas oficiales: https://www.identityvgame.com/en/news/announcement/20260618/35288_1304831.html
y https://www.identityvgame.com/en/news/announcement/20250703/35288_1244746.html
Dead by Daylight: cooperación, reparación y escape:
https://deadbydaylight.com/game/?category=survivor
Lo anterior es una adaptación de diseño para Cosmic Roll, no sus reglas exactas.

## Validación

node prototype/test-circuit.cjs: interrupción, cooperación, progreso por equipo,
dependencias, no farmear, snapshots y victoria sin daño. --circuit-qa verifica
acceso y UI de los tres resonadores y extracción con la simulación real.
--thirdperson-qa conserva también agujero negro, iluminación, cámaras y red.
