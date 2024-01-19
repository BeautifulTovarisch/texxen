/** MarkTeX
  * This plugin enables full LaTeX to be rendered in Obsidian's reading mode.
  * In order to work, the author must have a local TeX installation.
  *
  * TODO: Write TeX service that provides TeX as SVGs.
  * TODO: Learn how to properly process text. (Alg/Compiler book, etc.) */

// bro lmao.
// fetch("https://i.upmath.me/svg/%0A%5Cbegin%7Balign%7D%0Aa%5E2%20%2B%20b%5E2%20%26%3D%20c%5E2%20%5Ctet%0A%5Cend%7Balign%7D%0A", {
//   "headers": {
//     "accept": "*/*",
//     "accept-language": "en-US,en;q=0.9",
//     "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"Linux\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-site",
//     "Referer": "https://upmath.me/",
//     "Referrer-Policy": "strict-origin-when-cross-origin"
//   },
//   "body": null,
//   "method": "GET"
// });

import { Plugin } from 'obsidian';

import markdownit from 'markdown-it';

const delimiter = '$$';
const offset = delimiter.length;

/** Content represents the mutually exclusive contiguous blocks of content that
  * exist in the input file. */
type Content =
  | {t: 'latex'; text: string}
  | {t: 'markdown'; text: string};

const mdBlock = (text: string): Content => ({
    t: 'markdown', text
});

const latexBlock = (text: string): Content => ({
    t: 'latex', text
});

/** parse recursively sections [content] into a list containing markdown and
  * LaTeX blocks. */
export const parse = (content: string): Content[] => {
    if (!content) {
        return [];
    }

    // What a mess...

    const start = content.indexOf(delimiter);
    const end = content.indexOf(delimiter, start+offset);

    // If we encounter a code block 'fence', return as markdown
    const fenceStart = content.indexOf('```');
    const fenceEnd = content.indexOf('```', start+3);

    if (start > fenceStart && end < fenceEnd) {
        const code = content.slice(0, fenceEnd+3);

        return [mdBlock(code)].concat(parse(content.slice(fenceEnd+3)));
    }

    // If we find a '$$' without a correspondind closing '$$', we assume its
    // markdown
    if (end < 0) {
        return [mdBlock(content)];
    }

    // Poor man's lexing
    const md = mdBlock(content.slice(0, start));
    const latex = latexBlock(content.slice(start+offset, end).trim());

    return [md, latex].concat(parse(content.slice(end+offset)));
};

/** TeXXen looks for embedded LaTeX in a markdown document and uses a local TeX
  * installation to render the TeX instructions as SVGs in the final output. The
  * plugin uses markdown-it separately to parse the non-LaTeX content. */
export default class MarkTeX extends Plugin {
    async onload() {
        this.registerMarkdownPostProcessor(async (element, context) => {
            const md = markdownit();

            const note = this.app.workspace.getActiveFile();

            if (!note) {
                return;
            }

            const text = await this.app.vault.read(note);

            for (const block of parse(text)) {
                if (block.t === 'markdown') {
                    md.render(block.text);
                }
            }

            void(element);
            void(context);
        });
    }

    onunload() {
    }
}
