# Lore estético permanente de personajes — 0.17.0

Referencias del usuario: el libro de perfiles de muñecos y la imagen de tres
caras con sonrisas artificiales, ojos inquietantes y máscaras pálidas. Son
referencias de aspecto; sus nombres/textos no reemplazan el lore ni los equipos.

## Lenguaje obligatorio

Muñecos desgastados, porcelana envejecida, tela cosida, ojos grandes hundidos,
iris azul/gris o verde desaturado, cejas asimétricas, sonrisa sostenida incómoda,
dientes irregulares, pequeñas grietas y rasgos teatrales. Originales propios;
no reutilizar literalmente nombres/personajes de las referencias.
Conservar cuerpos esféricos rodantes, escala, hitbox y lectura de clases.
Paleta de tela apagada, hueso, azul/gris, verdes y ocres; colores de equipos
siguen identificando miembros. El ambiente oscuro 0.16.1 es autoridad vigente.

## Aplicación inicial completa

- Jugador activo: cuerpo de tela con costuras y máscara curva.
- Cada miembro de cada equipo local/remoto: mismo lenguaje, variantes por índice.
- Los 34 enemigos normales y el jefe: seis máscaras con ojos hundidos,
  párpados, nariz, sonrisa, desgaste; costuras, cejas, gafas o cabello pintado.
- Tránsito por singularidad: incluye la cara y conserva colores del actor actual.
- Nombres/emojis y cosméticos futuros independientes del aspecto base.

character-style.js genera y cachea texturas una vez, crea geometría curva y
materiales rugosos. No agrega luces ni modifica post, física, balance o objetivos.
El matiz emisivo de la máscara permite leer el rostro sin iluminar el entorno.
No es un cambio a cuerpos humanos completos; evolución de las esferas existentes.

Pruebas: --characters-qa comprueba todos los actores, jefe, handoff, reconstrucción
de roster, caché y oscuridad. --thirdperson-qa incluye la regresión completa.
Referencias originales guardadas en referencias-personajes; arte procedural propio.
