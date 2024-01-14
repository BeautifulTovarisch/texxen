# MySTViewer

A straightforward plugin to render MyST in the Obsidian editor.

## Overview

This plugin renders MyST markdown syntax in Obsidian's reading mode. It is
intended for an those who author [MyST files](https://myst-parser.readthedocs.io/en/latest/)
rather than use Obsidian's markdown syntax.

This project was motivated by a need to host [my notes](https://github.com/BeautifulTovarisch/Notes)
written with Obsidian and built with Sphinx.

## Usage

After enabling MySTViewer in a vault, the plugin should automatically attempt
to render markdown as MyST. There is no configuration for this plugin.

## Project Scope

This plugin does not modify source files, nor does it convert between the two
flavors of markdown. Additionally, **all files** are treated as MyST and there
are no plans to support coexistence between the two within the same vault.

## Project Architecture

This project is written in TypeScript and contains minimal dependencies outside
of those needed to build/bundle the plugin.

### Major Dependencies

|Dependency    |Version|
|--------------|-------|
|Node          |20.11.0|
|TypeScript    |5.3.3  |
|Obsidian (API)|1.4.11 |

## Getting Started

### Development Setup

Begin by creating an empty vault in order to test the plugin. A sample MyST MD
file called `example-myst.md` has been included to help with testing.

```bash
cp example-myst.md <path/to/new/vault>
```

Next, clone this repository with:

```bash
git clone <TODO> --branch=develop
```

and install its dependencies:

```bash
npm i
```

Verify the setup by creating a build:

```bash
npm run build
```

This will create a file named `main.js`

### Installing the Plugin

TODO
