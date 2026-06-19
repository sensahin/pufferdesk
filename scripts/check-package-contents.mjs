import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(
	await fs.readFile(path.join(root, 'package.json'), 'utf8')
);
const releaseRoot = path.join(root, 'release', manifest.name);
const zipPath = path.join(root, 'release', `${manifest.name}-${manifest.version}.zip`);

const requiredPaths = [
	'assets/dist/SOURCES.md',
	'assets/dist/css/pufferdesk-admin-chrome.min.css',
	'assets/dist/css/pufferdesk-core.min.css',
	'assets/dist/js/pufferdesk-admin-iframe.min.js',
	'assets/dist/js/pufferdesk.min.js',
	'languages/pufferdesk.pot',
	'pufferdesk.php',
	'readme.txt',
	'THIRD-PARTY-ASSETS.txt',
	'THIRD-PARTY-NOTICES.txt'
];

const forbiddenTopLevel = new Set([
	'.editorconfig',
	'.git',
	'.github',
	'.gitattributes',
	'.gitignore',
	'.phpcs.xml.dist',
	'AGENTS.md',
	'README.md',
	'composer.json',
	'composer.lock',
	'docs',
	'eslint.config.mjs',
	'node_modules',
	'package-lock.json',
	'package.json',
	'playwright.config.mjs',
	'scripts',
	'stylelint.config.cjs',
	'tests',
	'vendor'
]);

async function exists(target) {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

async function assertRequiredPath(relativePath) {
	if (!await exists(path.join(releaseRoot, relativePath))) {
		throw new Error(`Release package is missing ${relativePath}.`);
	}
}

async function assertForbiddenTopLevelAbsent(name) {
	if (await exists(path.join(releaseRoot, name))) {
		throw new Error(`Release package includes dev-only path ${name}.`);
	}
}

if (!await exists(zipPath)) {
	throw new Error(`Release zip was not created at ${zipPath}.`);
}

if (!await exists(releaseRoot)) {
	throw new Error(`Release staging directory was not created at ${releaseRoot}.`);
}

await Promise.all(requiredPaths.map(assertRequiredPath));
await Promise.all(Array.from(forbiddenTopLevel).map(assertForbiddenTopLevelAbsent));

console.log(`Release package contents verified for ${path.basename(zipPath)}.`);
