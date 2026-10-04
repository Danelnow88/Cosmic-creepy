# COSMIC ROLL 3D — integración humanoide pendiente de procedencia

No se modificó el juego instalado ni JuegoDemo. No se hizo commit/push.
No se empaquetó Warrior ni su textura/animaciones. El FBX descargado sólo para
inspección permanece fuera del Desktop y del proyecto, en el área de investigación.

## Bloqueo concreto

Warrior no tiene una licencia específica identificada en su carpeta oficial.
Fue incorporado el 2 de abril de 2026 como prueba de skinning (#33316), desde
el reporte #22167. Allí su aportante identifica su origen como Unity Asset Store,
pero no nombra el paquete, artista, editor, tipo de licencia ni permiso de redistribución.
El README de la carpeta FBX sólo identifica una licencia CC0 para nurbs.fbx.
El texto general del ejemplo acerca de Mixamo no prueba que Warrior sea de Mixamo.
MIT de three.js cubre el código; no se asumió que cubra este contenido de terceros.

Por la instrucción explícita del usuario, no se sustituye ni empaqueta el asset
hasta aclarar procedencia/licencia. Falta confirmar modelo, textura y cada uno de
los ocho clips. Alternativa consultada: cuerpo/rig originales con esfera facial exacta.

## Inspección binaria real

Archivo: Warrior.fbx, FBX 7300, 2052864 bytes. SHA256 en fbx-inspection.json.
Una malla: 2638 vértices de control y 2823 triángulos antes de expansión del loader.
37 huesos Biped; incluye Bip001 Head, Bip001 Neck, Pelvis, manos y pies.
La cabeza está en la misma malla: no es un objeto independiente eliminable sin
editar caras/ponderaciones. Hay skin clusters de Head y Neck para guiar el corte.
Una textura externa referenciada: 100820_kl_npc_d_512.png. No se descargó ni incluyó.
GlobalSettings indica Y arriba y UnitScaleFactor=1. Las posiciones geométricas
locales usan otra orientación; no equivalen a altura final con bind aplicado.
El ejemplo oficial aplica escala 100 al Warrior. No asumir metros por nombre.

Clips y duraciones medidas por KeyTime de sus curvas conectadas:

| Clip | Duración (s) | Estado/licencia |
|---|---:|---|
| idle | 2.0333 | No confirmada |
| hurt | 0.7000 | No confirmada |
| atk01 | 1.0667 | No confirmada |
| mv_tar21 | 0.5667 | No confirmada |
| win | 2.8667 | No confirmada |
| enter | 0.5667 | No confirmada |
| yunxuan | 1.3000 | No confirmada |
| shuimian | 1.7000 | No confirmada |

Sólo los nombres fueron interpretados. No se afirmó que mv_tar21 sea andar,
ni que los otros sean salto/muerte sin observarlos en movimiento.
No hay clips explícitamente llamados jump o death.

## Compatibilidad técnica

Juego vigente usa Three r160 global. Este asset fue añadido junto a correcciones
de FBXLoader r184 para matrices de bind, huesos inversos y orden de skinning.
El reporte original precisamente trataba deformación incorrecta del Warrior.
No cargarlo directamente con un loader r160 ni mezclar objetos Three de dos
versiones dentro de la misma escena. Si se autoriza el asset: conversión offline
con loader corregido, validación de bind y GLB sin dependencia de red en partida.

## Contrato de implementación preparado

1. Copia aislada del juego vigente, saves/userData independientes, manifiesto SHA256.
2. Mantener fuentes de character-style.js sin cambios: no redibujar el canvas,
   máscara/material ni colores. Reutilizar esfera/máscara existentes reducidas.
3. Borrar solamente triángulos de la cabeza original, preservar cuello y rig;
   unir esfera a Head mediante grupo de corrección de escala/pivote/orientación.
4. Visual en grupo separado del collider actual, pies en root.y-radius físico.
   Yaw visual propio; collider/hitbox, cámara, redes, daño y turnos sin cambios.
5. Clonar esqueleto por actor, compartir geometría/texturas, pocos materiales
   por equipo; LOD de piel/animación para NPC distantes, pools sin recargas.
6. Escoger clips tras observarlos; movimiento sin root motion, ritmo según
   velocidad real; no inventar disponibilidad de salto o muerte. Conservar cara
   legible durante dash y tránsito y los colores durante cambio de turno.
7. Muestra jugador+enemigo, poses principales, captura cara antes/después,
   suelo y salto, baseline FPS/triángulos/drawcalls. Luego equipos/jefe/red.
8. Pruebas physics/collision/turns y suites completas del proyecto, QA visual,
   app offline empaquetada y comparación con baseline. Sin commit/push.

## Fuentes primarias

- Ejemplo: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_loader_fbx.html
- Incorporación y skinning: https://github.com/mrdoob/three.js/pull/33316
- Procedencia identificada por aportante: https://github.com/mrdoob/three.js/issues/22167
- Licencias específicas documentadas: https://github.com/mrdoob/three.js/blob/dev/examples/models/fbx/README.md
- FAQ Mixamo (no atribuible automáticamente a Warrior): https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

Autor/editor y permisos del Warrior: no confirmados. Aportante/maintainer del
reporte no se presenta como artista ni titular de derechos. No se creó un aviso
que atribuya licencia o autor falsamente.

## Estado posterior
El usuario solicitó continuar con la extracción para su prueba local. Juego integrado en la subcarpeta Juego; fuente y licencia específica sin confirmar registradas sin atribuir MIT al asset. El bloqueo inicial ya no describe el estado de esta entrega.
