// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';
import * as readts from 'readts';

import {Git, CommitInfo} from 'ts-git';

interface SourceInfo {
	dirty: boolean;
	hash: string;
}

var hooks: readts.FormatHooks = {
	ref: (spec: readts.TypeSpec, hooks: readts.FormatHooks) => {
		var ref = spec.ref;

		if(ref.class) return('[' + ref.class.name + '](#api-' + ref.class.name + ')');
		else return(ref.name);
	}
};

function flatten(listList: string[][]) {
	return(Array.prototype.concat.apply([], listList));
}

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

		this.git = new Git(basePath);
	}

	private formatPos(pos: readts.SourcePos) {
		if(!pos) return('');
		return(' [`<>`](#L' + pos.firstLine + ')');
	}

	private printTitle(name: string, typePrefix: string, doc: string, pos: readts.SourcePos) {
		var output: string[] = [];

		output.push('>');
		output.push('> <a name="api-' + name + '"></a>');
		output.push('> ### ' + typePrefix + ' [`' + name + '`](#api-' + name + ')');

		if(doc) {
			for(var line of doc.split(/\r?\n/)) {
				output.push('> <em>' + line + '</em>  ');
			}
		}

		output.push('> Source code:' + this.formatPos(pos) + '  ');

		return(output);
	}

	private printFunction(spec: readts.FunctionSpec, name: string, depth: number) {
		var output: string[] = [];
		var prefix: string;
		var docPrinted = false;

		if(depth == 0) {
			output = this.printTitle(spec.name, 'Function', spec.signatureList[0].doc, spec.pos);
			docPrinted = true;
		}

		for(var signatureSpec of spec.signatureList) {
			if(isIgnored(signatureSpec)) continue;

			output.push('> > **' + name + '( )** <sup>&rArr; <code>' + signatureSpec.returnType.format(hooks) + '</code></sup>' + this.formatPos(signatureSpec.pos) + '  ');

			if(signatureSpec.doc && !docPrinted) {
				for(var line of signatureSpec.doc.split(/\r?\n/)) {
					output.push('> > &emsp;<em>' + line + '</em>  ');
				}
			}

			for(var paramSpec of signatureSpec.paramList || []) {
				if(paramSpec.optional) prefix = '> > &emsp;&#x25ab; ' + paramSpec.name + '<sub>?</sub>';
				else prefix = '> > &emsp;&#x25aa; ' + paramSpec.name;

				var doc = paramSpec.doc ? ' <em>' + paramSpec.doc + '</em>' : '';

				output.push(prefix + ' <sup><code>' + paramSpec.type.format(hooks) + '</code></sup>' + doc + '  ');
			}

			docPrinted = false;
		}

		return(output);
	}

	private printProperty(spec: readts.IdentifierSpec, name: string) {
		var output: string[] = [];
		var prefix: string;

		if(isIgnored(spec)) return;

		if(spec.optional) prefix = '> > **' + name + '**<sub>?</sub>';
		else prefix = '> > **' + name + '**';

		output.push(prefix + ' <sup><code>' + spec.type.format(hooks) + '</code></sup>  ');

		if(spec.doc) {
			for(var line of spec.doc.split(/\r?\n/)) {
				output.push('> > &emsp;<em>' + line + '</em>  ');
			}
		}

		return(output);
	}

	/** Output documentation for a single class. */

	private printClass(spec: readts.ClassSpec, typePrefix: string) {
		var output = this.printTitle(spec.name, typePrefix, spec.doc, spec.pos);

		var methodList = spec.methodList || [];
		var methodOutput: string[][] = [];

		if(spec.construct) methodOutput.push(this.printFunction(spec.construct, 'new', 1));

		for(var methodSpec of methodList) {
			methodOutput.push(this.printFunction(methodSpec, '.' + methodSpec.name, 1));
		}

		var propertyList = spec.propertyList || [];
		var propertyOutput: string[][] = [];

		for(var propertySpec of propertyList) {
			propertyOutput.push(this.printProperty(propertySpec, '.' + propertySpec.name));
		}

		if(methodOutput.length) {
			output.push('>  ');
			output.push('> Methods:  ');
			output = output.concat.apply(output, methodOutput);
		}

		if(propertyOutput.length) {
			output.push('>  ');
			output.push('> Properties:  ');
			output = output.concat.apply(output, propertyOutput);
		}

		return(output);
	}

	private init() {
		if(this.git) {
			return(
				this.git.getWorkingHead().then((hash: string) =>
					this.gitHead = hash
				).catch((err: any) => true)
			);
		}

		return(Promise.resolve(true));
	}

	private generate(tree: readts.ModuleSpec[]) {
		this.git.getLog(this.gitHead, {
			path: 'package.json',
			count: 1
		}).then((log: CommitInfo[]) => {
			if(log) console.log(log[0].hash.substr(0, 7));
this.git.isDirty('package.json').then((dirty: boolean) => console.log(dirty));
//			console.log(log.map((entry: LogEntry) => new Date(entry.author.date.seconds * 1000).toISOString()));
		});

		return(
			Promise.map(tree, (moduleSpec: readts.ModuleSpec) =>
				Promise.map([
					Promise.map(moduleSpec.interfaceList, (interfaceSpec: readts.ClassSpec) =>
						isIgnored(interfaceSpec) ? null : this.printClass(interfaceSpec, 'Interface')
					),
					Promise.map(moduleSpec.classList, (classSpec: readts.ClassSpec) =>
						isIgnored(classSpec) ? null : this.printClass(classSpec, 'Class')
					),
					Promise.map(moduleSpec.functionList, (functionSpec: readts.FunctionSpec) =>
						this.printFunction(functionSpec, functionSpec.name, 0)
					)
				], flatten).then(flatten)
			).then(flatten)
		);
	}

	/** Generate API documentation for the package.
	  * Returns promise resolving to an array of text split by line breaks. */

	build() {
		var parser = new readts.Parser();
		var config = parser.parseConfig(this.tsconfigPath);

		config.options.noEmit = true;

		return(
			this.init().then(() =>
				this.generate(parser.parse(config, (pathName: string) => pathName == this.dtsPath, '.d.ts'))
			).then((output: string[]) =>
				['Docs generated using [`docts`](https://github.com/charto/docts)'].concat(output, [''])
			)
		);
	}

	private sourceTbl: { [path: string]: SourceInfo } = {};

	/** Path to tsconfig.json. */
	private tsconfigPath: string;
	/** Path to main .d.ts exports file. */
	private dtsPath: string;

	private git: Git;
	private gitHead: string;
}
