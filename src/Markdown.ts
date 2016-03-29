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

export class Markdown {
	constructor(markdownPath: string) {
		this.path = markdownPath;
	}

	readSections() {
		var lineList = fs.readFileSync(this.path, { encoding: 'utf8' }).split(/\r?\n/);
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

	writeSections(sectionList: Section[]) {
		var output = Array.prototype.concat.apply([], sectionList.map(
			(section: Section) => section.header.concat(section.content)
		)).join('\n');

		fs.writeFileSync(this.path, output, { encoding: 'utf8' });
	}

	path: string;
}
