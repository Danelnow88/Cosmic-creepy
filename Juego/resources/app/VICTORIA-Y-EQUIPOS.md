# Último equipo en pie y perfiles familiares — 0.14.0

**Propósito:** terminar una partida con un ganador real y permitir equipos de
personas con nombres y símbolos propios. Esta regla reemplaza el modo competitivo
predeterminado de 0.11–0.13; el lore y la atmósfera siguen vigentes.

**Regla actual:** gana el último equipo con al menos un miembro con HP mayor que
cero. No importa su puntuación ni cuántos integrantes perdió. Si Julián es el único
superviviente de Dulce de leche y tiene 1 HP, gana Dulce de leche por Julián.
Caer es eliminación permanente durante esa partida; los turnos omiten jugadores
y equipos eliminados. No hay reaparición automática en este modo.

Se mantiene la resolución de ataques de 5 segundos antes de declarar resultado:
proyectiles, explosiones, veneno y PvE todavía pueden eliminar al último superviviente.
Si todos quedan en cero, el resultado es empate sin supervivientes. Tras el resultado
el reloj y el daño se detienen, no se puede continuar una partida terminada.

**Interacciones:** P → Crear equipos · nombres de jugadores y emojis. Editar nombre
del equipo, nombre individual y símbolo; configurar 2–4 equipos de 1–6 personas.
Los presets son Equipo de prueba 1/2/3/4; se conservan Carlitos, Martín, Julián,
Eduardo y los demás nombres iniciales. Los nombres propios existentes se migran
y se conservan. Empezar la partida aplica esos perfiles. Durante una sala online,
el roster queda bloqueado y lo define el anfitrión antes de crearla.

**Identidad visual/sonora:** misma escena y personajes; símbolo y nombre aparecen
en HUD, etiquetas de espera y resultado. Sin nuevas luces, sonidos o texturas de
personajes. El comentario deja de prometer reapariciones. Los símbolos son texto
y emoji, no modelos de personajes ni skins implementadas.

**Reutilización:** turnos, daño, estados, cámara, provisiones, relés, red autoritativa
y menú de pausa. Los objetivos siguen dando puntos informativos; ahora no terminan
la partida. Tampoco la cierra el antiguo límite total de diez minutos: continúa
hasta quedar un equipo. Cada turno conserva su límite y múltiples ataques.

**Nueva estructura:** profiles.js persiste CR3D-profiles-v2, migra CR3D-roster-v1
y separa profileId individual estable de actorId temporal, inventario y pertenencia
al equipo. Cada perfil transporta name, avatar y cosmetics.skinId='default'. El
espacio para futuras skins está preparado en perfil y snapshot, sin un selector
ficticio ni catálogo. El avatar admite dos grafemas completos, incluido emoji de
familia; los nombres admiten 24 grafemas y equipos 30. Se renderizan como texto.

**Victoria ampliable:** victoryRules es una lista de condiciones admitidas por la
autoridad. Por defecto ['last-team']. El modo anterior puede probarse explícitamente
con match.start({mode:'objectives'}), que usa ['score','time'] y sus reapariciones.
No se expone como modo nuevo en el menú. Se pueden combinar reglas; supervivencia
tiene prioridad si ocurre en el mismo instante. Nuevos objetivos deben ampliar
evaluateVictory y pruebas sin mezclar identidad/perfiles con condiciones de victoria.

**PvE/riesgos de balance:** amenazas y estados siguen activos para jugadores en
espera; provisiones se distribuyen cerca de supervivientes. La eliminación ahora
es definitiva y exige pruebas humanas para ajustar letalidad/PvE. La ventana de
resolución puede producir empate por explosiones o veneno tardío. No cambia el daño
ni agrega invulnerabilidad arbitraria al último miembro.

**Impacto técnico:** evaluación acotada a cuatro equipos/24 jugadores, mismo paso
fijo, pools de juego y contexto de audio. Perfiles son datos locales, no cuentas,
autenticación ni identidades verificadas. Se sincronizan identidad, condición,
equipo ganador y supervivientes/HP; el invitado nunca decide el resultado.

**Archivos:** turns.js decide condiciones/rotación/resultado; profiles.js crea el
editor y migra perfiles; thirdperson.js muestra resultado y configura partidas;
turn-view.js rotula símbolos y oculta eliminados; supplies.css ajusta el editor;
commentator.js evita mensajes incompatibles; peer.cjs anuncia la versión 0.14.0.

**Plan aplicado:** separar condiciones, eliminar reaparición en supervivencia,
mostrar equipo y supervivientes, migrar identidades, extender snapshots y conservar
objetivos opcionales; probar reglas, editor, persistencia, ambos mapas y red;
respaldar la entrega anterior antes de instalar y crear ZIP actualizado.

**Pruebas:** victoria 1 HP aunque el rival tenga más puntos; bajas por PvP/PvE y
veneno; empate simultáneo/tardío; exclusión de eliminados; bloqueo del resultado;
modo por objetivos compatible; emoji compuesto intacto, migración y profileId
estable; menú local y victoria idéntica en dos clientes TCP; regresiones de mundo,
cámara, armas, provisiones, audio y Umbral II.

**Futuro:** presets completos guardables, perfil de cada invitado, cosméticos
individuales y condiciones extra de victoria. Ninguno se presenta como disponible
todavía; la base de datos y autoridad permiten incorporarlos ordenadamente.
