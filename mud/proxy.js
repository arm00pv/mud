const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = 8000;

// Proxy API requests to the backend server
app.use('/api', createProxyMiddleware({ target: 'http://localhost:3000', changeOrigin: true }));

// Serve static files from the current directory
app.use(express.static('.'));

app.listen(port, () => {
  console.log(`Frontend server with proxy running at http://localhost:${port}`);
});
