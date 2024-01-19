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

const server = createServer({
  keepAlive: true
});

server.on('request', (req, res) => {
  res.setHeader('accept', 'text/plain');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('allow', 'POST');

    return res.end(`${STATUS_CODES[405]}\n`);
  }

  const tex = spawn('pdflatex');

  // Pipe the request body to pdflatex for compilation
  req.pipe(tex.stdin);

  // TODO: Some simple logging.
  tex.stderr.on('data', (err) => {
    console.error(err);

    res.statusCode = 500;
    res.end(`${STATUS_CODES[500]}: ${err}\n`);
  });

  // Check for successful TeX output, otherwise return an error to the client
  // and some placeholder HTML indicating an error.
  tex.on('exit', (code, signal) => {

    if (code) {
      console.error(`TeX exited with code: ${code} and signal: ${signal}`);

      res.status = 500;
      return res.end(`${STATUS_CODES[500]}\n`);
    }

    const convert = spawn('pdf2svg', ['texput.pdf', 'output.svg']);

    convert.stderr.on('data', console.error);
    convert.on('exit', (code, signal) => {
      if (code) {
        console.error(`pdf2svg exited with code: ${code} and signal: ${signal}`);

        res.status = 500;
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
