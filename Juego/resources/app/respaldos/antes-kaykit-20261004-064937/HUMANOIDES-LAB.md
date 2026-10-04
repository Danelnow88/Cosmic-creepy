# Prueba de humanoides para Electron / navegador

Proyecto aislado; no modifica COSMIC ROLL 3D original. Abrir Juego/COSMIC ROLL 3D.exe o ABRIR HUMANOIDES.cmd. Usa guardados CosmicRollHumanoidesLab, separados del original.

Warrior extraído con textura y ocho clips: assets/warrior. Datos de malla, rig y clips convertidos offline: prototype/warrior-web.js. Runtime usa exclusivamente el Three r160 local; conversión con FBXLoader r184 por correcciones de bind matrices. No requiere Unity ni descargas en partida.

Cambios: humanoid.js presentación compartida/skinning; thirdperson.js enganche de player/enemigos/jefe; turn-view.js jugadores en espera y liberación de esqueletos; singularity.js proxy del cuerpo completo; HTML carga local; main.cjs identidad y guardados aislados. character-style.js preservado byte por byte: esfera y cara reales reparentadas a una cabeza que sigue el hueso, escala .42. Cabeza original del FBX eliminada por pesos (408 triángulos); espada importada retirada (52 triángulos adicionales). Colliders, reglas, cámara y red no se modifican. Desvanecimiento visual del protagonista si la cámara queda muy cerca del cuerpo.

Rig original 37 huesos, 28 afectan a la malla. Se reutilizan idle, mv_tar21, atk01 y hurt. Los otros cuatro clips están incluidos sin asignarles estados no confirmados. No hay clips explícitos de salto/muerte; salto/dash mantienen la física y una pose animada de reposo/movimiento; muerte conserva la eliminación existente. Sin IK de terreno por pie ni animaciones shooter nuevas: siguen siendo mejoras pendientes. Geometría/texturas compartidas, huesos/mixer por actor, sin cargas en partida.

Procedencia y licencia específica no confirmada registradas en THIRD-PARTY-HUMANOIDES.md. Se extrajo por instrucción explícita del usuario tras la inspección. No atribuir licencia MIT a estos assets.


Actualización de estabilidad: leer DEBUG-HUMANOIDES.md. El HUD muestra HUMANOIDES · DEBUG 1. Regresión empaquetada: 402 comprobaciones aprobadas (378 previas + 24 nuevas), 648 configuraciones de cámara; revalidación de locomoción: 24/24. Sin garantía de ausencia absoluta de bugs.
