# COSMIC ROLL 3D — plan técnico de terror de supervivencia 0.8.0

La referencia de *Wick* se usa como dirección de tensión: oscuridad, recurso de
luz agotable, escucha defensiva y vulnerabilidad. El código, sonido procedural,
shaders y lenguaje visual son propios de COSMIC ROLL.

## 1. Pilar visual y gráfico

### Implementación activa

`prototype/terror-visual.js` inserta un único render target a 72 % de resolución
y un pase fullscreen. El shader reúne en una pasada:

- viñeta radial centrada en la proyección del jugador;
- halo variable por llama, con negro mínimo de 0.055 fuera de la luz;
- aberración RGB entre 0.045 % y 0.5 % según miedo;
- grano a 18 Hz, sin lecturas de `ImageData` ni asignaciones por píxel en CPU;
- desplazamiento horizontal esporádico y deformación UV sólo con miedo alto.

La vela usa un `PointLight` cálido con intensidad 110, alcance 560 unidades
(56 m del mundo) y caída cuadrática. No proyecta sombras: el sol direccional
conserva el único mapa de sombras de 2048². Si se necesitara una sombra móvil,
el siguiente paso sería una sola `SpotLight` de 512², actualizada a 15 Hz y sólo
para objetos dentro de 25 m; seis luces puntuales con cubemaps multiplicarían el
coste de sombras por seis caras y no son apropiadas para esta escena web.

La niebla existente sigue siendo `FogExp2` y cambia por región. El postprocesado
oculta la distancia sin reducir el rango físico o borrar objetivos. Recomendación:
densidad entre 0.00085 y 0.00135, far plane de 9000 y LOD/instancias para árboles.
La oscuridad visual no debe ocultar retículas, avisos de ataque ni interfaz.

### API

```js
const post = CRTerrorVisual({ THREE, renderer, scene, camera, scale: 0.72 });

function frame(dt) {
  post.render(dt, {
    fear: fearState.fear,
    darkness: fearState.darkness,
    flicker: fearState.flicker,
    lightCenter: { x: projectedX01, y: projectedY01 }
  });
  requestAnimationFrame(frame);
}
```

Presupuesto recomendado: 0.7–1.4 ms de GPU para el pase a 1080p; bajar `scale`
a 0.6 en GPU integrada. No usar desenfoque multipaso durante combate.

## 2. Pilar de audio y música

### Implementación activa

`prototype/terror-audio.js` reutiliza el `AudioContext` y el bus ambiental de
`sound.js`; nunca crea un contexto paralelo. Dos loops de ruido marrón alimentan:

- viento: `BiquadFilter` low-pass de 220–1120 Hz, nivel aproximado -35 a -23 dB;
- metal/tensión: band-pass Q 8, 240–430 Hz, hasta -31 dB con miedo alto.

Susurros y stingers usan `PannerNode` HRTF, distancia inversa, `refDistance=40`,
`maxDistance=1400` y envolventes con entrada/salida suave. Hay como máximo ocho
voces de terror adicionales. Un compresor local (threshold -20 dB, ratio 3:1)
evita picos antes de entrar al bus ambiental; el limitador maestro existente
sigue siendo la última defensa. Pausa y silencio actúan sobre toda la ruta.

```js
const terrorAudio = CRTerrorAudio({ sound: existingCRSound });
await terrorAudio.start(); // llamar desde una interacción del usuario

terrorAudio.update(time, {
  dt, fear, darkness, shelter, paused,
  player: player.position
});

terrorAudio.whisper({ x, y, z }, { level: 0.025, duration: 1.4 });
```

Para música futura: tres stems originales (drone -30 LUFS, pulso industrial
-34 LUFS y armónicos -36 LUFS), crossfade de 2–4 s, sin melodía continua. Los
stingers deben conservar 6 dB de margen y un cooldown mínimo de 12 s. Los avisos
de combate tienen prioridad y el director ambiental se silencia bajo amenaza.

## 3. Pilar de mecánicas core

### Implementación activa

`prototype/survival.js` es una simulación pura, determinista y sin dependencias:

- vela inicial de 240 s, consumo continuo y 16 % extra con exposición máxima;
- tres cerillas; cada una proporciona 22 s de luz si la vela quedó agotada;
- ráfagas deterministas con posibilidad limitada de apagar la llama;
- miedo oculto calculado por oscuridad, enemigo cercano y salud;
- cuatro estados: `calm`, `uneasy`, `disturbed`, `panic`;
- penalización máxima de movimiento de 12 % y agresividad enemiga máxima +22 %.

```js
const survival = CRCandleFear({ fuelSeconds: 240, matches: 3 });

function fixedUpdate(dt) {
  const state = survival.update(dt, {
    time,
    health,
    ambientDarkness: 0.82,
    windExposure,
    enemyPressure
  });
  playerSpeed = baseSpeed * state.movementMultiplier;
  enemySpeed = baseEnemySpeed * state.aggressionMultiplier;
  for (const event of survival.drainEvents()) terrorAudio.react(event, player.position);
}

window.addEventListener('keydown', event => {
  if (event.code === 'KeyQ') survival.useMatch();
});
```

La física autoritativa sigue a 120 Hz. El postprocesado corre una vez por frame;
la acústica espacial pesada continúa a 10 Hz en el mezclador principal. El miedo
no modifica puntería, colisiones ni daño: altera lectura, velocidad y presión sin
quitar control al jugador. Los valores deben probarse primero en sesiones de
10–15 minutos antes de reducir combustible o aumentar agresividad.

## Enganche en otro proyecto web

Orden de scripts para una integración clásica sin bundler:

```html
<script src="sound.js"></script>
<script src="survival.js"></script>
<script src="terror-audio.js"></script>
<script src="terror-visual.js"></script>
<script src="game.js"></script>
```

Los módulos exponen `CRCandleFear`, `CRTerrorAudio` y `CRTerrorVisual`. Para ESM,
se puede reemplazar la asignación a `window` por `export function` sin cambiar
la lógica interna. `dispose()` debe ejecutarse al desmontar la escena; `reset()`
al iniciar una expedición. La prueba `desktop/verify-terror.cjs` comprueba consumo,
cerillas, miedo, límites acústicos, shader, reinicio y ausencia de errores.
