import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(
	await fs.readFile(path.join(root, 'package.json'), 'utf8')
);
const releaseRoot = path.join(root, 'release', manifest.name);
const zipPath = path.join(root, 'release', `${manifest.name}-${manifest.version}.zip`);

const sizeBudgets = {
	distAdminChromeCss: 8 * 1024,
	distCoreCss: 260 * 1024,
	distIframeScript: 12 * 1024,
	distScript: 900 * 1024,
	distThemeCss: 160 * 1024,
	media: 180 * 1024,
	releaseStaging: 2800 * 1024,
	zip: 640 * 1024
};

const requiredPaths = [
	'assets/blueprints/blueprint.json',
	'assets/dist/SOURCES.md',
	'assets/dist/css/pufferdesk-admin-chrome.min.css',
	'assets/dist/css/pufferdesk-core.min.css',
	'assets/dist/js/pufferdesk-admin-iframe.min.js',
	'assets/dist/js/pufferdesk.min.js',
	'pufferdesk.php',
	'readme.txt',
	'THIRD-PARTY-ASSETS.txt',
	'THIRD-PARTY-NOTICES.txt'
];

const forbiddenPaths = [
	'assets/css',
	'assets/js',
	'languages/pufferdesk.pot'
];

const forbiddenBasenames = new Set([
	'.DS_Store',
	'Thumbs.db',
	'desktop.ini'
]);

const forbiddenReleaseExtensions = new Set([
	'.map',
	'.log',
	'.sql',
	'.sqlite',
	'.sqlite3',
	'.zip'
]);

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

async function statSize(target) {
	const stats = await fs.stat(target);

	return stats.size;
}

async function directorySize(target) {
	if (!await exists(target)) {
		return 0;
	}

	const entries = await fs.readdir(target, { withFileTypes: true });
	let total = 0;

	for (const entry of entries) {
		const absolute = path.join(target, entry.name);
		if (entry.isDirectory()) {
			total += await directorySize(absolute);
		} else if (entry.isFile()) {
			total += await statSize(absolute);
		}
	}

	return total;
}

async function listFiles(target) {
	if (!await exists(target)) {
		return [];
	}

	const entries = await fs.readdir(target, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolute = path.join(target, entry.name);
		if (entry.isDirectory()) {
			files.push(...await listFiles(absolute));
		} else if (entry.isFile()) {
			files.push(absolute);
		}
	}

	return files;
}

function formatBytes(bytes) {
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
	}

	return `${Math.ceil(bytes / 1024)} KiB`;
}

async function assertSizeBudget(label, target, maxBytes) {
	const bytes = await statSize(target);

	if (bytes > maxBytes) {
		throw new Error(`${label} is ${formatBytes(bytes)}, over the ${formatBytes(maxBytes)} budget.`);
	}
}

