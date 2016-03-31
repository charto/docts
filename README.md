docts
=====

[![build status](https://travis-ci.org/charto/docts.svg?branch=master)](http://travis-ci.org/charto/docts)
[![npm version](https://img.shields.io/npm/v/docts.svg)](https://www.npmjs.com/package/docts)

This is a command-line tool to generate API documentation for TypeScript projects
based on information about types and exported declarations extracted using [readts](https://github.com/charto/readts).
Run `docts` inside your package and it parses the `.d.ts` files referenced from the `typings` key of your `package.json`.
Then it replaces any section titled `API` in your `README.md` file with new automatically generated content.
For an example of its output, see the [API](#api) section below.

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

>
> <a name="api-Section"></a>
> ### Class [`Section`](#api-Section)
>  
> Methods:  
> > **new( )** <sup>&rArr; <code>[Section](#api-Section)</code></sup>  
>  
> Properties:  
> > **.header** <sup><code>string[]</code></sup>  
> > **.content** <sup><code>string[]</code></sup>  
> > **.name** <sup><code>string</code></sup>  
>
> <a name="api-Markdown"></a>
> ### Class [`Markdown`](#api-Markdown)
>  
> Methods:  
> > **new( )** <sup>&rArr; <code>[Markdown](#api-Markdown)</code></sup>  
> > &emsp;&#x25aa; markdownPath <sup><code>string</code></sup>  
> > **.readSections( )** <sup>&rArr; <code>[Section](#api-Section)[]</code></sup>  
> > **.writeSections( )** <sup>&rArr; <code>void</code></sup>  
> > &emsp;&#x25aa; sectionList <sup><code>[Section](#api-Section)[]</code></sup>  
>  
> Properties:  
> > **.path** <sup><code>string</code></sup>  
>
> <a name="api-generateDoc"></a>
> ### Function [`generateDoc`](#api-generateDoc)
> <em>Generate API documentation for package given a path to its root.
Returns an array of text split by line breaks.</em>  
> > **generateDoc( )** <sup>&rArr; <code>string[]</code></sup>  
> > &emsp;&#x25aa; basePath <sup><code>string</code></sup>  
>
> <a name="api-patchReadme"></a>
> ### Function [`patchReadme`](#api-patchReadme)
> <em>Patch section titled API of README.md file in given directory.</em>  
> > **patchReadme( )** <sup>&rArr; <code>void</code></sup>  
> > &emsp;&#x25aa; basePath <sup><code>string</code></sup>  

License
=======

[The MIT License](https://raw.githubusercontent.com/charto/docts/master/LICENSE)

Copyright (c) 2016 BusFaster Ltd
