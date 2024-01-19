/** TeX Server.
  * This service performs compilation and interpolation of raw LaTeX into SVGs
  * which are then delivered to the requesting client. The purpose of this
  * is to be able to render more advanced LaTeX directives on a web page. */

// TODO: Write in Go (or something) containerize, all that jazz as a separate
// project. Also support websockets.

import { createServer, STATUS_CODES } from 'http';

import { spawn } from 'child_process';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '8080';

const server = createServer({
  keepAlive: true
});

server.on('request', (req, res) => {
  res.setHeader('accept', 'text/plain');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('allow', 'POST');

    return res.end(STATUS_CODES[405]);
  }

  const cat = spawn('cat');

  req.pipe(cat.stdin);

  cat.stdout.on('data', (data) => {
    console.log(`CAT DATA: ${data}`);
  });

  cat.stderr.on('data', (err) => {
    console.error(err);
  });

  res.writeHead(200, { 'content-type': 'image/svg+xml' });

  res.end('<svg></svg>');
});

server.listen(PORT, HOST, () => {
  console.log(`Listening on: ${HOST}:${PORT}`);
});
