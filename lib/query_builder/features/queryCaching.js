// const cache = new Map();

// module.exports = (QueryBuilder) => {
//   QueryBuilder.prototype.cache = function (key, ttl = 60) {
//     if (cache.has(key)) {
//       return Promise.resolve(cache.get(key));
//     }
//     return this.then((result) => {
//       cache.set(key, result);
//       setTimeout(() => cache.delete(key), ttl * 1000);
//       return result;
//     });
//   };
// };

// query-caching.js
const cache = new Map();

module.exports = (QueryBuilder) => {
  /**
   * Cache the results of the query.
   * @param {string} key - The cache key.
   * @param {number} ttl - Time-to-live in seconds (default: 60).
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.cache = function (key, ttl = 60) {
    if (cache.has(key)) {
      console.log("Cache hit! Returning cached result for key:", key);
      return Promise.resolve(cache.get(key));
    }

    console.log("Cache miss! Executing query and caching result for key:", key);

    return this.then((result) => {
      cache.set(key, result);
      setTimeout(() => {
        console.log("Cache expired for key:", key);
        cache.delete(key);
      }, ttl * 1000);
      return result;
    });
  };
};
