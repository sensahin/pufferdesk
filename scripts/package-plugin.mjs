import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const pluginSlug = manifest.name;
const releaseDir = path.join(root, 'release');
const stagingRoot = path.join(releaseDir, pluginSlug);
const zipPath = path.join(releaseDir, `${pluginSlug}-${manifest.version}.zip`);
const machineSpecificFiles = new Set([
	'.DS_Store',
	'Thumbs.db',
	'desktop.ini'
]);

const ignoredTopLevel = new Set([
	'.git',
	'.github',
	'.gitattributes',
	'.editorconfig',
	'.gitignore',
	'.phpcs.xml.dist',
	'AGENTS.md',
	'README.md',
	'composer.json',
	'composer.lock',
	'coverage',
	'docs',
	'eslint.config.mjs',
	'node_modules',
	'package-lock.json',
	'package.json',
	'playwright-report',
	'playwright.config.mjs',
	'scripts',
	'stylelint.config.cjs',
	'test-results',
	'tests',
	'vendor',
	'release'
]);

async function copyDirectory(source, target) {
	await fs.mkdir(target, { recursive: true });
	const entries = await fs.readdir(source, { withFileTypes: true });

	for (const entry of entries) {
		if (source === root && ignoredTopLevel.has(entry.name)) {
			continue;
		}
		if (machineSpecificFiles.has(entry.name)) {
			continue;
		}
		if (entry.name === 'README.md') {
			continue;
		}
		if (source === path.join(root, 'languages') && entry.name.endsWith('.pot')) {
			continue;
		}
		if (source === path.join(root, 'assets') && (entry.name === 'css' || entry.name === 'js')) {
			continue;
		}

		const sourcePath = path.join(source, entry.name);
		const targetPath = path.join(target, entry.name);

		if (entry.isDirectory()) {
			await copyDirectory(sourcePath, targetPath);
		} else if (entry.isFile()) {
			await fs.copyFile(sourcePath, targetPath);
		}
	}
}

async function pruneMachineSpecificFiles(target) {
	const entries = await fs.readdir(target, { withFileTypes: true });

	for (const entry of entries) {
		const absolute = path.join(target, entry.name);

		if (machineSpecificFiles.has(entry.name)) {
			await fs.rm(absolute, { force: true });
			continue;
		}

		if (entry.isDirectory()) {
			await pruneMachineSpecificFiles(absolute);
		}
	}
}

await fs.rm(releaseDir, { recursive: true, force: true });
await copyDirectory(root, stagingRoot);
await pruneMachineSpecificFiles(stagingRoot);
await execFileAsync('zip', ['-qr', zipPath, pluginSlug], { cwd: releaseDir });

console.log(`Created ${zipPath}`);
