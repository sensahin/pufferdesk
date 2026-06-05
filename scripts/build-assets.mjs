import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = process.cwd();
const distDir = path.join(root, 'assets/dist');

const coreCssSources = [
	'assets/css/core/admin-chrome.css',
	'assets/css/core/shell.css',
	'assets/css/core/dialogs.css',
	'assets/css/core/context-menu.css',
	'assets/css/core/desktop.css',
	'assets/css/core/widgets.css',
	'assets/css/core/windows.css',
	'assets/css/core/apps.css',
	'assets/css/core/dock.css',
	'assets/css/core/responsive.css'
];

const jsSources = [
	'assets/js/core/config.js',
	'assets/js/core/dom.js',
	'assets/js/core/services/storage.js',
	'assets/js/core/services/api-client.js',
	'assets/js/core/session/session-store.js',
	'assets/js/core/session/reopen-policy.js',
	'assets/js/core/appearance.js',
	'assets/js/core/windows/window-factory.js',
	'assets/js/core/windows/window-manager.js',
	'assets/js/core/widgets/widget-manager.js',
	'assets/js/core/apps/about-window.js',
	'assets/js/core/apps/settings-app.js',
	'assets/js/core/apps/app-launcher.js',
	'assets/js/core/shell/search.js',
	'assets/js/core/shell/dialogs.js',
	'assets/js/core/shell/commands.js',
	'assets/js/core/shell/menu-schema.js',
	'assets/js/core/shell/menu-renderer.js',
	'assets/js/core/shell/menu.js',
	'assets/js/core/shell/context-menu.js',
	'assets/js/core/shell/clock.js',
	'assets/js/core/boot.js'
];

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		return false;
	}
}

async function readSources(sources) {
	const chunks = [];

	for (const source of sources) {
		const absolute = path.join(root, source);
		if (!(await fileExists(absolute))) {
			throw new Error(`Missing source file: ${source}`);
		}

		chunks.push(`\n/* Source: ${source} */\n${await fs.readFile(absolute, 'utf8')}`);
	}

	return chunks.join('\n');
}

async function minify({ loader, sources, outfile, label }) {
	const code = await readSources(sources);
	const result = await esbuild.transform(code, {
		loader,
		minify: true,
		legalComments: 'none'
	});
	const banner = `/*! Admin OS Mode ${label}. Readable sources are included in the plugin. See assets/dist/SOURCES.md. */\n`;
	const target = path.join(root, outfile);

	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, `${banner}${result.code}`, 'utf8');
}

async function findThemeCss(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolute = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...await findThemeCss(absolute));
		} else if (entry.isFile() && entry.name.endsWith('.css')) {
			files.push(path.relative(root, absolute));
		}
	}

	return files.sort();
}

function distThemePath(source) {
	const relative = source.replace(/^assets\/css\/themes\//, '').replace(/\.css$/, '.min.css');
	return `assets/dist/css/themes/${relative}`;
}

async function writeSourcesManifest(themeCssSources) {
	const lines = [
		'# Admin OS Mode Built Asset Sources',
		'',
		'Generated release assets are minified for performance. Readable source files remain in the plugin and are listed below.',
		'',
		'## Core CSS',
		...coreCssSources.map((source) => `- ${source}`),
		'',
		'## Theme CSS',
		...themeCssSources.map((source) => `- ${source} -> ${distThemePath(source)}`),
		'',
		'## JavaScript',
		...jsSources.map((source) => `- ${source}`)
	];

	await fs.writeFile(path.join(distDir, 'SOURCES.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
	await fs.rm(distDir, { recursive: true, force: true });

	const themeCssSources = await findThemeCss(path.join(root, 'assets/css/themes'));

	await minify({
		loader: 'css',
		sources: coreCssSources,
		outfile: 'assets/dist/css/admin-os-mode-core.min.css',
		label: 'core CSS'
	});

	for (const source of themeCssSources) {
		await minify({
			loader: 'css',
			sources: [source],
			outfile: distThemePath(source),
			label: `theme CSS from ${source}`
		});
	}

	await minify({
		loader: 'js',
		sources: jsSources,
		outfile: 'assets/dist/js/admin-os-mode.min.js',
		label: 'JavaScript'
	});

	await writeSourcesManifest(themeCssSources);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
