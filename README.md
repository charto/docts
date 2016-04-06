docts
=====

[![build status](https://travis-ci.org/charto/docts.svg?branch=master)](http://travis-ci.org/charto/docts)
[![dependency status](https://david-dm.org/charto/docts.svg)](https://david-dm.org/charto/docts)
[![npm version](https://img.shields.io/npm/v/docts.svg)](https://www.npmjs.com/package/docts)

This is a command-line tool to generate API documentation for TypeScript projects
based on information about types and exported declarations extracted using [readts](https://github.com/charto/readts).
Run `docts` inside your package and it parses the `.d.ts` files referenced from the `typings` key of your `package.json`.
Then it replaces any section titled `API` in your `README.md` file with new automatically generated content.
For an example of its output, see the [API](#api) section below.

If your package is a Git working tree and the `repository` field in `package.json` points to a Github URL,
links to relevant parts of the code published on Github are added next to functions, classes and methods.
Each link looks like `<>` and includes the hash of the latest commit which changed the relevant file.
If that file is dirty in the working tree, the link points to whatever is on the current branch instead.
This minimizes changes to the links while trying to keep them pointed to the correct location in latest code.

Any additional TypeScript configuration should be defined in `tsconfig.json` in the root if your package.

Usage
-----

Start by making a backup of your `README.md`.

Then install:

```sh
npm install --save-dev docts
```

Make sure your `package.json` has a `typings` section and add in the `scripts` section:

```json
  "scripts": {
    "docts": "docts"
  }
```

Finally run:

```sh
npm run docts
```

API
===
Docs generated using [`docts`](https://github.com/charto/docts)
>
> <a name="api-DocBuilder"></a>
> ### Class [`DocBuilder`](#api-DocBuilder)
> <em>TypeScript project Markdown documentation builder.</em>  
> Source code: [`<>`](http://github.com/charto/docts/blob/db09800/src/DocBuilder.ts#L41-L284)  
>  
> Methods:  
> > **new( )** <sup>&rArr; <code>[DocBuilder](#api-DocBuilder)</code></sup> [`<>`](http://github.com/charto/docts/blob/db09800/src/DocBuilder.ts#L42-L59)  
> > &emsp;&#x25aa; basePath <sup><code>string</code></sup>  
> > **.build( )** <sup>&rArr; <code>Promise&lt;any&gt;</code></sup> [`<>`](http://github.com/charto/docts/blob/db09800/src/DocBuilder.ts#L253-L270)  
> > &emsp;<em>Generate API documentation for the package.</em>  
> > &emsp;<em>Returns promise resolving to an array of text split by line breaks.</em>  
>
> <a name="api-Markdown"></a>
> ### Class [`Markdown`](#api-Markdown)
> <em>Represents a Markdown file.</em>  
> Source code: [`<>`](http://github.com/charto/docts/blob/1c6326e/src/Markdown.ts#L21-L82)  
>  
> Methods:  
> > **new( )** <sup>&rArr; <code>[Markdown](#api-Markdown)</code></sup> [`<>`](http://github.com/charto/docts/blob/1c6326e/src/Markdown.ts#L22-L24)  
> > &emsp;&#x25aa; markdownPath <sup><code>string</code></sup>  
> > **.readSections( )** <sup>&rArr; <code>[Section](#api-Section)[]</code></sup> [`<>`](http://github.com/charto/docts/blob/1c6326e/src/Markdown.ts#L28-L67)  
> > &emsp;<em>Read the file and split each heading into a separate section.</em>  
> > **.writeSections( )** <sup>&rArr; <code>Promise&lt;void&gt;</code></sup> [`<>`](http://github.com/charto/docts/blob/1c6326e/src/Markdown.ts#L71-L79)  
> > &emsp;<em>Replace file contents with a new list of sections.</em>  
> > &emsp;&#x25aa; sectionList <sup><code>[Section](#api-Section)[]</code></sup>  
>  
> Properties:  
> > **.path** <sup><code>string</code></sup>  
>
> <a name="api-Section"></a>
> ### Class [`Section`](#api-Section)
> <em>Represents a section in a Markdown file.</em>  
> Source code: [`<>`](http://github.com/charto/docts/blob/1c6326e/src/Markdown.ts#L9-L17)  
>  
> Properties:  
> > **.header** <sup><code>string[]</code></sup>  
> > &emsp;<em>Heading and its markup split by newlines.</em>  
> > &emsp;<em>Heading is a line beginning with # or followed by another line full of - or =.</em>  
> > **.content** <sup><code>string[]</code></sup>  
> > &emsp;<em>Section content split by newlines.</em>  
> > **.name** <sup><code>string</code></sup>  
> > &emsp;<em>Heading with markup stripped.</em>  
>
> <a name="api-patchReadme"></a>
> ### Function [`patchReadme`](#api-patchReadme)
> <em>Patch section titled API of README.md file in given directory.</em>  
> Source code: [`<>`](http://github.com/charto/docts/blob/d74799b/src/Patcher.ts#L11-L27)  
> > **patchReadme( )** <sup>&rArr; <code>void</code></sup> [`<>`](http://github.com/charto/docts/blob/d74799b/src/Patcher.ts#L11-L27)  
> > &emsp;&#x25aa; basePath <sup><code>string</code></sup>  

License
=======

[The MIT License](https://raw.githubusercontent.com/charto/docts/master/LICENSE)

Copyright (c) 2016 BusFaster Ltd
