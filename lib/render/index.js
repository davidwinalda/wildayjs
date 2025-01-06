const ErrorRenderer = require("./errorRenderer");
const ViewRenderer = require("./viewRenderer");

const render = (
  res,
  viewPath,
  data = {},
  status = 200,
  defaultTemplate = null
) => {
  // Add default app name if title is not provided
  const defaultData = {
    title: "My App",
    ...data,
  };

  // For error templates, use direct path
  if (viewPath.startsWith("errors/")) {
    return ErrorRenderer.render(
      res,
      viewPath,
      defaultData,
      status,
      defaultTemplate
    );
  }

  // Regular views with layout
  return ViewRenderer.render(
    res,
    viewPath,
    defaultData,
    status,
    defaultTemplate
  );
};

module.exports = render;
