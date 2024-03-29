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
  */
const formatLatexRequest = (latex: string) => {
    const doc =
      `\\documentclass{standalone}
      \\usepackage{tikz}
      \\usepackage{pgfplots}
      \\usepackage{graphicx}
      \\usepackage{xcolor}
      \\begin{document}
      \\color{white}
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

// Compute 'sufficiently random' unique identifier.
const randomId = () => 'xxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor((Math.random() * 16)).toString(16)
);

const createSVG = (svg: string) => {
    const el = document.createElement('div');
    el.innerHTML = svg;
    el.id = `tex-${randomId()}`;
    el.setAttribute('class', 'tex');

    return el;
};

/** namespaceEl traverses [el] and adds [suffix] to each reference and id
 * This is done to ensure no clashing occurs between different SVGs in the same
 * view. */
const namespaceEl = (el: Element, suffix: string) => {
    if (!el) {
        return;
    }

    if (!el.children) {
        el.id = `${el.id}-${suffix}`;
    }

    // Basically DFS on an element.
    for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];

        child.id = `${child.id}-${suffix}`;
        if (child.hasAttribute('xlink:href')) {
            const ref = child.getAttribute('xlink:href');

            child.setAttribute('xlink:href', `${ref}-${suffix}`);
        }

        namespaceEl(child, suffix);
    }
};

/** parse recursively sections [content] into a list containing markdown and
  * LaTeX blocks. */
const parse = (content: string): string[] => {
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

// Insert [replacement] as the child of [orig]'s parent.
const replaceElement = (orig: Element, replacement: Element|null): void => {
    if (!orig.parentNode) {
        return;
    }

    const parent = orig.parentNode;

    parent.removeChild(orig);

    if (replacement) {
        parent.append(replacement);
    }
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
            const requests = parse(text).map(requestSVG);

            const svgs = await Promise.all(requests);
            const svgNodes = svgs.map(createSVG);

            const maths = document.querySelectorAll('.math-block');

            maths.forEach((m, i) => {
                if (svgNodes[i]) {
                    // Typescript is unable to infer these are non-null
                    namespaceEl(svgNodes[i]!, svgNodes[i]!.id);

                    replaceElement(m, svgNodes[i]);
                }
            });

            void(element);
            void(context);
        });
    }

    onunload() {
    }
}
