// This file is part of docts, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';

/** Filtering options for retrieving logs. */

export interface GetLogOptions {
	/** Only match commits where file at path was changed. */
	path?: string;
	/** Only match up to given number of commits. */
	count?: number;
}

export interface FileInfo {
	mode: number;
	hash: string;
}

export interface UserTimeInfo {
	name: string;
	email: string;
	date: { seconds: number, offset: number };
}

export interface LogEntry {
	tree: string;
	parents: string[];
	author: UserTimeInfo;
	committer: UserTimeInfo;
	message: string;
	hash: string;
}

export class Git {
	constructor(repoPath: string) {
		this.repoPath = repoPath;

		require('git-node-fs/mixins/fs-db')(this.repo, repoPath);
		require('js-git/mixins/walkers')(this.repo);

		Promise.promisifyAll(this.repo);
	}

	/** Get promise resolving to the hash of current working tree HEAD commit. */

	getWorkingHead() {
		var headPath = path.resolve(this.repoPath, 'HEAD');

		return(
			Promise.promisify(fs.readFile)(headPath).then((data: Buffer) => {
				var head = data.toString('utf8').trim();
				var match = data.toString('utf8').match(/^[0-9A-Fa-f]+$/);
				if(match) return(match[0]);

				match = head.match(/^ref:\s*([/A-Za-z]*)$/);
				if(match) {
					var readRef = this.repo.readRefAsync as (ref: string) => Promise<string>;
					return(readRef(match[1]));
				}

				throw(new Error('Error parsing HEAD ' + head));
			})
		);
	}

	/** Find file at pathName inside tree. */

	findPath(treeHash: string, pathName: string) {
		var pathPartList = pathName.split('/').reverse();

		var helper = (treeHash: string): Promise<FileInfo> => {
			var part = pathPartList.pop();
			var loadAsync = this.repo.loadAsAsync as (type: string, hash: string) => Promise<{ [name: string]: FileInfo }>;

			return(loadAsync('tree', treeHash).then((nameTbl: { [name: string]: FileInfo }) => {
				var item = nameTbl[part];

				if(!item) return(null);
				else if(pathPartList.length == 0) return(item);
				else return(helper(item.hash));
			}).catch((err: any): FileInfo => null));
		};

		return(helper(treeHash));
	}

	/** Walk the commit log from given hash towards the initial commit,
	  * calling handler for each commit matching options. */

	walkLog(commitHash: string, options: GetLogOptions, handler: (entry: LogEntry) => void) {
		options = options || {} as GetLogOptions;

		var count = options.count || Infinity;
		var entryPrev: LogEntry;
		var hashPrev: string;

		var helper = (
			walker: { read: (cb: (err: any, entry: LogEntry) => void) => void, abort: (cb: any) => void },
			resolve: () => void
		) => {
			walker.read((err: any, entry: LogEntry) => {
				if(!entry) {
					if(entryPrev) handler(entryPrev);
					resolve();
				} else if(options.path) {
					this.findPath(entry.tree, options.path).then((info: FileInfo) => {
						var fileHash = info.hash;
						if(fileHash != hashPrev && entryPrev) handler(entryPrev), --count;

						entryPrev = entry;
						hashPrev = fileHash;

						if(fileHash && count) helper(walker, resolve);
						else resolve();
					})
				} else {
					handler(entry), --count;
					if(count) helper(walker, resolve);
					else resolve();
				}
			});
		};

		return(
			this.repo.logWalkAsync(commitHash).then((walker: any) =>
				new Promise((resolve: () => void, reject: (err: any) => void) =>
					helper(walker, resolve)
				)
			)
		);
	}

	/** Get promise resolving to a list of commits matching options,
	  * in reverse topological / chronological order
	  * from given hash towards the initial commit. */

	getLog(hash: string, options?: GetLogOptions) {
		var result: LogEntry[] = [];

		return(this.walkLog(hash, options, (entry: LogEntry) => result.push(entry)).then(() => result));
	}

	private repoPath: string;
	private repo: any = {};
}
