// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as readts from 'readts';

var hooks: readts.FormatHooks = {
	ref: (spec: readts.TypeSpec, hooks: readts.FormatHooks) => {
		var ref = spec.ref;

		if(ref.class) return('[' + ref.class.name + '](#api-' + ref.class.name + ')');
		else return(ref.name);
	}
};

function isIgnored(spec: readts.ClassSpec | readts.SignatureSpec | readts.IdentifierSpec) {
	return(spec.doc && spec.doc.match(/@ignore/));
}

/** TypeScript project Markdown documentation builder. */

export class DocBuilder {
	constructor(basePath: string) {
		var packagePath = path.resolve(basePath, 'package.json');
		this.tsconfigPath = path.resolve(basePath, 'tsconfig.json');
		var pkgJson = require(packagePath);
		this.dtsPath = path.resolve(basePath, pkgJson.typings);
	}

	private printTitle(name: string, typePrefix: string, doc: string) {
		this.output.push('>');
		this.output.push('> <a name="api-' + name + '"></a>');
		this.output.push('> ### ' + typePrefix + ' [`' + name + '`](#api-' + name + ')');

		if(doc) this.output.push('> <em>' + doc + '</em>  ');
	}

	private printFunction(spec: readts.FunctionSpec, name: string, depth: number, output: string[]) {
		var prefix: string;
		var docPrinted = false;

		if(depth == 0) {
			this.printTitle(spec.name, 'Function', spec.signatureList[0].doc);
			docPrinted = true;
		}

		for(var signatureSpec of spec.signatureList) {
			if(isIgnored(signatureSpec)) continue;

			output.push('> > **' + name + '( )** <sup>&rArr; <code>' + signatureSpec.returnType.format(hooks) + '</code></sup>  ');

			if(signatureSpec.doc && !docPrinted) {
				output.push('> > &emsp;<em>' + signatureSpec.doc + '</em>  ');
			}

			for(var paramSpec of signatureSpec.paramList || []) {
				if(paramSpec.optional) prefix = '> > &emsp;&#x25ab; ' + paramSpec.name + '<sub>?</sub>';
				else prefix = '> > &emsp;&#x25aa; ' + paramSpec.name;

				var doc = paramSpec.doc ? ' <em>' + paramSpec.doc + '</em>' : '';

				output.push(prefix + ' <sup><code>' + paramSpec.type.format(hooks) + '</code></sup>' + doc + '  ');
			}

			docPrinted = false;
		}
	}

	private printProperty(spec: readts.IdentifierSpec, name: string, output: string[]) {
		var prefix: string;

		if(isIgnored(spec)) return;

		if(spec.optional) prefix = '> > **' + name + '**<sub>?</sub>';
		else prefix = '> > **' + name + '**';

		output.push(prefix + ' <sup><code>' + spec.type.format(hooks) + '</code></sup>  ');

		if(spec.doc) output.push('> > &emsp;<em>' + spec.doc + '</em>  ');
	}

	/** Output documentation for a single class. */

	private printClass(spec: readts.ClassSpec, typePrefix: string) {
		this.printTitle(spec.name, typePrefix, spec.doc);

		var methodList = spec.methodList || [];
		var methodOutput: string[] = [];

		if(spec.construct) this.printFunction(spec.construct, 'new', 1, methodOutput);

		for(var methodSpec of methodList) {
			this.printFunction(methodSpec, '.' + methodSpec.name, 1, methodOutput);
		}

		var propertyList = spec.propertyList || [];
		var propertyOutput: string[] = [];

		for(var propertySpec of propertyList) {
			this.printProperty(propertySpec, '.' + propertySpec.name, propertyOutput);
		}

		if(methodOutput.length) {
			this.output.push('>  ');
			this.output.push('> Methods:  ');
			this.output.push.apply(this.output, methodOutput);
		}

		if(propertyOutput.length) {
			this.output.push('>  ');
			this.output.push('> Properties:  ');
			this.output.push.apply(this.output, propertyOutput);
		}
	}

	/** Generate API documentation for the package.
	  * Returns an array of text split by line breaks. */

	build() {
		var parser = new readts.Parser();
		var config = parser.parseConfig(this.tsconfigPath);

		config.options.noEmit = true;
		config.fileNames = [ this.dtsPath ];

		var tree = parser.parse(config);

		this.output = [''];

		for(var moduleSpec of tree) {
			for(var classSpec of moduleSpec.interfaceList) {
				if(isIgnored(classSpec)) continue;
				this.printClass(classSpec, 'Interface');
			}

			for(var classSpec of moduleSpec.classList) {
				if(isIgnored(classSpec)) continue;
				this.printClass(classSpec, 'Class');
			}

			for(var functionSpec of moduleSpec.functionList) {
				this.printFunction(functionSpec, functionSpec.name, 0, this.output);
			}
		}

		this.output.push('');

		return(this.output);
	}

	/** Path to tsconfig.json. */
	private tsconfigPath: string;
	/** Path to main .d.ts exports file. */
	private dtsPath: string;

	/** Generated output split by newlines. */
	private output: string[];
}
