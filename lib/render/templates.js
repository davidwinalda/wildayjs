const fallbackErrorTemplate = (data) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Error - ${data.error.status}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .error-container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-width: 600px;
          width: 90%;
          text-align: center;
        }
        .error-status { 
          color: #dc3545;
          font-size: 3rem;
          margin: 0;
        }
        .error-message {
          color: #343a40;
          margin: 1rem 0;
        }
        .error-detail {
          color: #6c757d;
          font-family: monospace;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 4px;
          white-space: pre-wrap;
          font-size: 0.9rem;
          margin-top: 1rem;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1 class="error-status">${data.error.status}</h1>
        <p class="error-message">${data.error.message}</p>
        ${
          data.error.detail
            ? `<pre class="error-detail">${data.error.detail}</pre>`
            : ""
        }
      </div>
    </body>
  </html>
`;

const fallbackServerErrorTemplate = (error) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Error - 500</title>
      <style>
        body { font-family: system-ui; padding: 2rem; text-align: center; }
        .error-status { color: #dc3545; font-size: 2rem; }
      </style>
    </head>
    <body>
      <h1 class="error-status">500</h1>
      <p>Internal Server Error</p>
      <p><small>${error.message}</small></p>
    </body>
  </html>
`;

module.exports = {
  fallbackErrorTemplate,
  fallbackServerErrorTemplate,
};
