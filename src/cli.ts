// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import { patchReadme } from './Patcher';

patchReadme(
	path.resolve(process.cwd(), process.argv[2] || '.'),
	path.resolve(process.cwd(), process.argv[3] || 'tsconfig.json')
);
