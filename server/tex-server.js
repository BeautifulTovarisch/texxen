/** TeX Server.
  * This service performs compilation and interpolation of raw LaTeX into SVGs
  * which are then delivered to the requesting client. The purpose of this
  * is to be able to render more advanced LaTeX directives on a web page. */

// TODO: Write in Go (or something) containerize, all that jazz as a separate
// project. Also support websockets.
// TODO: Proper Logging / Error handling

// NOTE: The available tooling for this is decidedly dated. Sometime in the
// future when I actually become proficient at programming, I should consider
// writing a suite of tools that enables streaming rather than excessive file
// I/O.

import { rm } from 'node:fs/promises';
import { spawn } from 'child_process';
import { createReadStream } from 'fs';

import {
  createServer,
  STATUS_CODES
} from 'http';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '8080';

const cacheTTL = 3600 * 24;

/** slug generates a random integer to be used as a prefix when outputting TeX
  * files. This is done to avoid a race condition between TeX writing the same
  * output file before pdf2svg has completed its work. */
const slug = () =>
  Math.floor(Math.random() * 1e5)

const server = createServer({
  keepAlive: true
});

const setCors = res => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Max-Age', cacheTTL);
};

const optionsHandler = (req, res) => {
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
};

const failedSpawn = (cmd, err) => {
  console.error(err);
}

// TODO: Clean this mess up.
server.on('request', (req, res) => {
  res.setHeader('Accept', 'text/plain');

  if (req.method === 'OPTIONS') {
    return optionsHandler(req, res);
  }

  setCors(res);

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');

    return res.end(`${STATUS_CODES[405]}\n`);
  }

  // Remove the leading slash from the url.
  const latex = decodeURIComponent(req.url).slice(1);

  const prefix = slug();
  const tex = spawn('pdflatex', [`-jobname=${prefix}`]);

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

    const convert = spawn('pdf2svg', [`${prefix}.pdf`, `${prefix}.svg`]);

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
      const svgStream = createReadStream(`${prefix}.svg`);

      res.writeHead(200, { 'content-type': 'image/svg+xml' });

      svgStream.pipe(res);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Listening on: ${HOST}:${PORT}`);
});
