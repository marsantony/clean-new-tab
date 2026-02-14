// jsdom 環境不暴露 structuredClone，但 fake-indexeddb v6 需要它
// Node 20+ 原生有 structuredClone，直接從 global 取得並注入
if (typeof globalThis.structuredClone === 'undefined') {
  // Fallback: 處理 Blob/File 的深拷貝
  globalThis.structuredClone = function structuredClone(obj) {
    return deepClone(obj);
  };
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Blob || obj instanceof File) return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (obj instanceof Set) return new Set([...obj].map(deepClone));
  if (obj instanceof Map) return new Map([...obj].entries().map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = Object.create(Object.getPrototypeOf(obj));
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key]);
  }
  return clone;
}
