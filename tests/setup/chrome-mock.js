/**
 * chrome.storage.local 模擬實作
 */
function createChromeMock() {
  const store = {};

  const chrome = {
    storage: {
      local: {
        get(defaults, callback) {
          const result = {};
          if (typeof defaults === 'object' && defaults !== null) {
            for (const key of Object.keys(defaults)) {
              result[key] = key in store ? JSON.parse(JSON.stringify(store[key])) : defaults[key];
            }
          } else if (typeof defaults === 'string') {
            result[defaults] = store[defaults];
          } else if (Array.isArray(defaults)) {
            for (const key of defaults) {
              result[key] = store[key];
            }
          }
          if (callback) callback(result);
          return Promise.resolve(result);
        },
        set(data, callback) {
          for (const [key, value] of Object.entries(data)) {
            store[key] = JSON.parse(JSON.stringify(value));
          }
          if (callback) callback();
          return Promise.resolve();
        },
        remove(keys, callback) {
          const keyArr = Array.isArray(keys) ? keys : [keys];
          for (const key of keyArr) {
            delete store[key];
          }
          if (callback) callback();
          return Promise.resolve();
        },
        clear(callback) {
          for (const key of Object.keys(store)) {
            delete store[key];
          }
          if (callback) callback();
          return Promise.resolve();
        },
      },
    },
    runtime: {
      lastError: null,
    },
  };

  return { chrome, store };
}

module.exports = { createChromeMock };
