/**
 * A library to create promises and store the resolve/reject callbacks, so that they can later be called.
 * This allows us to use promises for interprocess communication.
 * TODO: This library can be optimized by removing promises once they are resolved/rejected.
 */
export default function PromiseStorage() {
  const storage = {};
  return {
    create: name => new Promise((resolve, reject) => { storage[name] = { resolve, reject }; }),
    resolve: (name, ...args) => storage[name].resolve(...args),
    reject: (name, ...args) => storage[name].reject(...args),
  };
}
