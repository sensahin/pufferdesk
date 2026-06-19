import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(root, 'assets/js/core/services/rich-text.js'), 'utf8');

function createRichTextService() {
	const dom = new JSDOM('<!doctype html><html><body></body></html>', {
		runScripts: 'outside-only',
		url: 'https://example.test/wp-admin/admin.php'
	});

	dom.window.PufferDesk = {
		tooltips: {
			applyTriggerAttributes() {}
		}
	};
	dom.window.eval(source);

	return dom.window.PufferDesk.richText;
}

test('rich text sanitizer removes scriptable markup and unsafe urls', () => {
	const richText = createRichTextService();
	const sanitized = richText.sanitizeHTML(`
		<p onclick="alert(1)">Hello <strong>there</strong></p>
		<script>alert(1)</script>
		<a href="javascript:alert(1)" target="_blank" onmouseover="alert(2)">Bad link</a>
		<img src="data:text/html;base64,PHNjcmlwdA==" onerror="alert(3)" alt="bad" />
	`);

	assert.doesNotMatch(sanitized, /<script/i);
	assert.doesNotMatch(sanitized, /onerror|onclick|onmouseover/i);
	assert.doesNotMatch(sanitized, /javascript:/i);
	assert.doesNotMatch(sanitized, /data:text\/html/i);
	assert.match(sanitized, /<strong>there<\/strong>/);
});

test('rich text sanitizer preserves safe links and adds noopener noreferrer for new tabs', () => {
	const richText = createRichTextService();
	const sanitized = richText.sanitizeHTML('<a href="/wp-admin/post.php" target="_blank">Edit</a>');

	assert.match(sanitized, /href="\/wp-admin\/post.php"/);
	assert.match(sanitized, /target="_blank"/);
	assert.match(sanitized, /rel="noopener noreferrer"/);
});
