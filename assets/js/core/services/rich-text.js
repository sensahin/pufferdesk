(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	const tooltips = window.PufferDesk.tooltips || null;

	const commands = [
		{
			command: 'bold',
			id: 'bold',
			labelKey: 'bold',
			text: 'B'
		},
		{
			command: 'italic',
			id: 'italic',
			labelKey: 'italic',
			text: 'I'
		},
		{
			command: 'underline',
			id: 'underline',
			labelKey: 'underline',
			text: 'U'
		},
		{
			command: 'strikeThrough',
			id: 'strikeThrough',
			labelKey: 'strikethrough',
			text: 'ab'
		},
		{
			command: 'insertUnorderedList',
			icon: 'dashicons dashicons-editor-ul',
			id: 'unorderedList',
			labelKey: 'bulletList'
		},
		{
			command: 'insertImage',
			icon: 'dashicons dashicons-format-image',
			id: 'insertImage',
			labelKey: 'insertImage'
		}
	];

	const allowedTags = new Set([
		'A',
		'B',
		'BR',
		'DIV',
		'EM',
		'I',
		'IMG',
		'LI',
		'OL',
		'P',
		'S',
		'SPAN',
		'STRIKE',
		'STRONG',
		'U',
		'UL'
	]);
	const allowedAttributes = new Set([ 'alt', 'href', 'rel', 'src', 'target', 'title' ]);
	const uriAttributes = new Set([ 'href', 'src' ]);

	function getLabel(labels, key, fallback) {
		return labels && typeof labels[key] === 'string' && labels[key] ? labels[key] : (fallback || key);
	}

	function isSafeUrl(value) {
		if (!value) {
			return false;
		}

		try {
			const url = new URL(value, window.location.href);

			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch (error) {
			return false;
		}
	}

	function sanitizeElement(element) {
		Array.from(element.children).forEach((child) => {
			sanitizeElement(child);
		});

		if (!allowedTags.has(element.tagName)) {
			element.replaceWith(...Array.from(element.childNodes));
			return;
		}

		Array.from(element.attributes).forEach((attribute) => {
			const name = attribute.name.toLowerCase();
			const value = attribute.value;

			if (!allowedAttributes.has(name) || name.startsWith('on')) {
				element.removeAttribute(attribute.name);
				return;
			}

			if (uriAttributes.has(name) && !isSafeUrl(value)) {
				element.removeAttribute(attribute.name);
			}
		});

		if (element.tagName === 'A' && element.hasAttribute('target')) {
			element.setAttribute('rel', 'noopener noreferrer');
		}
	}

	function sanitizeHTML(html) {
		const template = document.createElement('template');

		template.innerHTML = String(html || '');
		Array.from(template.content.children).forEach((element) => {
			sanitizeElement(element);
		});

		return template.innerHTML;
	}

	function isMeaningfulHTML(html) {
		const template = document.createElement('template');

		template.innerHTML = sanitizeHTML(html);

		return Boolean((template.content.textContent || '').trim() || template.content.querySelector('img'));
	}

	function normalizeEditor(editor) {
		if (!editor || !editor.isContentEditable) {
			return;
		}

		if (!isMeaningfulHTML(editor.innerHTML)) {
			editor.replaceChildren();
		}
	}

	function getHTML(editor) {
		if (!editor) {
			return '';
		}

		normalizeEditor(editor);

		return sanitizeHTML(editor.innerHTML || '');
	}

	function setHTML(editor, html) {
		if (!editor) {
			return;
		}

		editor.innerHTML = sanitizeHTML(html);
		normalizeEditor(editor);
	}

	function getText(editor) {
		if (!editor) {
			return '';
		}

		return String(editor.textContent || '').replace(/\s+/g, ' ').trim();
	}

	function hasContent(editor) {
		return Boolean(getText(editor) || (editor && editor.querySelector && editor.querySelector('img')));
	}

	function dispatchInput(editor) {
		if (!editor) {
			return;
		}

		editor.dispatchEvent(new Event('input', {
			bubbles: true
		}));
	}

	function createEditor(options = {}) {
		const editor = document.createElement('div');
		const className = typeof options.className === 'string' && options.className ? options.className : 'pdk-rich-text-editor';

		editor.className = `${className} pdk-rich-text-editor`;
		editor.contentEditable = 'true';
		editor.role = 'textbox';
		editor.spellcheck = options.spellcheck !== false;
		editor.setAttribute('aria-multiline', 'true');
		if (options.label) {
			editor.setAttribute('aria-label', options.label);
		}
		if (options.placeholder) {
			editor.dataset.placeholder = options.placeholder;
		}

		Object.defineProperty(editor, 'value', {
			get() {
				return getHTML(editor);
			},
			set(value) {
				setHTML(editor, value);
			}
		});
		Object.defineProperty(editor, 'placeholder', {
			get() {
				return editor.dataset.placeholder || '';
			},
			set(value) {
				editor.dataset.placeholder = value || '';
			}
		});

		setHTML(editor, options.html || '');
		editor.addEventListener('input', () => normalizeEditor(editor));
		editor.addEventListener('paste', (event) => {
			const clipboard = event.clipboardData || window.clipboardData;
			const text = clipboard && typeof clipboard.getData === 'function' ? clipboard.getData('text/plain') : '';

			if (!text) {
				return;
			}

			event.preventDefault();
			insertText(editor, text);
		});

		return editor;
	}

	function focusEditor(editor) {
		if (!editor || typeof editor.focus !== 'function') {
			return;
		}

		try {
			editor.focus({
				preventScroll: true
			});
		} catch (error) {
			editor.focus();
		}
	}

	function insertText(editor, text) {
		focusEditor(editor);
		document.execCommand('insertText', false, String(text || ''));
		normalizeEditor(editor);
		dispatchInput(editor);
	}

	function applyCommand(editor, commandId, options = {}) {
		const definition = commands.find((item) => item.id === commandId || item.command === commandId);
		const labels = options.labels && typeof options.labels === 'object' ? options.labels : {};

		if (!definition || !editor) {
			return false;
		}

		focusEditor(editor);

		if (definition.command === 'insertImage') {
			const promptLabel = getLabel(labels, 'imageUrlPrompt', 'imageUrlPrompt');
			const url = window.prompt ? window.prompt(promptLabel, '') : '';

			if (!isSafeUrl(url)) {
				return false;
			}

			document.execCommand('insertImage', false, url);
		} else {
			document.execCommand('styleWithCSS', false, false);
			document.execCommand(definition.command, false, null);
		}

		normalizeEditor(editor);
		dispatchInput(editor);

		return true;
	}

	function createToolbarButton(definition, labels = {}) {
		const button = document.createElement('button');
			const label = getLabel(labels, definition.labelKey);
		const content = document.createElement('span');

		button.className = 'pdk-rich-text-command';
		button.type = 'button';
		button.dataset.pdkRichTextCommand = definition.id;
		button.setAttribute('aria-label', label);
		content.className = definition.icon ? `pdk-rich-text-command-icon ${definition.icon}` : 'pdk-rich-text-command-label';
		content.textContent = definition.icon ? '' : definition.text;
		button.appendChild(content);
		if (tooltips && typeof tooltips.attach === 'function') {
			tooltips.attach(button, label, {
				className: 'pdk-rich-text-tooltip',
				surface: 'rich-text'
			});
		}

		return button;
	}

	function createToolbar(options = {}) {
		const labels = options.labels && typeof options.labels === 'object' ? options.labels : {};
		const toolbar = document.createElement('div');
		const className = typeof options.className === 'string' && options.className ? options.className : 'pdk-rich-text-toolbar';

		toolbar.className = `${className} pdk-rich-text-toolbar`;
		toolbar.append(...commands.map((definition) => createToolbarButton(definition, labels)));

		return toolbar;
	}

	function selectionIsInside(editor) {
		const selection = window.getSelection ? window.getSelection() : null;

		if (!selection || !selection.rangeCount || !editor) {
			return false;
		}

		const node = selection.anchorNode;

		return node === editor || editor.contains(node);
	}

	function updateToolbarState(toolbar, editor) {
		if (!toolbar || !editor || !selectionIsInside(editor)) {
			return;
		}

		commands.forEach((definition) => {
			const button = toolbar.querySelector(`[data-pdk-rich-text-command="${definition.id}"]`);
			if (!button) {
				return;
			}

			let active = false;
			try {
				active = document.queryCommandState(definition.command);
			} catch (error) {
				active = false;
			}

			button.classList.toggle('is-active', Boolean(active));
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		});
	}

	function bindToolbar(toolbar, editor, options = {}) {
		if (!toolbar || !editor) {
			return () => {};
		}

		function onPointerDown(event) {
			const button = event.target.closest('[data-pdk-rich-text-command]');

			if (!button || !toolbar.contains(button)) {
				return;
			}

			event.preventDefault();
		}

		function onClick(event) {
			const button = event.target.closest('[data-pdk-rich-text-command]');

			if (!button || !toolbar.contains(button)) {
				return;
			}

			applyCommand(editor, button.dataset.pdkRichTextCommand, options);
			updateToolbarState(toolbar, editor);
		}

		function refreshState() {
			updateToolbarState(toolbar, editor);
		}

		toolbar.addEventListener('pointerdown', onPointerDown);
		toolbar.addEventListener('click', onClick);
		editor.addEventListener('keyup', refreshState);
		editor.addEventListener('mouseup', refreshState);
		editor.addEventListener('input', refreshState);
		document.addEventListener('selectionchange', refreshState);
		refreshState();

		return function cleanup() {
			toolbar.removeEventListener('pointerdown', onPointerDown);
			toolbar.removeEventListener('click', onClick);
			editor.removeEventListener('keyup', refreshState);
			editor.removeEventListener('mouseup', refreshState);
			editor.removeEventListener('input', refreshState);
			document.removeEventListener('selectionchange', refreshState);
		};
	}

	window.PufferDesk.richText = Object.freeze({
		applyCommand,
		bindToolbar,
		createEditor,
		createToolbar,
		getHTML,
		getText,
		hasContent,
		sanitizeHTML,
		setHTML
	});
})();