async function assertDirectorySizeBudget(label, target, maxBytes) {
	const bytes = await directorySize(target);

	if (bytes > maxBytes) {
		throw new Error(`${label} is ${formatBytes(bytes)}, over the ${formatBytes(maxBytes)} budget.`);
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

async function assertForbiddenPathAbsent(relativePath) {
	if (await exists(path.join(releaseRoot, relativePath))) {
		throw new Error(`Release package includes source-only path ${relativePath}.`);
	}
}

async function assertNoForbiddenFiles() {
	const releaseFiles = await listFiles(releaseRoot);

	for (const file of releaseFiles) {
		const basename = path.basename(file);
		const extension = path.extname(file).toLowerCase();
		const relativePath = path.relative(releaseRoot, file);

		if (forbiddenBasenames.has(basename)) {
			throw new Error(`Release package includes machine-specific file ${relativePath}.`);
		}

		if (forbiddenReleaseExtensions.has(extension)) {
			throw new Error(`Release package includes forbidden file type ${relativePath}.`);
		}
	}
}

async function assertMediaReferences() {
	const mediaRoot = path.join(releaseRoot, 'assets/media');
	const mediaFiles = (await listFiles(mediaRoot)).filter((file) => {
		const basename = path.basename(file);

		return basename !== 'index.php' && basename !== 'README.md' && !forbiddenBasenames.has(basename);
	});

	if (!mediaFiles.length) {
		return;
	}

	const searchableFiles = (await listFiles(releaseRoot)).filter((file) => {
		const extension = path.extname(file).toLowerCase();

		return ['.php', '.txt', '.md', '.css', '.js', '.json'].includes(extension);
	});
	const searchableText = (await Promise.all(searchableFiles.map((file) => fs.readFile(file, 'utf8').catch(() => '')))).join('\n');
	const unused = mediaFiles.filter((file) => {
		const relativeMediaPath = path.relative(path.join(releaseRoot, 'assets/media'), file).replaceAll(path.sep, '/');
		const basename = path.basename(file);

		return !searchableText.includes(relativeMediaPath) && !searchableText.includes(basename);
	});

	if (unused.length) {
		throw new Error(`Release package includes unreferenced media: ${unused.map((file) => path.relative(releaseRoot, file)).join(', ')}.`);
	}
}

async function assertBlueprint() {
	const blueprintPath = path.join(releaseRoot, 'assets/blueprints/blueprint.json');
	const blueprint = JSON.parse(await fs.readFile(blueprintPath, 'utf8'));

	if (blueprint.$schema !== 'https://playground.wordpress.net/blueprint-schema.json') {
		throw new Error('WordPress.org preview blueprint must declare the Playground schema.');
	}

	if (blueprint.landingPage !== '/wp-admin/admin.php?page=pufferdesk') {
		throw new Error('WordPress.org preview blueprint must land on the PufferDesk shell.');
	}

	const installStep = Array.isArray(blueprint.steps)
		? blueprint.steps.find((step) => step && step.step === 'installPlugin')
		: null;
	const loginStep = Array.isArray(blueprint.steps)
		? blueprint.steps.find((step) => step && step.step === 'login')
		: null;

	if (
		!installStep
		|| installStep.pluginData?.resource !== 'wordpress.org/plugins'
		|| installStep.pluginData?.slug !== 'pufferdesk'
		|| installStep.options?.activate !== true
	) {
		throw new Error('WordPress.org preview blueprint must install and activate pufferdesk from wordpress.org/plugins.');
	}

	if (!loginStep) {
		throw new Error('WordPress.org preview blueprint must log the preview user in before landing in wp-admin.');
	}
}

if (!await exists(zipPath)) {
	throw new Error(`Release zip was not created at ${zipPath}.`);
}

if (!await exists(releaseRoot)) {
	throw new Error(`Release staging directory was not created at ${releaseRoot}.`);
}

await Promise.all(requiredPaths.map(assertRequiredPath));
await assertBlueprint();
await Promise.all(Array.from(forbiddenTopLevel).map(assertForbiddenTopLevelAbsent));
await Promise.all(forbiddenPaths.map(assertForbiddenPathAbsent));
await assertNoForbiddenFiles();
await assertMediaReferences();
await Promise.all([
	assertSizeBudget('Release zip', zipPath, sizeBudgets.zip),
	assertSizeBudget('Main dist JavaScript', path.join(releaseRoot, 'assets/dist/js/pufferdesk.min.js'), sizeBudgets.distScript),
	assertSizeBudget('Iframe dist JavaScript', path.join(releaseRoot, 'assets/dist/js/pufferdesk-admin-iframe.min.js'), sizeBudgets.distIframeScript),
	assertSizeBudget('Core dist CSS', path.join(releaseRoot, 'assets/dist/css/pufferdesk-core.min.css'), sizeBudgets.distCoreCss),
	assertSizeBudget('Admin chrome dist CSS', path.join(releaseRoot, 'assets/dist/css/pufferdesk-admin-chrome.min.css'), sizeBudgets.distAdminChromeCss),
	assertSizeBudget('Default theme dist CSS', path.join(releaseRoot, 'assets/dist/css/themes/default/default.min.css'), sizeBudgets.distThemeCss),
	assertDirectorySizeBudget('Release media', path.join(releaseRoot, 'assets/media'), sizeBudgets.media),
	assertDirectorySizeBudget('Release staging directory', releaseRoot, sizeBudgets.releaseStaging)
]);

console.log(`Release package contents verified for ${path.basename(zipPath)}.`);
