# Agujero negro y luz — 0.15.1

HISTÓRICO: valores/estética rechazados y sustituidos en 0.16.1.
Leer OSCURIDAD-Y-SINGULARIDAD.md; no aplicar x3 ni conversión global de color.

Restauración del shader avanzado conservado en el respaldo anterior a 0.15.0.
La entrega previa lo había reemplazado por una versión anterior de staging.

## Dirección visual y funcionamiento

Horizonte negro de radio 21, disco hasta 72 unidades, rotación diferencial,
filamentos cálidos, asimetría de brillo y anillo de fotones. El postproceso curva
la imagen y genera arcos superior/inferior según inclinación. La profundidad
impide que el efecto atraviese paredes o cuerpos delante del agujero.
Es una interpretación artística inspirada en la referencia, sin simular
relatividad general ni copiar recursos de películas.

La transición mantiene 3.05 segundos. El cuerpo se estira, adelgaza y contrae
contra la posición real del horizonte; no lo sobrepasa. Pausa y cancelación
conservan sus reglas. Ambos umbrales usan la misma singularidad.

Luz base 30000 (antes 10000); fragmento 65000 (antes 18000).
Radio base 380 y fragmento 550, duración Q 22 segundos e inventario finito
sin cambios. Se amplía el halo de pantalla y corrige la conversión de color;
el grano se mezcla después de convertir a espacio de pantalla.

## Integración y pruebas

Un único pase final, textura de profundidad, geometría acotada y 128 trazas.
Sin nuevos mapas de sombras ni contexto de audio. Calidad/render scale existente.
Prueba especializada: ejecutar el EXE con --singularity-qa. Compara píxeles con
lente activa/inactiva, oclusión completa por pared, iluminación real, absorción,
viaje a Umbral II y errores de shader. Suite general: --thirdperson-qa.

Para probar a mano: cerrar la ventana anterior y abrir el launcher; buscar la
singularidad en expedición, rodearla, presionar E y comparar Q en un área oscura.
El portal sigue sujeto a las restricciones del modo partida existentes.
Versión visible 0.15.1; protocolo de red 0.15.0 conservado: no cambia gameplay.
