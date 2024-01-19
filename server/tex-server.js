/** TeX Server.
  * This service performs compilation and interpolation of raw LaTeX into SVGs
  * which are then delivered to the requesting client. The purpose of this
  * is to be able to render more advanced LaTeX directives on a web page. */

// TODO: Write in Go (or something) containerize, all that jazz as a separate
// project. Also support websockets.

// NOTE: The available tooling for this is decidedly dated. Sometime in the
// future when I actually become proficient at programming, I should consider
// writing a suite of tools that enables streaming rather than excessive file
// I/O.

import { createServer, STATUS_CODES } from 'http';

import { spawn } from 'child_process';

import { createReadStream } from 'fs';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '8080';

const cacheTTL = 3600 * 24;

const server = createServer({
  keepAlive: true
});

// TODO: Clean this mess up.
server.on('request', (req, res) => {
  res.setHeader('Accept', 'text/plain');

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': ['OPTIONS', 'POST'],
      'Access-Control-Allow-Headers': [
        'Accept',
        'Accept-Language',
        'Content-Type'
      ],
      'Access-Control-Max-Age': cacheTTL
    });

    return res.end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Max-Age', cacheTTL);

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');

    return res.end(`${STATUS_CODES[405]}\n`);
  }

  // Remove the leading slash from the url.
  const latex = decodeURIComponent(req.url).slice(1);

  const tex = spawn('pdflatex');

  // SUPER SECURE
  tex.stdin.write(`${latex}`);
  tex.stdin.end();

  tex.stdout.on('data', (err) => {
    const e = err.toString();

    if (e.includes('!') || e.includes('Emergency')) {
      console.error(e);
    }
  });

  // Check for successful TeX output, otherwise return an error to the client
  // and some placeholder HTML indicating an error.
  tex.on('exit', (code, signal) => {

    if (code) {
      console.error(`TeX exited with code: ${code} and signal: ${signal}`);

      res.statusCode = 500;
      return res.end(`${STATUS_CODES[500]}\n`);
    }

    const convert = spawn('pdf2svg', ['texput.pdf', 'output.svg']);

    convert.stderr.on('data', (err) => {
      console.error('pdf2svg Error:', err.toString());
    });

    convert.on('exit', (code, signal) => {
      if (code) {
        console.error(`pdf2svg exited with code: ${code} and signal: ${signal}`);

        res.statusCode = 500;
        return res.end(`${STATUS_CODES[500]}\n`);
      }

      // TODO: Elegant way to handle errors.
      const svgStream = createReadStream(`output.svg`);

      res.writeHead(200, { 'content-type': 'image/svg+xml' });

      svgStream.pipe(res);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Listening on: ${HOST}:${PORT}`);
});
