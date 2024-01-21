/** MarkTeX
  * This plugin enables full LaTeX to be rendered in Obsidian's reading mode.
  * In order to work, the author must have a local TeX installation.
  *
  * TODO: Learn how to properly process text. (Alg/Compiler book, etc.) */

import { Plugin } from 'obsidian';

const delimiter = '$$';
const offset = delimiter.length;

/** formatLatexRequest wraps [latex] in a minimal structure needed for TeX to
  * parse the snippet as a standalone document.
  *
  * TODO: Use standalone document class (amsmath). */
const formatLatexRequest = (latex: string) => {
    const doc =
      `\\documentclass{standalone}
      \\usepackage{amsmath}
      \\begin{document}
      ${latex}
      \\end{document}`;

    return encodeURIComponent(doc.trim());
};

/** requestSVG is a promise encapsulating a request to the TeX server which
  * transforms a LaTeX expression into an SVG */
const requestSVG = (latex: string) =>
    fetch(`http://localhost:8080/${formatLatexRequest(latex)}`, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'image/svg+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'plain/text'
        },
        referrerPolicy: 'no-referrer',
    }).then(res => res.text())
        .then(txt => txt.slice(txt.indexOf('<svg')));

/** parse recursively sections [content] into a list containing markdown and
  * LaTeX blocks. */
export const parse = (content: string): string[] => {
    if (!content) {
        return [];
    }

    const start = content.indexOf(delimiter);
    const end = content.indexOf(delimiter, start+offset);

    // If we encounter a code block 'fence', skip past it.
    const fenceStart = content.indexOf('```');
    const fenceEnd = content.indexOf('```', start+3);

    if (start > fenceStart && end < fenceEnd) {
        return parse(content.slice(fenceEnd+3));
    }

    // If we find a '$$' without a corresponding closing '$$', we assume the
    // rest is markdown
    if (end < 0) {
        return [];
    }

    // Poor man's lexing
    // const md = mdBlock(content.slice(0, start));
    const latex = content.slice(start+offset, end).trim();

    return [latex].concat(parse(content.slice(end+offset)));
};

/** TeXXen looks for embedded LaTeX in a markdown document and uses a local TeX
  * installation to render the TeX instructions as SVGs in the final output. The
  * plugin uses markdown-it separately to parse the non-LaTeX content. */
export default class MarkTeX extends Plugin {
    async onload() {
        this.registerMarkdownPostProcessor(async (element, context) => {
            const note = this.app.workspace.getActiveFile();

            if (!note) {
                return;
            }

            const text = await this.app.vault.read(note);

            const parsed = parse(text);

            const svgs = await Promise.all(parsed.map(requestSVG));

            const maths = document.querySelectorAll('.math');

            maths.forEach((m, i) => {
                if (svgs[i]) {
                    m.innerHTML = svgs[i];
                }
            });

            void(element);
            void(context);
        });
    }

    onunload() {
    }
}
