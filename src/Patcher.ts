// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';

import {Section, Markdown} from './Markdown';
import {DocBuilder} from './DocBuilder';

/** Patch section titled API of README.md file in given directory. */

export function patchReadme(basePath: string) {
	var markdown = new Markdown(path.resolve(basePath, 'README.md'));

	var sectionList = markdown.readSections();
	var sectionTbl: { [name: string]: Section } = {};

	for(var section of sectionList) sectionTbl[section.name] = section;

	var apiSection = sectionTbl['api'];

	if(apiSection) {
		apiSection.content = new DocBuilder(basePath).build();
		markdown.writeSections(sectionList);
	}
}
