# Umbral II · Señal sumergida — 0.13.0

**Propósito:** dimensión jugable completa para expedición y partidas por turnos,
locales u online. El mundo parece una emisión interdimensional que continúa
transmitiendo aunque sus habitantes hayan desaparecido. Mismo tamaño: 7200 unidades.

**Identidad visual:** marisma oscura con crecimiento orgánico iridiscente;
receptores rotos, coros minerales y membranas. Se conserva terreno, vegetación,
escala, máscaras, armamento, niebla y muestras Growth existentes. Umbral I conserva
su composición original; ambos accesos comparten ahora el agujero negro.

**Identidad sonora:** dos capas vocales Growth, resonancias espaciales en
receptores, agua, crujidos y silencios. Los receptores reutilizan emisores de
ruinas y el presupuesto de audio existente: no agregan contextos ni voces ilimitadas.

**Relación con el estilo:** mutación del mismo mundo, no sustitución artística.
Las regiones son Jardín de antenas, Horno de membranas, Coro fracturado y Archivo
del vacío. Son nombres de las cuatro regiones existentes, conservando su lógica.

**Reutilización:** fachada world, terreno triangular, índice único de colisiones,
cámara validada, relés, jefe, extracción, armas, munición, consumibles, provisiones,
turnos, puntuación, audio espacial y autoridad TCP.

**Contenido nuevo:** 16 carcasas de receptores sirven de cobertura real; cuatro
antenas indican objetivos y sugieren habitantes ausentes. Tres rutas dejan huecos
en la vegetación sólida; 36 fragmentos discretos ayudan a orientarse. La cobertura
no encierra objetivos: dos aproximaciones quedan abiertas. Arbustos y membranas
siguen siendo decoración blanda y no prometen ocultación/invisibilidad.

**Interacciones:** E permite cruzar la singularidad en expedición; consumo,
progreso y enemigos se conservan por dimensión durante la sesión. Relés, jefe y
extracción funcionan igual. P permite elegir dimensión antes de explorar, iniciar
partida local o crear sala. La nueva expedición seleccionada inicia recursos nuevos;
cruzar E conserva los actuales. Checkpoint persistente sólo para Umbral I, sin
cambiar el alcance de guardado existente.

**PvE:** los enemigos ocupan el segundo terreno y se enfrentan a las mismas
coberturas y reglas. En expedición, tres relés despiertan al jefe. En partidas,
los relés extraen puntos, con PvE activo durante turnos y espera; el jefe no se
despierta por capturas competitivas. No se modifica el balance de combate.

**Riesgos de balance:** las coberturas nuevas pueden favorecer ciertas posiciones;
necesitan sesiones humanas para ajustar. Las rutas despejadas mejoran navegación
pero también exposición. Espera vulnerable y reapariciones existentes se conservan.

**Singularidad:** bola negra pequeña, disco tenue, borde de lente y 64 trazas que
convergen. E inicia 3.05s: una copia visual del cuerpo se afina y estira hacia el
núcleo; el terreno cambia a los 2.35s y se recupera control al finalizar. Posición
física y cámara conservan sus validaciones. Movimiento, disparo, daño y recursos
quedan suspendidos durante el tránsito. Pausa congela; reinicio cancela. Esto es
una interpretación artística de espaguetificación, no relatividad simulada ni
una garantía de reproducción científica exacta. No requiere nuevas luces/sombras.

**Partidas online:** anfitrión elige mapa para todos. El invitado activa su terreno,
colisiones y acústica antes de importar posiciones, roster y cámara. El portal
queda sin viajes durante una partida: todos sus actores comparten un escenario;
la selección de P aplica a la próxima partida. No hay actores repartidos entre
dimensiones simultáneas ni nueva infraestructura de red.

**Impacto técnico:** geometría procedural acotada, una instancia de 16 coberturas,
20 sólidos nuevos indexados, 36 indicadores instanciados, cuatro receptores y
64 segmentos por singularidad. Una copia visual reutiliza geometrías/materiales
del jugador; se crea una vez. Dos mapas máximo, uno visible. Sin assets externos.

**Archivos:** dimensions.js define recetas y contenido; singularity.js define
imagen y tránsito; world.js integra rutas y emisores; thirdperson.js selecciona
mapa y sincroniza dimensión. thirdperson.html carga módulos. verify-umbral.cjs
prueba el flujo; verify-online.cjs corre combate, suministros y objetivos en II.

**Implementación:** persistir lore íntegro en UNIVERSO-DEL-JUEGO.md y referenciarlo
desde AGENTS.md; seleccionar escenario al iniciar partida; activar escenario
real en invitados; componer zonas y coberturas; sustituir acceso con tránsito;
validar regresiones, respaldar e instalar. Ninguna mecánica de los ejemplos del
lore (hongos, invisibilidad o piedra) se considera obligación literal.

**Pruebas:** ida/vuelta con E, pausa/reinicio durante tránsito, recursos, rechazo
de acciones repetidas, relés/jefe/extracción, partidas locales, caída de provisiones,
handoff, cliente TCP en Umbral II, cámaras/coberturas de ambos mundos, física,
audio y presupuesto de render. QA automatizada no sustituye balance con personas.

**Futuro:** agujeros de gusano comparten base visual, con posible tonalidad leve;
otras dimensiones amplían recetas sin reemplazar sistemas. Señales narrativas,
objetos con contrajuego y amenazas específicas requieren nuevas propuestas con
el formato del lore. Nada de estos futuros se presenta como ya implementado.
