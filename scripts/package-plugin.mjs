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

const ignoredTopLevel = new Set([
	'.git',
	'.github',
	'.gitattributes',
	'.gitignore',
	'AGENTS.md',
	'README.md',
	'THIRD-PARTY-ASSETS.txt',
	'THIRD-PARTY-NOTICES.txt',
	'docs',
	'node_modules',
	'release'
]);

async function copyDirectory(source, target) {
	await fs.mkdir(target, { recursive: true });
	const entries = await fs.readdir(source, { withFileTypes: true });

	for (const entry of entries) {
		if (source === root && ignoredTopLevel.has(entry.name)) {
			continue;
		}
		if (entry.name === '.DS_Store') {
			continue;
		}
		if (entry.name === 'README.md') {
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

async function renameMainPluginFile() {
	const oldMainFile = path.join(stagingRoot, 'pufferdesk-admin-desktop.php');
	const newMainFile = path.join(stagingRoot, `${pluginSlug}.php`);

	try {
		await fs.rename(oldMainFile, newMainFile);
	} catch (error) {
		if (error && error.code === 'ENOENT') {
			return;
		}

		throw error;
	}
}

await fs.rm(releaseDir, { recursive: true, force: true });
await copyDirectory(root, stagingRoot);
await renameMainPluginFile();
await execFileAsync('zip', ['-qr', zipPath, pluginSlug], { cwd: releaseDir });

console.log(`Created ${zipPath}`);
