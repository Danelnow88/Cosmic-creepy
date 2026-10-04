# COSMIC ROLL 3D · arsenal, suministros y nombres 0.12.0

P → Nombres de equipos y jugadores. Cambiar nombres antes de iniciar partida
local; se guardan en esta PC y se muestran en personajes, HUD y comentarios.
2–4 equipos / 1–6 miembros en local. Online mantiene dos equipos, ahora de 1–6
miembros según el anfitrión; nombres y reglas viajan a la otra PC. En local todas
las personas usan el mismo teclado y la cámara observa al protagonista del turno.

## Munición real

| Arma | Cargador inicial | Reserva inicial | Reserva máxima | Caja de munición |
|---|---:|---:|---:|---:|
| Pistola | 14 | 28 | 84 | +14 |
| Rifle | 28 | 56 | 168 | +28 |
| Escopeta | 6 | 12 | 36 | +6 |
| Mortero | 3 | 3 | 9 | +1 |

R transfiere reserva al cargador después de la animación. Si sólo quedan 4 balas,
recargar carga 4; reserva 0 no permite recarga. Cambiar de arma o turno cancela
la recarga sin gastar reserva. Munición individual, conservada al volver al
personaje. La escopeta gasta un cartucho por disparo, no ocho por sus perdigones.
El mortero sigue bloqueado hasta recogerlo con E en el refugio.

Reaparición competitiva: 100 HP, vela nueva y protección 3 s, pero sólo 7 balas
de pistola, sin reserva ni cartuchos de otras armas. No repone consumibles:
los gastados siguen gastados. Morir no es una recarga gratuita del arsenal.
La expedición individual conserva el refugio como fuente explícita de reposición;
la partida por equipos depende de las cajas y no permite curación infinita allí.

## Caída entre turnos

Después de 5 s de resolución hay 2.8 s de SUMINISTROS, antes del próximo turno.
Una caja cae con paracaídas cerca de un personaje seleccionado al azar (10–23 m),
que puede pertenecer a cualquier equipo. Puede caer sobre terreno o estructura;
su altura de aterrizaje consulta el mismo índice del mundo. Se buscan posiciones
que eviten cubiertas demasiado altas respecto al jugador/terreno.

E recoge la caja cuando está en el suelo y cerca; queda consumida para todos y
beneficia al personaje que la recoge. Sin recogida automática ni dueño reservado.
Indicador con dirección, tipo y distancia. Probabilidades: munición 55%, botiquín
15%, escudo 12%, antídoto 9%, vela 9%. Máximo 12 cajas, vida de 240 s; posiciones
y tipos usa RNG separado del combate, nueva semilla al iniciar partida.
El PvE sigue activo durante la caída. No se disparan ni usan objetos mientras
resuelve el turno o cae la caja. Los inactivos pueden ser atacados como antes.

## Consumibles

Cada personaje empieza con uno de cada tipo, máximo tres de cada uno. Botones
del HUD o teclas; consumo con 0.65 s de espera y 0.5 s de bloqueo de disparo.

- H Botiquín: +35 HP hasta 100. No se gasta con vida completa.
- J Escudo: 8 s con mitad de daño. No se gasta si ya está activo.
- K Antídoto: quita veneno; no se gasta si no hay veneno. Los enemigos pesados
  pueden envenenar con cuerpo a cuerpo: 12 s / 0.8 HP por segundo. Reaplicar
  renueva el estado sin acumular infinitas capas.
- L Vela: +60 s de combustible (máximo 240 s) y una cerilla (máximo seis).
  Q prende la llama apagada. Recargar combustible no prende automáticamente.

Estados, daño y consumibles se resuelven en la autoridad local/anfitrión. El
invitado envía la acción; no duplica curación, inventarios, pickup ni cajas.

## Comentarios originales

Más de 50 frases escritas/generadas durante el desarrollo, con nombres reales y
contexto: turno, baja, muerte, liderazgo, captura, caja, recursos agotados y regreso.
Se muestran como texto durante 5.5 s, con 7 s entre comentarios y memoria de
última variante para evitar repetir. Son un director de frases contextual offline,
sin llamadas a un modelo en vivo, API ni cuota adicional. No hay voces grabadas.
Las frases y su cadencia se replican: los dos equipos leen el mismo comentario.

Ejemplos: «{equipo} la va rompiendo. Pero todavía queda partida.»; «{nombre} está
negociando con un cargador vacío.»; «El cielo mandó una caja. El mapa decidirá
para quién.»; «{nombre} necesita una segunda oportunidad. Por suerte hay próximo
turno.» La atmósfera no se sustituye por narración constante: comentarios discretos.

## Verificado / límites

Pruebas de reserva parcial/cero, pickup único, conservación por actor, fase de
caída antes del control, objetos/veneno PvE, nombres guardados y pool acotado.
QA online conecta dos renderers por TCP real y compara reserva, botiquín, cajas
y comentario, además de movimiento, combate y objetivos. Prueba entre dos casas
continúa pendiente; instrucciones en JUGAR-CON-AMIGO.md. Ambas PC deben usar 0.12.0.
No hay persistencia completa de partida ni bolsa de objetos arrojables todavía.
Las cajas son pickups, no cobertura rígida para balas o cuerpos. El túnel/cámara
y estructuras conservan su física previa. Cajas competitivas entre turnos; la
expedición libre todavía no tiene un director periódico de airdrops propio.

Actualización 0.14.0: en el modo predeterminado los eliminados no reaparecen. Las referencias anteriores al inventario de reaparición sólo aplican al modo explícito por objetivos. Nombres y símbolos se guardan ahora en CR3D-profiles-v2; leer VICTORIA-Y-EQUIPOS.md.
