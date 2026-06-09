import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const releaseDir = path.join(root, 'release');
const stagingRoot = path.join(releaseDir, 'pufferdesk-admin-desktop');
const zipPath = path.join(releaseDir, `pufferdesk-admin-desktop-${manifest.version}.zip`);

const ignoredTopLevel = new Set([
	'.git',
	'.github',
	'.gitattributes',
	'.gitignore',
	'AGENTS.md',
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

		const sourcePath = path.join(source, entry.name);
		const targetPath = path.join(target, entry.name);

		if (entry.isDirectory()) {
			await copyDirectory(sourcePath, targetPath);
		} else if (entry.isFile()) {
			await fs.copyFile(sourcePath, targetPath);
		}
	}
}

await fs.rm(releaseDir, { recursive: true, force: true });
await copyDirectory(root, stagingRoot);
await execFileAsync('zip', ['-qr', zipPath, 'pufferdesk-admin-desktop'], { cwd: releaseDir });

console.log(`Created ${zipPath}`);
