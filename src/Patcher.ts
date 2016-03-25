// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as readts from 'readts';

export class Section {
	header: string[] = [];
	content: string[] = [];
	name: string;
}

var hooks: readts.FormatHooks = {
	ref(spec: readts.TypeSpec, hooks: readts.FormatHooks) {
		var ref = spec.ref;

		if(ref.class) return('[' + ref.class.name + '](#api-' + ref.class.name + ')');
		else return(ref.name);
	}
};

export function readSections(markdownPath: string) {
	var lineList = fs.readFileSync(markdownPath, { encoding: 'utf8' }).split(/\r?\n/);
	var sectionList: Section[] = [];
	var section = new Section();
	var prev: string = null;

	for(var line of lineList) {
		if(line.match(/^ *[-=]{2,} *$/)) {
			sectionList.push(section);
			section = new Section();

			if(prev) {
				section.header.push(prev);
				section.header.push(line);
				section.name = prev.trim().toLowerCase();
			}
			line = null;
		} else {
			if(prev || prev === '') section.content.push(prev);

			var match = line.match(/^ *#{1,6} *([^ #]+)/);

			if(match) {
				sectionList.push(section);
				section = new Section();

				section.header.push(line);
				section.name = match[1].trim().toLowerCase();
				line = null;
			}
		}

		prev = line;
	}

	if(prev || prev === '') section.content.push(prev);
	sectionList.push(section);

	return(sectionList);
}

function writeSections(sectionList: Section[], markdownPath: string) {
	var output = Array.prototype.concat.apply([], sectionList.map(
		(section: Section) => section.header.concat(section.content)
	)).join('\n');

	fs.writeFileSync(markdownPath, output, { encoding: 'utf8' });
}

function isIgnored(spec: readts.ClassSpec | readts.SignatureSpec | readts.IdentifierSpec) {
	return(spec.doc && spec.doc.match(/@ignore/));
}

function printFunction(spec: readts.FunctionSpec, name: string, output: string[]) {
	var prefix: string;

	for(var signatureSpec of spec.signatureList) {
		if(isIgnored(signatureSpec)) continue;

		output.push('> > **' + name + '( )** <sup>&rArr; <code>' + signatureSpec.returnType.format(hooks) + '</code></sup>  ');

		if(signatureSpec.doc) output.push('> > &emsp;<em>' + signatureSpec.doc + '</em>  ');

		for(var paramSpec of signatureSpec.paramList || []) {
			if(paramSpec.optional) prefix = '> > &emsp;&#x25ab; ' + paramSpec.name + '<sub>?</sub>';
			else prefix = '> > &emsp;&#x25aa; ' + paramSpec.name;

			var doc = paramSpec.doc ? ' <em>' + paramSpec.doc + '</em>' : '';

			output.push(prefix + ' <sup><code>' + paramSpec.type.format(hooks) + '</code></sup>' + doc + '  ');
		}
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
		for(var classSpec of moduleSpec.classList) {
			if(isIgnored(classSpec)) continue;

			output.push('>');
			output.push('> <a name="api-' + classSpec.name + '"></a>');
			output.push('> ### [`' + classSpec.name + '`](#api-' + classSpec.name + ')');

			if(classSpec.doc) output.push('> <em>' + classSpec.doc + '</em>  ');

			var methodList = classSpec.methodList || [];
			var methodOutput: string[] = [];

			if(classSpec.construct) printFunction(classSpec.construct, 'new', methodOutput);

			for(var methodSpec of methodList) {
				printFunction(methodSpec, '.' + methodSpec.name, methodOutput);
			}

			var propertyList = classSpec.propertyList || [];
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
	}

	output.push('');

	return(output);
}

export function patchReadme(basePath: string) {
	var readmePath = path.resolve(basePath, 'README.md');

	var sectionList = readSections(readmePath);
	var sectionTbl: { [name: string]: Section } = {};

	for(var section of sectionList) sectionTbl[section.name] = section;

	var apiSection = sectionTbl['api'];

	if(apiSection) {
		apiSection.content = generateDoc(basePath);
		writeSections(sectionList, readmePath);
	}
}
