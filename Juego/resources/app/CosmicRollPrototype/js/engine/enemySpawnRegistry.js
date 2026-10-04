// ===== ENGINE: catálogo productivo de enemigos =====
// Deriva siempre desde los registros canónicos. No almacena stats ni IDs paralelos.
(() => {
  'use strict';
  const NV = window.NV;

  NV.productionEnemyCanonicalId = function (type, spawnKind) {
    if (!type) return null;
    return spawnKind === 'elite' ? (type.id || type.visualId || null) : (type.id || null);
  };

  NV.isProductionSpawnableEnemyType = function (type, spawnKind) {
    return !!(type && NV.productionEnemyCanonicalId(type, spawnKind));
  };

  NV.getProductionEnemyDefinitions = function () {
    const result = [];
    const append = (types, spawnKind) => {
      for (const definition of types || []) {
        if (!NV.isProductionSpawnableEnemyType(definition, spawnKind)) continue;
        const id = NV.productionEnemyCanonicalId(definition, spawnKind);
        result.push({
          id,
          name: definition.name || id,
          spawnKind,
          hostileClass: definition.hostileClass || (spawnKind === 'elite' ? 'heavy' : 'light'),
          spectral: spawnKind === 'elite'
            ? !!(definition.spectralElite || (definition.id && definition.id.indexOf('specter_') === 0))
            : !!(definition.id && definition.id.indexOf('specter_') === 0),
          definition,
        });
      }
    };
    append(NV.ENEMY_TYPES, 'normal');
    append(NV.ELITE_TYPES, 'elite');
    return result;
  };

  NV.getProductionEnemyDefinition = function (enemyId) {
    const matches = NV.getProductionEnemyDefinitions().filter((entry) => entry.id === enemyId);
    if (matches.length !== 1) return null;
    return matches[0];
  };
})();