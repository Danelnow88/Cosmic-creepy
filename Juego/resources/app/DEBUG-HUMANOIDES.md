# Debugging de Humanoides

Causa reproducida: `present()` escribía `t.children[1].rotation.z`, suponiendo que seguía siendo el anillo. Tras la integración era el modelo completo. Se giraba continuamente, inclinando al personaje y metiéndolo bajo el suelo. Ahora se usa `d.ring` y el contenedor corporal siempre conserva verticalidad.

Apoyo: se mide la posición deformada de los vértices de las botas, deduplicados y cacheados por geometría, para que las suelas queden 0.35 unidades sobre la base del collider. La gravedad, salto, dash y colisiones siguen en la autoridad existente. La corrección de presentación nunca mueve el actor físico. Se respetan pisos elevados al usar la base del actor, no sólo la altura del terreno.

Rendimiento: LOD de animaciones a 15/6 Hz lejos del jugador, actualización completa cerca/en ataque o daño; descarte de mallas fuera de cámara con esfera conservadora; menos recorridos de materiales y matrices. Contadores del render ahora incluyen mundo, sombras y post: antes sólo mostraban dos triángulos del pase final. El cache de transparencia respeta profundidad/transparencia originales y extremos 0/1. Se evita doble liberación de materiales de skin.

Tránsito: copia la pose y orientación actuales al entrar al agujero, y actualiza mapas de la cara; antes conservaba la pose inicial. Corona del jefe junto a la cabeza. No se modifica el aspecto de la singularidad ni la atmósfera.

QA permanente: EXE --humanoid-debug-qa; incluido en --thirdperson-qa. Comprueba suelas de malla, verticalidad durante varios segundos, geometría finita, locomoción/salto/ataque, pausa, liberación de rigs, LOD y contadores reales. Capturas/reportes en qa-humanoid-debug. El diagnóstico anterior aprobaba estados finitos sin comprobar los vértices y por eso no detectó el giro.

Límites: no es una certificación de ausencia de todos los bugs; collider arcade esférico conservado, sin IK individual de pies sobre desniveles. Tampoco se convierten automáticamente los clips de melee en animaciones específicas de shooter. No commit ni push. Proyecto original intacto.

Locomoción: el clip de movimiento nativo levantaba los brazos y retorcía el torso como una entrada/ataque con arma. Se conservan sus pistas de piernas y se combinan con las del reposo para torso, raíz y brazos. Las animaciones de ataque/daño continúan separadas. El FBX y los clips extraídos originales no se alteran.
