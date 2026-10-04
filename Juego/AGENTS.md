Base vigente: tercera persona, expedición/turnos/online y Umbral II 0.14.0. Singularidad
0.15.0: leer README.md y `qa-perf/report.json`. Leé primero AGENTS.md,
README.md, qa-world/report.json y qa-audio/report.json. NEON VOID en C:/Users/party/Desktop/JuegoDemo es referencia
de conceptos, jamás un destino de edición de este experimento. La simulación
3D tiene autonomía autorizada: copiar estrictamente el gameplay 2D ya no aplica.

## Singularidad 0.15.0

`singularity.js` conserva su contrato público: `kind:'black-hole'`, `radius:21`,
`update(time,intensity)` y el object'snapshot con `duration:3.05`. El lenteo
gravitacional vive DENTRO del único pase de `terror-visual.js` (uniformes
`lens*`, función `setLens`); no crear un segundo pase, ni EffectComposer, ni
render target propio. La lente se apaga sola si el agujero está lejos o
detrás de cámara. El disco es aditivo a propósito y no lee profundidad.
El tránsito se mide dentro de la ventana de 2,35 s: medir más allá del
commit carga la construcción de la dimensión de destino y da un falso
diagnóstico. QA: `--singularity-qa` (21 checks). Rendimiento: `--perf-qa`
con `CR3D.test.frame()`/`gl()`; separar CPU de GPU antes de optimizar.
Pendiente medido para 165 FPS: culling de vegetación instanciada, escrituras
DOM de `present()` y el resto de clones del hot path.