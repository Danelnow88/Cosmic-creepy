// ===== UTILIDADES PURAS (sin estado) =====
// Funciones de uso general expuestas en window.NV.
(() => {
  'use strict';
  const NV = window.NV;

  // Formatea el puntaje: entero con separador de miles y abreviación en números grandes
  // (ej. 12,3K / 1,2M) para que nunca desborde su contenedor.
  NV.formatPoints = function (n) {
    const v = Math.round(n);
    const abs = Math.abs(v);
    if (abs >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (abs >= 100000) return Math.round(v / 1000) + 'K';
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Arma siguiente/anterior en una lista circular (por referencia). Si el arma actual
  // no está en la lista, entra por los extremos. dir: +1 rueda arriba, -1 abajo.
  NV.cycleWeapon = function (current, list, dir) {
    if (!list || list.length === 0) return current;
    let i = list.indexOf(current);
    if (i === -1) return list[dir > 0 ? 0 : list.length - 1];
    i = (i + (dir > 0 ? 1 : -1) + list.length) % list.length;
    return list[i];
  };

  // Agrupa consumibles por tipo preservando el orden de primera aparición.
  // Devuelve [{ type, name, count }] para el HUD de slots.
  NV.groupConsumables = function (items) {
    const groups = [], byType = {};
    for (const it of items || []) {
      let g = byType[it.type];
      if (!g) { g = { type: it.type, name: it.name, count: 0 }; byType[it.type] = g; groups.push(g); }
      g.count++;
    }
    return groups;
  };

  // Índice circular seguro (para ciclar la selección de consumibles con teclas).
  NV.cycleIndex = function (i, len, dir) {
    if (!len || len <= 0) return 0;
    return ((i + (dir > 0 ? 1 : -1)) % len + len) % len;
  };

  // Quita el ÚLTIMO ítem del tipo dado y lo devuelve (null si no hay). No muta si falta.
  // Por qué el último y no el primero: groupConsumables fija el slot de cada tipo por su
  // PRIMERA aparición en el array. Al consumir desde el final, el índice de primera
  // aparición de todos los tipos queda intacto mientras queden unidades del tipo
  // consumido, así que usar un consumible nunca reordena los slots del HUD. Cuando cae la
  // última unidad, el tipo desaparece y los demás se reconcilian (comportamiento esperado).
  // Las instancias de un mismo tipo son intercambiables: sólo llevan { type, name } y el
  // efecto se resuelve por type, sin estado por instancia.
  NV.consumeByType = function (items, type) {
    const list = items || [];
    // Loop inverso explícito (sin findLastIndex) para compatibilidad de runtime.
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i].type === type) return list.splice(i, 1)[0];
    }
    return null;
  };

  NV.consumableCountByType = function (items, type) {
    return (items || []).filter((it) => it && it.type === type).length;
  };

  NV.consumableTypeCount = function (items) {
    return NV.groupConsumables(items).length;
  };

  NV.canAddConsumable = function (items, type, stackCap, typeCap) {
    const maxStack = stackCap === undefined ? NV.CONSUMABLE_STACK_CAP : stackCap;
    const maxTypes = typeCap === undefined ? NV.CONSUMABLE_TYPE_SLOT_CAP : typeCap;
    const currentOfType = NV.consumableCountByType(items, type);
    if (currentOfType >= maxStack) return false;
    if (currentOfType === 0 && NV.consumableTypeCount(items) >= maxTypes) return false;
    return true;
  };

  NV.addConsumable = function (items, item, stackCap, typeCap) {
    if (!items || !item || !item.type || !NV.canAddConsumable(items, item.type, stackCap, typeCap)) return false;
    items.push(item);
    return true;
  };

})();
