const formHelper = {
  linkTo: function (text, path, options = {}) {
    const classes = options.class || "";
    if (options.method && options.method !== "get") {
      return `<form action="${path}" method="post" class="inline"><input type="hidden" name="_method" value="${
        options.method
      }"><button type="submit" class="${classes}"${
        options.confirm ? ` onclick="return confirm('${options.confirm}')"` : ""
      }>${text}</button></form>`;
    }
    return `<a href="${path}" class="${classes}">${text}</a>`;
  },

  buttonTo: function (text, path, options = {}) {
    const method = options.method || "post";
    const classes = options.class || "";
    return `<form action="${path}" method="post" class="inline">${
      method !== "post"
        ? `<input type="hidden" name="_method" value="${method}">`
        : ""
    }<button type="submit" class="${classes}"${
      options.confirm ? ` onclick="return confirm('${options.confirm}')"` : ""
    }>${text}</button></form>`;
  },

  formFor: function (model, options = {}) {
    const modelName = model.constructor.name.toLowerCase();
    const id = model.id;
    const method = options.method || (id ? "put" : "post");
    const path = options.path || `/${modelName}s${id ? `/${id}` : ""}`;

    return {
      html: `<form action="${path}" method="post" class="${
        options.class || ""
      }">${
        method !== "post"
          ? `<input type="hidden" name="_method" value="${method}">`
          : ""
      }`,
      end: () => `</form>`,
      input: (field, options = {}) => {
        const type = options.type || "text";
        const value = model[field] || "";
        const label =
          options.label || field.charAt(0).toUpperCase() + field.slice(1);
        return `<div class="field"><label for="${modelName}_${field}">${label}</label><input type="${type}" id="${modelName}_${field}" name="${modelName}[${field}]" value="${value}"></div>`;
      },
      submit: (value = "Submit", options = {}) => {
        const classes = options.class || "button";
        return `<input type="submit" value="${value}" class="${classes}">`;
      },
    };
  },

  flashMessage: function (message, type = "success") {
    if (message) {
      return `<div class="alert ${type}">${message}</div>`;
    }
    return "";
  },
};

module.exports = formHelper;
