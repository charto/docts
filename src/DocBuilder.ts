// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';
import * as readts from 'readts';

import {Git, CommitInfo} from 'ts-git';

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

		this.git = new Git(basePath);
	}

	private printTitle(name: string, typePrefix: string, doc: string) {
		this.output.push('>');
		this.output.push('> <a name="api-' + name + '"></a>');
		this.output.push('> ### ' + typePrefix + ' [`' + name + '`](#api-' + name + ')');

		if(doc) {
			for(var line of doc.split(/\r?\n/)) {
				this.output.push('> <em>' + line + '</em>  ');
			}
		}

		this.output.push('> Source code: [`<>`](#)  ');
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

			output.push('> > **' + name + '( )** <sup>&rArr; <code>' + signatureSpec.returnType.format(hooks) + '</code></sup> [`<>`](#)  ');

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
	}

	private printProperty(spec: readts.IdentifierSpec, name: string, output: string[]) {
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
			Promise.each(tree, (moduleSpec: readts.ModuleSpec) =>
				Promise.each(moduleSpec.interfaceList, (interfaceSpec: readts.ClassSpec) =>
					isIgnored(interfaceSpec) || this.printClass(interfaceSpec, 'Interface')
				).then(() =>
					Promise.each(moduleSpec.classList, (classSpec: readts.ClassSpec) =>
						isIgnored(classSpec) || this.printClass(classSpec, 'Class')
					)
				).then(() =>
					Promise.each(moduleSpec.functionList, (functionSpec: readts.FunctionSpec) =>
						this.printFunction(functionSpec, functionSpec.name, 0, this.output)
					)
				)
			)
		);
	}

	/** Generate API documentation for the package.
	  * Returns promise resolving to an array of text split by line breaks. */

	build() {
		var parser = new readts.Parser();
		var config = parser.parseConfig(this.tsconfigPath);

		config.options.noEmit = true;
		config.fileNames = [ this.dtsPath ];

		this.output = ['Autogenerated using [`docts`](https://github.com/charto/docts)'];

		return(
			this.init().then(() =>
				this.generate(parser.parse(config))
			).then(() =>
				this.output.push('') && this.output
			)
		);
	}

	/** Path to tsconfig.json. */
	private tsconfigPath: string;
	/** Path to main .d.ts exports file. */
	private dtsPath: string;

	private git: Git;
	private gitHead: string;

	/** Generated output split by newlines. */
	private output: string[];
}
