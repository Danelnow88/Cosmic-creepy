# COSMIC ROLL 3D · Objetivos y sigilo · 0.15.0

## Jugar

Cerrar el juego anterior y abrir **JUGAR COSMIC ROLL 3D.cmd**. P → propósito
**Objetivos + sigilo** → Partida local por turnos. Elegir equipos/nombres/emojis
y Umbral I o II como antes. El anfitrión elige esas mismas reglas para la sala.
El modo **Último equipo en pie** sigue disponible por separado.

E activa/recoge/entrega. Enter termina turno. Elegir herramienta mediante sus
ocho botones con iconos y usar **G** hacia la mira; el círculo indica destino
y validez. M muestra objetivos en el mapa; el panel muestra los tres cercanos,
distancia y dirección. Q usa un fragmento de energía, incluso con luz encendida:
22 segundos de iluminación útil, radio 55 m, máximo seis fragmentos, E recoge.

## Propósito y objetivos

Meta inicial: 24 puntos. También puede ganar el último equipo vivo, con muerte
permanente. No hay reloj dimensional ni muerte a los 38 segundos.

- Cuatro balizas: E activa, mantener presencia sin rivales durante dos cierres
  de turno del equipo otorga +6, una vez por equipo/baliza. Un rival dentro
  disputa la captura; salir cancela progreso. No exige gastar un único ataque.
- Fragmento errante: recoger y entregar en Extracción, +8 por equipo.
  Al morir el portador cae en su posición y puede ser interceptado.
- Zona disputada: +2 por cierre del turno del equipo que la mantiene sin rivales.
- Nido hostil: eliminar los tres guardianes; queda una carga robable, +7 al
  extraerla. El dato rewardMode:'shared' permite otra recompensa compartida.
- Contrato individual privado: objetivo específico de entrega o terminar oculto
  en una baliza determinada, +3. Sólo se muestra al protagonista/equipo propietario.
- Supervivencia: +0.10 por cierre vivo. Bajas PvP/PvE: +0.05. El objetivo domina
  el puntaje; matar es una herramienta, no el requisito para ganar.

Objetivos por datos en tacticalDefinitions/config.objectives. Tipos, radio,
posición, puntos, permanencia y recompensa son configurables. Modos clásicos
mantienen sus reglas históricas; este documento manda sobre el README histórico.

## Ocho herramientas operativas

| Icono / nombre | Usos | Acción / contrajuego |
| --- | ---: | --- |
| Tirón · Lazo resonante | 2 | Enganche corto a cobertura real, hasta 25 m. Tirón de 0.65 s con barrido de esfera; cobertura y espacio bloquean. |
| Ancla · Salto de ancla | 1 | Teletransporte a suelo visible libre hasta 18 m. No atraviesa sólidos; llegada revela. |
| Mira · Aguja de presión | 3 | Pulso hasta 40 m, radio 3.5 m: centro 18 daño/40 impulso, medio 8/25, borde 2/10; cobertura bloquea. |
| Vegetación · Nube de ceniza | 2 | Humo de 6 m durante dos cierres globales. Corta visión; no balas. Sensor y cercanía contrarrestan. |
| Ojo · Ojo de pulso | 2 | Sensor de 12 m durante dos cierres, 20 HP. Detecta camuflaje/humo, no atraviesa sólidos. Destruible. |
| Capullo · Manto de quietud | 1 | Cierra turno protegido del PvE hasta próxima jugada. No bloquea PvP ni cura veneno anterior. |
| Frasco · Sello corrosivo | 2 | Zona 4 m, dos cierres: centro 6 daño + veneno, medio 3, borde 1. Pulsa al cerrar turno; salir/cobertura/antídoto contrarrestan. |
| Eco · Mensajero de falla | 1 | Criatura móvil destructible, 30 HP, tres cierres. Atrae PvE; si llevás carga puede transportarla a Extracción. Si muere o expira, la deja. |

Todas las herramientas consumen stock sólo tras validarse. Ninguna pasa su tope
de 1–3 usos. Armas existentes también tienen tres usos en el modo táctico; cada
disparo/ráfaga es un uso, además de la munición y reserva finitas originales.
Recargas no regalan usos. Cajas de munición reponen un uso por arma hasta tres.
Una caja de herramientas cada tercer suministro repone una carga disponible;
defensa finita aparece sólo cada octavo turno. Recompensas de objetivos reponen
una herramienta no defensiva. Cada personaje conserva su inventario.

## Sigilo, seguridad y colisiones

PvE y observadores usan cono/distancia/LOS. Vegetación, refugio, piedra, alcance
de niebla/luz y humo modifican detección. Disparos, dash, mortero, explosiones y
carga luminosa revelan temporalmente; una pared sigue bloqueando visión.
El HUD muestra oculto/expuesto y el motivo. Sensor informa pero puede destruirse.
Verificación de visibilidad acotada/caché 100 ms, registro 64 entradas.

28 refugios por dimensión: grietas, arbustos anómalos y puestos disputados con
un ocupante. B capullo, X piedra, T ancla, Y eco, todos finitos. E/Enter dentro
prepara espera segura del PvE. La protección termina al volver al turno propio.
No protege del PvP o veneno adquirido; escondite y posicionamiento siguen importando.

Hitbox: barrido exacto esfera/AABB sustituye el cubo inflado que impactaba de más
en esquinas. Cuerpos coincidentes se separan con eje estable; índice único para
cámara, cuerpo, proyectil y audio. Daño directo y proyectiles/morteros preservan
identidad del atacante incluso al transferir el turno.

Telemetría de daño por herramienta: centro/medio/borde, fuente, víctima, daño,
cobertura/protección y turno, máximo 64 entradas. Consultar CR3D.snapshot().strategy
en desarrollo. Los mismos callbacks reales aplican daño a jugadores y PvE.

Online: autoridad única anfitrión, comandos G validados con turno/actor, stock y
destino calculado por el host. Contratos/usos privados se filtran por equipo;
jugadores enemigos esperando y ocultos no envían HP, estado, inventario ni posición.
El protagonista activo es público para espectar, según el diseño de turnos.
Las balizas/cargas y efectos de mapa son información pública por diseño.

## Alcance y próximos pasos

Primera entrega funcional. Falta el catálogo restante: jetpack, puentes, excavación,
paracaídas, granada/racimo/mina, ataques aéreos diferidos, fuego/napalm/charcos,
barreras y criaturas contextuales adicionales. No se presentan como herramientas
ya disponibles. El terreno no es destructible; el enganche es corto y no péndulo.
PvE no tiene navegación subterránea compleja. Humo y niebla son aproximaciones
económicas; no sombras volumétricas ni simulación de fluidos.

## Verificación

node prototype/test-strategy.cjs; tests física/colisión/turnos/perfiles/loadout/peer.
Electron --strategy-qa prueba las ocho ejecuciones reales, inventario, extracción,
captura, duración, privacidad, victoria y dos clientes. --thirdperson-qa incluye
las regresiones completas, 648 configuraciones de cámara y la suite refugios/luz.
Las capturas están en qa-strategy y qa-shelters. Validar antes de instalar.
