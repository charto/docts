// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as Promise from 'bluebird';
import * as readts from 'readts';

import {Git, CommitInfo, HeadInfo} from 'ts-git';

interface SourceInfo {
	dirty?: boolean;
	hash?: string;
	shortHash?: string;
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
		this.basePath = basePath;
		var packagePath = path.resolve(basePath, 'package.json');
		this.tsconfigPath = path.resolve(basePath, 'tsconfig.json');
		var pkgJson = require(packagePath);
		this.dtsPath = path.resolve(basePath, pkgJson.typings);

		var gitUrl = pkgJson.repository && pkgJson.repository.url;

		if(gitUrl) {
			var match = gitUrl.match(/^[+a-z]+:\/\/(github.com\/.+)\.git$/);

			if(match) {
				this.gitRepo = match[1];
				this.git = new Git(basePath);
			}
		}
	}

	private getSource(pathName: string) {
		var source = this.sourceTbl[pathName];

		if(!source) {
			var info: SourceInfo = {};

			source = this.git.isDirty(pathName).then((dirty: boolean) => {
				info.dirty = dirty;

				if(dirty) return(null);

				return(this.git.getLog(this.gitHead, {
					path: pathName,
					count: 1
				}));
			}).then((commitList: CommitInfo[]) => {
				if(commitList && commitList.length) {
					var hash = commitList[0].hash;

					info.hash = hash;
					info.shortHash = hash.substr(0, 7);
				}

				return(info);
			});

			this.sourceTbl[pathName] = source;
		}

		return(source);
	}

	private formatPos(pos: readts.SourcePos) {
		if(!pos) return(Promise.resolve(''));

		return(this.getSource(pos.sourcePath).then((source: SourceInfo) => {
			var url = [
				this.gitRepo,
				'blob',
				source.shortHash || this.gitBranch,
				path.relative(this.basePath, pos.sourcePath)
			].join('/');

			var urlHash = '#L' + pos.firstLine;
			if(pos.lastLine != pos.firstLine) urlHash += '-L' + pos.lastLine;

			return(' [`<>`](http://' + url + urlHash + ')');
		}));
	}

	private printTitle(name: string, typePrefix: string, doc: string, pos: readts.SourcePos) {
		return(this.formatPos(pos).then((posLink: string) => {
			var output = [
				'>',
				'> <a name="api-' + name + '"></a>',
				'> ### ' + typePrefix + ' [`' + name + '`](#api-' + name + ')'
			];

			if(doc) {
				for(var line of doc.split(/\r?\n/)) {
					output.push('> <em>' + line + '</em>  ');
				}
			}

			output.push('> Source code:' + posLink + '  ');

			return(output);
		}));
	}

	private printFunction(spec: readts.FunctionSpec, name: string, depth: number) {
		return(Promise.all([
			depth == 0 ? this.printTitle(spec.name, 'Function', spec.signatureList[0].doc, spec.signatureList[0].pos) : [],

			Promise.map(spec.signatureList, (signatureSpec: readts.SignatureSpec, index: number) =>
				isIgnored(signatureSpec) ? [] : this.formatPos(signatureSpec.pos).then((posLink: string) => {
					var output = [
						'> > **' + name + '( )** <sup>&rArr; <code>' + signatureSpec.returnType.format(hooks) + '</code></sup>' + posLink + '  '
					];
					var prefix: string;

					if(signatureSpec.doc && (depth > 0 || index > 0)) {
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

					return(output);
				})
			).then(flatten)
		]).then(flatten));
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
		var methodList = spec.methodList || [];

		if(spec.construct && spec.construct.signatureList.length && spec.construct.signatureList[0].pos) methodList.unshift(spec.construct);

		return(Promise.all([
			this.printTitle(spec.name, typePrefix, spec.doc, spec.pos),

			Promise.map(spec.methodList || [], (methodSpec: readts.FunctionSpec) =>
				this.printFunction(methodSpec, methodSpec == spec.construct ? 'new' : '.' + methodSpec.name, 1)
			).then(flatten).then((output: string[]) =>
				output.length == 0 ? output : [
					'>  ',
					'> Methods:  '
				].concat(output)
			),

			Promise.map(spec.propertyList || [], (propertySpec: readts.IdentifierSpec) =>
				this.printProperty(propertySpec, '.' + propertySpec.name)
			).then(flatten).then((output: string[]) =>
				output.length == 0 ? output : [
					'>  ',
					'> Properties:  '
				].concat(output)
			),
		]).then(flatten));
	}

	private init() {
		if(this.git) {
			return(
				this.git.getWorkingHead().then((head: HeadInfo) => {
					this.gitHead = head.hash;
					this.gitBranch = head.branch;
				}).catch((err: any) => true)
			);
		}

		return(Promise.resolve(true));
	}

	private generate(tree: readts.ModuleSpec[]) {
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
				flatten([
					['Docs generated using [`docts`](https://github.com/charto/docts)'],
					output,
					['']
				])
			)
		);
	}

	private sourceTbl: { [path: string]: Promise<SourceInfo> } = {};

	private basePath: string;
	/** Path to tsconfig.json. */
	private tsconfigPath: string;
	/** Path to main .d.ts exports file. */
	private dtsPath: string;

	private git: Git;
	private gitRepo: string;
	private gitHead: string;
	private gitBranch: string;
}
