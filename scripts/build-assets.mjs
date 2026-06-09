import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = process.cwd();
const distDir = path.join(root, 'assets/dist');
const assetManifest = JSON.parse(await fs.readFile(path.join(root, 'assets/manifest.json'), 'utf8'));

const coreCssSources = readManifestSources(assetManifest.coreStyles, 'coreStyles');
const jsSources = readManifestSources(assetManifest.scripts, 'scripts');
const distCoreCss = assetManifest.dist?.coreCss || 'assets/dist/css/pufferdesk-core.min.css';
const distScript = assetManifest.dist?.script || 'assets/dist/js/pufferdesk-admin-desktop.min.js';

function readManifestSources(entries, key) {
	if (!Array.isArray(entries)) {
		throw new Error(`assets/manifest.json must define ${key} as an array`);
	}

	return entries.map((entry) => {
		if (!entry || typeof entry.path !== 'string' || entry.path === '') {
			throw new Error(`assets/manifest.json contains an invalid ${key} entry`);
		}

		return entry.path;
	});
}

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
	const banner = `/*! PufferDesk ${label}. Readable sources are included in the plugin. See assets/dist/SOURCES.md. */\n`;
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
		'# PufferDesk Built Asset Sources',
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
		outfile: distCoreCss,
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
		outfile: distScript,
		label: 'JavaScript'
	});

	await writeSourcesManifest(themeCssSources);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
