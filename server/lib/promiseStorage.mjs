/**
 * A library to create promises and store the resolve/reject callbacks, so that they can later be called.
 * This allows us to use promises for interprocess communication.
 */
export default function PromiseStorage() {
  const storage = {};
  return {
    create: name => new Promise((resolve, reject) => { storage[name] = { resolve, reject }; }),
    resolve: (name, ...args) => {
      if (!storage[name]) return undefined;
      const out = storage[name].resolve(...args);
      delete storage[name];
      return out;
    },
    reject: (name, ...args) => {
      if (!storage[name]) return undefined;
      const out = storage[name].reject(...args);
      delete storage[name];
      return out;
    },
  };
}
