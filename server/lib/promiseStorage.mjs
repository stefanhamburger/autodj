export default function PromiseStorage() {
  const promiseStorage = {};
  return {
    create: name => new Promise((resolve, reject) => { promiseStorage[name] = { resolve, reject }; }),
    resolve: (name, ...args) => promiseStorage[name].resolve(...args),
    reject: (name, ...args) => promiseStorage[name].reject(...args),
  };
}
