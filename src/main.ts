/** MyST Viewer
  * This plugin renders MySt markdown syntax in Obsidian's reading mode. It is
  * intended for authors wanting to use MyST instead of Obsidian's dialect, and
  * as such there no plans to support both simultaneously. */

import { Plugin } from 'obsidian';

/** MySTViewer utilizes the MyST parser when rendering markdown in reading mode. */
export default class MySTViewer extends Plugin {
    async onload() {
        console.log('loaded');
    }

    onunload() {
    }
}
