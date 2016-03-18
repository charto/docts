// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import {Parser} from 'readts';

export function patchReadme(basePath: string) {
	var parser = new Parser();

	var packagePath = path.resolve(basePath, 'package.json');
	var tsconfigPath = path.resolve(basePath, 'tsconfig.json');

	var config = parser.parseConfig(tsconfigPath);

	var pkgJson = require(packagePath);
	var dtsPath = path.resolve(basePath, pkgJson.typings);

	config.options.noEmit = true;
	config.fileNames = [ dtsPath ];

	console.log(JSON.stringify(parser.parse(config), null, 4));
}
