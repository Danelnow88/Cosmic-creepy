# KayKit Character Animations 1.1

Fuente: ZIP local del usuario E:/Descargas/KayKit_Character_Animations_1.1.zip. Autor: Kay Lousberg, www.kaylousberg.com. CC0; licencia íntegra en assets/kaykit/LICENSE.txt. No sustituye al Warrior ni su licencia; cuerpo/esfera/cara permanecen.

130 clips del Rig Medium retargeteados offline por rotaciones mundiales y calibración de pose de referencia; ejes y huesos distintos. Catalogados en assets/kaykit/converted; GLB originales en assets/kaykit/source. Rig Large no se utiliza: nuestro cuerpo usa el retarget Medium. T-Pose y Experimental_Transform se excluyen del catálogo jugable.

Se precargan sólo 19 animaciones para evitar cargar 130 en cada partida: reposo, caminar, correr, salto, aterrizaje, dash, apuntar/disparar/recargar a una y dos manos, golpe, interacción, melee y muerte; recoger/lanzar/usar quedan preparados. No se añaden reglas ni herramientas nuevas por tener animaciones disponibles. Root motion desactivado: movimientos del mundo siguen en la física autoritativa. Geometrías y clips compartidos, huesos/mixer por actor, caras originales intactas. Salto sigue al estado real; no al cronómetro de un clip.

Respaldos antes-kaykit en resources/app/respaldos. Sin descargas durante partida. Sin commit/push. Catálogo restante preparado; no implica que existan mecánicas nuevas de pesca, construcción o simulación.

## Probar en el ejecutable
Cerrar el juego abierto y ejecutar ABRIR HUMANOIDES.cmd desde la carpeta COSMIC ROLL 3D - Humanoides. El HUD debe decir HUMANOIDES · KAYKIT 1.1. WASD, Espacio, Shift, clic/F y R usan los movimientos conectados. F7 abre el laboratorio de animaciones: pausa la simulación y permite elegir cualquiera de los 130 clips locales. F7/Escape/Volver restaura la pausa anterior. Disponible sólo en local para no congelar una partida online.

El disparo visual ahora sigue disparos aceptados, no el cooldown de cambio de arma ni el de consumibles. Los clips de cuerpo completo, suelo y muerte apoyan la malla; la física del collider conserva su posición y tamaño. No se ha agregado IK independiente por pie sobre pendientes, accesorios nuevos para cada clip ni nuevas mecánicas de los clips de catálogo. Las bajas de enemigos conservan la eliminación existente; no agregamos cadáveres persistentes.

QA empaquetado: --kaykit-qa verifica estados reales, disparos aceptados, recarga, pausa del visor, cancelación de solicitudes y 390 muestras (tres tiempos de cada clip). --thirdperson-qa incluye esta suite tras las regresiones del juego. Los resultados están en qa-kaykit/report.json y catalog-poses.json; capturas en el mismo directorio. Precarga de 19 clips: 1.37 MB de script; el resto se carga por demanda desde assets locales. Recursos de geometría y clips compartidos; LOD de evaluación de poses existente conservado.

## Resultado final de validación
Regresión completa ejecutada en COSMIC ROLL 3D.exe: 417 comprobaciones aprobadas (402 existentes + 15 KayKit); 390 poses muestreadas, 648 configuraciones de cámara y prueba online real entre dos ventanas. Cero errores de renderer registrados. QA mundo registró 60 FPS, igual a la referencia anterior; es una muestra, no una garantía para todo hardware/escenario. Checks Node: física 8, colisiones 15, estrategia 54; 74 archivos originales de referencia preservados y sintaxis válida. Log de ejecución: Juego/kaykit-final.out.log. Sin commit/push.

## Corrección de vibración de locomoción
Reproducido con variaciones de velocidad cerca de 170: 52 cambios walk/run en seis segundos; con una pérdida de apoyo de un cuadro cada ocho: 90 cambios jump/land. Ahora ambos casos dan cero cambios espurios. Histeresis de locomoción (correr entra >185, sale <155; caminar entra >8, sale <3), conserva la fase de zancada entre caminar/correr y detiene acciones inactivas al completar su fundido. La representación espera 80 ms antes de interpretar una pérdida de apoyo como caída; un salto real con velocidad vertical ascendente >40 es inmediato. Física, collider, velocidad de juego, combate y cámara siguen intactos. La transición de aterrizaje se emite sólo al volver de un estado aéreo confirmado.

Regresiones nuevas en verify-humanoid-debug.cjs: velocidad alrededor del umbral, microfallos de apoyo, salto real inmediato y caída sostenida. Respaldo antes-locomocion en resources/app/respaldos. No es IK ni una eliminación del movimiento natural de la zancada.
Validación de esta corrección: --thirdperson-qa aprobado, 421 comprobaciones (28 de humanoides + 15 KayKit), 390 poses, 648 configuraciones de cámara. Cero fallos de renderer registrados y muestra del mundo a 60 FPS. Log: Juego/locomotion-fix.out.log.
