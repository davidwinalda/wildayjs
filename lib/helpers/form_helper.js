// Escape text before putting it in HTML, so a value like `"><script>`
// shows as text instead of becoming part of the page.
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const confirmAttr = (message) =>
  message ? ` onclick="return confirm(${escapeHtml(JSON.stringify(message))})"` : "";

const formHelper = {
  linkTo: function (text, path, options = {}) {
    const classes = escapeHtml(options.class || "");
    if (options.method && options.method !== "get") {
      return `<form action="${escapeHtml(path)}" method="post" class="inline"><input type="hidden" name="_method" value="${escapeHtml(
        options.method
      )}"><button type="submit" class="${classes}"${confirmAttr(
        options.confirm
      )}>${escapeHtml(text)}</button></form>`;
    }
    return `<a href="${escapeHtml(path)}" class="${classes}">${escapeHtml(text)}</a>`;
  },

  buttonTo: function (text, path, options = {}) {
    const method = options.method || "post";
    const classes = escapeHtml(options.class || "");
    return `<form action="${escapeHtml(path)}" method="post" class="inline">${
      method !== "post"
        ? `<input type="hidden" name="_method" value="${escapeHtml(method)}">`
        : ""
    }<button type="submit" class="${classes}"${confirmAttr(
      options.confirm
    )}>${escapeHtml(text)}</button></form>`;
  },

  formFor: function (model, options = {}) {
    const modelName = model.constructor.name.toLowerCase();
    const id = model.id;
    const method = options.method || (id ? "put" : "post");
    const path = options.path || `/${modelName}s${id ? `/${id}` : ""}`;

    return {
      html: `<form action="${escapeHtml(path)}" method="post" class="${escapeHtml(
        options.class || ""
      )}">${
        method !== "post"
          ? `<input type="hidden" name="_method" value="${escapeHtml(method)}">`
          : ""
      }`,
      end: () => `</form>`,
      input: (field, options = {}) => {
        const type = options.type || "text";
        const value = model[field] || "";
        const label =
          options.label || field.charAt(0).toUpperCase() + field.slice(1);
        const id = escapeHtml(`${modelName}_${field}`);
        return `<div class="field"><label for="${id}">${escapeHtml(label)}</label><input type="${escapeHtml(type)}" id="${id}" name="${escapeHtml(`${modelName}[${field}]`)}" value="${escapeHtml(value)}"></div>`;
      },
      submit: (value = "Submit", options = {}) => {
        const classes = escapeHtml(options.class || "button");
        return `<input type="submit" value="${escapeHtml(value)}" class="${classes}">`;
      },
    };
  },

  flashMessage: function (message, type = "success") {
    if (message) {
      return `<div class="alert ${escapeHtml(type)}">${escapeHtml(message)}</div>`;
    }
    return "";
  },
};

module.exports = formHelper;
