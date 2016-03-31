// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as readts from 'readts';

import {Section, Markdown} from './Markdown';

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

function printTitle(name: string, typePrefix: string, doc: string, output: string[]) {
	output.push('>');
	output.push('> <a name="api-' + name + '"></a>');
	output.push('> ### ' + typePrefix + ' [`' + name + '`](#api-' + name + ')');

	if(doc) output.push('> <em>' + doc + '</em>  ');
}

function printFunction(spec: readts.FunctionSpec, name: string, depth: number, output: string[]) {
	var prefix: string;
	var docPrinted = false;

	if(depth == 0) {
		printTitle(spec.name, 'Function', spec.signatureList[0].doc, output);
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

function printProperty(spec: readts.IdentifierSpec, name: string, output: string[]) {
	var prefix: string;

	if(isIgnored(spec)) return;

	if(spec.optional) prefix = '> > **' + name + '**<sub>?</sub>';
	else prefix = '> > **' + name + '**';

	output.push(prefix + ' <sup><code>' + spec.type.format(hooks) + '</code></sup>  ');

	if(spec.doc) output.push('> > &emsp;<em>' + spec.doc + '</em>  ');
}

/** Output documentation for a single class. */

function printClass(spec: readts.ClassSpec, typePrefix: string, output: string[]) {
	printTitle(spec.name, typePrefix, spec.doc, output);

	var methodList = spec.methodList || [];
	var methodOutput: string[] = [];

	if(spec.construct) printFunction(spec.construct, 'new', 1, methodOutput);

	for(var methodSpec of methodList) {
		printFunction(methodSpec, '.' + methodSpec.name, 1, methodOutput);
	}

	var propertyList = spec.propertyList || [];
	var propertyOutput: string[] = [];

	for(var propertySpec of propertyList) {
		printProperty(propertySpec, '.' + propertySpec.name, propertyOutput);
	}

	if(methodOutput.length) {
		output.push('>  ');
		output.push('> Methods:  ');
		output.push.apply(output, methodOutput);
	}

	if(propertyOutput.length) {
		output.push('>  ');
		output.push('> Properties:  ');
		output.push.apply(output, propertyOutput);
	}
}

/** Generate API documentation for package given a path to its root.
  * Returns an array of text split by line breaks. */

export function generateDoc(basePath: string) {
	var packagePath = path.resolve(basePath, 'package.json');
	var tsconfigPath = path.resolve(basePath, 'tsconfig.json');
	var pkgJson = require(packagePath);
	var dtsPath = path.resolve(basePath, pkgJson.typings);

	var parser = new readts.Parser();
	var config = parser.parseConfig(tsconfigPath);

	config.options.noEmit = true;
	config.fileNames = [ dtsPath ];

	var output: string[] = [];
	var tree = parser.parse(config);

	output.push('');

	for(var moduleSpec of tree) {
		for(var classSpec of moduleSpec.interfaceList) {
			if(isIgnored(classSpec)) continue;
			printClass(classSpec, 'Interface', output);
		}

		for(var classSpec of moduleSpec.classList) {
			if(isIgnored(classSpec)) continue;
			printClass(classSpec, 'Class', output);
		}

		for(var functionSpec of moduleSpec.functionList) {
			printFunction(functionSpec, functionSpec.name, 0, output);
		}
	}

	output.push('');

	return(output);
}

/** Patch section titled API of README.md file in given directory. */

export function patchReadme(basePath: string) {
	var markdown = new Markdown(path.resolve(basePath, 'README.md'));

	var sectionList = markdown.readSections();
	var sectionTbl: { [name: string]: Section } = {};

	for(var section of sectionList) sectionTbl[section.name] = section;

	var apiSection = sectionTbl['api'];

	if(apiSection) {
		apiSection.content = generateDoc(basePath);
		markdown.writeSections(sectionList);
	}
}
