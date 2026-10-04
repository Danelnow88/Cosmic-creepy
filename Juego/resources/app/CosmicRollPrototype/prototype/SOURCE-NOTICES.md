# Avisos de distribución — NEON VOID alpha

El juego usa gráficos Canvas2D y audio sintetizado por código. El inventario de
la entrega no incluye imágenes ni canciones obtenidas de otras franquicias.
No se concede aquí una licencia pública sobre el código o la marca del juego.
El titular deberá decidir la licencia comercial y comprobar nombre/marca antes
de publicar. Este archivo no sustituye una revisión de derechos.

## Runtime Windows

La versión Windows incluye Electron 44.5.0 (MIT), Chromium y componentes del
runtime. Se conservan `LICENSE` y `LICENSES.chromium.html` proporcionados en el
paquete binario oficial. Deben acompañar toda redistribución del ejecutable.

Electron: https://github.com/electron/electron
Documentación: https://www.electronjs.org/docs/latest/tutorial/distribution-overview

## Versión web

No necesita bibliotecas remotas en producción. El código fuente conserva un
overlay experimental de Three.js 0.160.0, desactivado por defecto, que no se
inicializa en los paquetes de entrega. Three.js: MIT, https://github.com/mrdoob/three.js

## Publicación

No se integró Steamworks ni se subió una build a una cuenta externa. La página de
tienda y la build requieren el proceso de revisión de Valve:
https://partner.steamgames.com/doc/store/Review_Process
