class PaginationExtensions {
  static extend(builder) {
    // Basic Pagination with Meta Information
    builder.paginate = async function (page = 1, per_page = 20) {
      const total = await this.clone().count("* as count").first();
      const total_count = parseInt(total.count);
      const total_pages = Math.ceil(total_count / per_page);
      const offset = (page - 1) * per_page;

      const results = await this.offset(offset).limit(per_page);

      return {
        data: results,
        meta: {
          total_count,
          total_pages,
          current_page: page,
          per_page,
          next_page: page < total_pages ? page + 1 : null,
          prev_page: page > 1 ? page - 1 : null,
          first_page: 1,
          last_page: total_pages,
          out_of_range: page > total_pages,
          count: results.length,
          from: offset + 1,
          to: offset + results.length,
        },
      };
    };

    // Cursor-based Pagination with Sorting
    builder.paginate_by_cursor = async function (options = {}) {
      const {
        cursor = null,
        limit = 20,
        cursor_column = "id",
        order = "asc",
        with_total = false,
      } = options;

      const query = this.clone();

      if (cursor) {
        query.where(cursor_column, order === "asc" ? ">" : "<", cursor);
      }

      query.orderBy(cursor_column, order);
      const results = await query.limit(limit + 1);

      const has_more = results.length > limit;
      const items = results.slice(0, limit);

      const response = {
        data: items,
        meta: {
          has_more,
          next_cursor: has_more ? items[items.length - 1][cursor_column] : null,
          prev_cursor: cursor,
          limit,
          count: items.length,
        },
      };

      if (with_total) {
        const total = await this.clone().count("* as count").first();
        response.meta.total_count = parseInt(total.count);
      }

      return response;
    };

    // Seek-based Pagination with Multiple Columns
    builder.paginate_by_seek = async function (options = {}) {
      const {
        seek_columns = ["id"],
        last_values = null,
        limit = 20,
        direction = "asc",
        with_total = false,
      } = options;

      const query = this.clone();

      if (last_values) {
        query.where(function () {
          const firstColumn = seek_columns[0];
          this.where(
            firstColumn,
            direction === "asc" ? ">" : "<",
            last_values[0]
          );

          seek_columns.slice(1).forEach((column, index) => {
            this.orWhere(function () {
              seek_columns.slice(0, index + 1).forEach((prevColumn, i) => {
                this.where(prevColumn, "=", last_values[i]);
              });
              this.where(
                column,
                direction === "asc" ? ">" : "<",
                last_values[index + 1]
              );
            });
          });
        });
      }

      seek_columns.forEach((column) => {
        query.orderBy(column, direction);
      });

      const results = await query.limit(limit + 1);
      const has_more = results.length > limit;
      const items = results.slice(0, limit);

      const response = {
        data: items,
        meta: {
          has_more,
          next_seek: has_more
            ? seek_columns.map((col) => items[items.length - 1][col])
            : null,
          prev_seek: last_values,
          limit,
          count: items.length,
        },
      };

      if (with_total) {
        const total = await this.clone().count("* as count").first();
        response.meta.total_count = parseInt(total.count);
      }

      return response;
    };

    // Simple Offset/Limit helpers
    builder.take = function (limit) {
      return this.limit(limit);
    };

    builder.skip = function (offset) {
      return this.offset(offset);
    };

    return builder;
  }

  static extendStatic(ModelClass) {
    const methods = [
      "paginate",
      "paginate_by_cursor",
      "paginate_by_seek",
      "take",
      "skip",
    ];

    methods.forEach((method) => {
      if (typeof ModelClass[method] !== "function") {
        ModelClass[method] = function (...args) {
          return this.query()[method](...args);
        };
      }
    });

    return ModelClass;
  }
}

module.exports = PaginationExtensions;
