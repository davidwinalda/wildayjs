const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__paginationExtended) return;
  QueryBuilder.prototype.__paginationExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    /**
     * Limit the number of results returned by the query.
     * @param {number} limit - The maximum number of results to return.
     * @returns {QueryBuilder}
     */
    limit(limit) {
      prototype.limit.call(this, limit);
      return this;
    },

    /**
     * Skip a specified number of results.
     * @param {number} offset - The number of results to skip.
     * @returns {QueryBuilder}
     */
    offset(offset) {
      prototype.offset.call(this, offset);
      return this;
    },

    /**
     * Alias for `offset`.
     * @param {number} offset - The number of results to skip.
     * @returns {QueryBuilder}
     */
    skip(offset) {
      this.offset(offset);
      return this;
    },

    /**
     * Paginate the results using page-based pagination.
     * @param {number} page - The page number to retrieve.
     * @param {number} pageSize - The number of results per page.
     * @returns {QueryBuilder}
     */
    paginate(page = 1, pageSize = 10) {
      const offset = (page - 1) * pageSize;
      this.limit(pageSize).offset(offset);
      return this;
    },

    /**
     * Get the total count of results matching the query.
     * @returns {Promise<number>}
     */
    async getCount() {
      const result = await this.clone()
        .clear("order")
        .count("* as total")
        .first();
      return parseInt(result.total, 10);
    },

    /**
     * Get paginated results along with pagination metadata.
     * @param {number} page - The page number to retrieve.
     * @param {number} pageSize - The number of results per page.
     * @returns {Promise<{data: array, pagination: object}>}
     */
    async paginateWithMetadata(page = 1, pageSize = 10) {
      const total = await this.getCount();
      const data = await this.paginate(page, pageSize);

      return {
        data,
        pagination: {
          total,
          page,
          pageSize,
          lastPage: Math.ceil(total / pageSize),
        },
      };
    },

    /**
     * Alias for `paginateWithMetadata`.
     * @param {number} page - The page number to retrieve.
     * @param {number} pageSize - The number of results per page.
     * @returns {Promise<{data: array, pagination: object}>}
     */
    async paginateWithInfo(page = 1, pageSize = 10) {
      return this.paginateWithMetadata(page, pageSize);
    },

    /**
     * Paginate using cursor-based pagination.
     * @param {string} cursorColumn - The column to use as the cursor (e.g., "id").
     * @param {string} direction - The direction of pagination ("next" or "prev").
     * @param {string|number} cursor - The cursor value.
     * @param {number} limit - The number of results to return.
     * @returns {QueryBuilder}
     */
    paginateCursor(
      cursorColumn = "id",
      direction = "next",
      cursor = null,
      limit = 10
    ) {
      if (cursor) {
        if (direction === "next") {
          this.where(cursorColumn, ">", cursor);
        } else if (direction === "prev") {
          this.where(cursorColumn, "<", cursor);
        }
      }
      this.limit(limit).orderBy(
        cursorColumn,
        direction === "next" ? "asc" : "desc"
      );
      return this;
    },

    /**
     * Get cursor-based paginated results along with pagination metadata.
     * @param {string} cursorColumn - The column to use as the cursor (e.g., "id").
     * @param {string} direction - The direction of pagination ("next" or "prev").
     * @param {string|number} cursor - The cursor value.
     * @param {number} limit - The number of results to return.
     * @returns {Promise<{data: array, pagination: object}>}
     */
    async paginateCursorWithMetadata(
      cursorColumn = "id",
      direction = "next",
      cursor = null,
      limit = 10
    ) {
      const query = this.paginateCursor(cursorColumn, direction, cursor, limit);
      const data = await query;

      let nextCursor = null;
      let prevCursor = null;

      if (data.length > 0) {
        if (direction === "next") {
          nextCursor = data[data.length - 1][cursorColumn];
          prevCursor = data[0][cursorColumn];
        } else if (direction === "prev") {
          nextCursor = data[0][cursorColumn];
          prevCursor = data[data.length - 1][cursorColumn];
        }
      }

      return {
        data,
        pagination: {
          nextCursor,
          prevCursor,
          limit,
          direction,
        },
      };
    },

    /**
     * Dynamically set the page size based on query parameters or a function.
     * @param {number|function} pageSize - The page size or a function to determine it.
     * @returns {QueryBuilder}
     */
    dynamicPageSize(pageSize) {
      if (typeof pageSize === "function") {
        this.limit(pageSize());
      } else {
        this.limit(pageSize);
      }
      return this;
    },

    /**
     * Apply custom pagination logic using a callback.
     * @param {function} callback - A callback to define custom pagination logic.
     * @returns {QueryBuilder}
     */
    customPagination(callback) {
      callback(this);
      return this;
    },

    /**
     * Paginate results using a sliding window strategy.
     * @param {string} column - The column to use for the sliding window.
     * @param {number} windowSize - The size of the sliding window.
     * @param {number} offset - The starting offset for the window.
     * @returns {QueryBuilder}
     */
    slidingWindowPagination(column, windowSize, offset = 0) {
      this.where(column, ">", offset)
        .andWhere(column, "<=", offset + windowSize)
        .orderBy(column, "asc");
      return this;
    },

    /**
     * Paginate results using a time-based strategy.
     * @param {string} timeColumn - The column to use for time-based pagination.
     * @param {string} startTime - The start time for the query.
     * @param {string} endTime - The end time for the query.
     * @param {number} limit - The number of results to return.
     * @returns {QueryBuilder}
     */
    timeBasedPagination(timeColumn, startTime, endTime, limit = 10) {
      const dbType = this.getDatabaseType();

      // Handle time-based pagination for different databases
      if (dbType === "postgresql") {
        this.whereRaw(
          `??::timestamp >= ?::timestamp AND ??::timestamp <= ?::timestamp`,
          [timeColumn, startTime, timeColumn, endTime]
        );
      } else if (dbType === "mysql") {
        this.whereRaw(`?? >= ? AND ?? <= ?`, [
          timeColumn,
          startTime,
          timeColumn,
          endTime,
        ]);
      } else {
        // SQLite
        this.whereRaw(
          `datetime(??) >= datetime(?) AND datetime(??) <= datetime(?)`,
          [timeColumn, startTime, timeColumn, endTime]
        );
      }

      this.orderBy(timeColumn, "asc").limit(limit);
      return this;
    },

    /**
     * Paginate results using a random sampling strategy.
     * @param {number} limit - The number of results to return.
     * @returns {QueryBuilder}
     */
    randomPagination(limit = 10) {
      const dbType = this.getDatabaseType();

      // Handle random sampling for different databases
      if (dbType === "postgresql") {
        this.orderByRaw("RANDOM()");
      } else if (dbType === "mysql") {
        this.orderByRaw("RAND()");
      } else {
        // SQLite
        this.orderByRaw("RANDOM()");
      }

      this.limit(limit);
      return this;
    },
  });
};
