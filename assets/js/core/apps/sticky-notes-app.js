(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	function getLabels(config = {}) {
		const documents = config.documents && typeof config.documents === 'object' ? config.documents : {};

		return documents.labels && typeof documents.labels === 'object' ? documents.labels : {};
	}

	function getAppLabel(config = {}, appId = '') {
		const apps = Array.isArray(config.apps) ? config.apps : [];
		const app = apps.find((candidate) => candidate && candidate.id === appId);

		return app && typeof app.label === 'string' ? app.label : '';
	}

	function createButton(className, label, text) {
		const button = document.createElement('button');
		button.className = className;
		button.type = 'button';
		button.setAttribute('aria-label', label);
		button.textContent = text;

		return button;
	}

	function createNewButton(label, text) {
		const button = createButton('pdk-sticky-notes-app-new', label, '');
		const symbol = document.createElement('span');
		const buttonLabel = document.createElement('span');

		symbol.className = 'pdk-sticky-notes-app-new-symbol';
		symbol.textContent = '+';
		buttonLabel.className = 'pdk-sticky-notes-app-new-label';
		buttonLabel.textContent = text;
		button.append(symbol, buttonLabel);

		return button;
	}

	function toPlainText(content) {
		const container = document.createElement('div');

		container.innerHTML = String(content || '');

		return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim();
	}

	function formatTime(value) {
		const date = value ? new Date(value) : null;

		if (!date || Number.isNaN(date.getTime())) {
			return '';
		}

		return new Intl.DateTimeFormat([], {
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	function normalizeNoteColor(color) {
		return window.PufferDesk.documents && typeof window.PufferDesk.documents.normalizeStickyNoteColor === 'function'
			? window.PufferDesk.documents.normalizeStickyNoteColor(color)
			: 'yellow';
	}

	window.PufferDesk.apps.createStickyNotesApp = function createStickyNotesApp(context = {}) {
		const config = context.config || (window.PufferDesk.config ? window.PufferDesk.config.get() : {});
		const labels = getLabels(config);
		const root = document.createElement('div');
		const toolbar = document.createElement('div');
		const heading = document.createElement('h2');
		const search = document.createElement('label');
		const searchInput = document.createElement('input');
		const list = document.createElement('div');
		const status = document.createElement('div');
		const manager = window.PufferDesk.stickyNoteManager || null;
		const documentStore = context.documentStore || (window.PufferDesk.documents ? window.PufferDesk.documents.createDocumentStore(config) : null);
		const newButton = createNewButton(getLabel('newStickyNote'), getLabel('newNote'));
		let currentNotes = [];

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : (fallback || key);
		}

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
		}

		function noteMatchesQuery(note, query) {
			if (!query) {
				return true;
			}

			const haystack = [
				note && note.title ? note.title : '',
				note && note.content ? toPlainText(note.content) : ''
			].join(' ').toLowerCase();

			return haystack.includes(query);
		}

		function renderNoteItem(note) {
			const item = document.createElement('article');
			const openButton = document.createElement('button');
			const preview = document.createElement('span');
			const time = document.createElement('span');
			const actions = document.createElement('div');
			const showButton = createButton('pdk-sticky-notes-app-button', getLabel('show'), getLabel('show'));
			const deleteButton = createButton('pdk-sticky-notes-app-button', getLabel('delete'), getLabel('delete'));
			const previewText = toPlainText(note.content) || getLabel('stickyPlaceholder');
			const modifiedTime = formatTime(note.modified || note.created);

			item.className = 'pdk-sticky-notes-app-item';
			item.dataset.pdkStickyColor = normalizeNoteColor(note.color);
			openButton.className = 'pdk-sticky-notes-app-preview';
			openButton.type = 'button';
			openButton.setAttribute('aria-label', previewText);
			preview.className = 'pdk-sticky-notes-app-title';
			preview.textContent = previewText;
			time.className = 'pdk-sticky-notes-app-time';
			time.textContent = modifiedTime;
			actions.className = 'pdk-sticky-notes-app-actions';
			actions.append(showButton, deleteButton);
			openButton.append(preview, time);
			item.append(openButton, actions);

			function showNote() {
				if (manager && typeof manager.showNote === 'function') {
					manager.showNote(note.id);
				}
			}

			openButton.addEventListener('click', showNote);
			showButton.addEventListener('click', showNote);
			deleteButton.addEventListener('click', () => {
				if (window.confirm && !window.confirm(getLabel('deleteStickyNote'))) {
					return;
				}
				const request = manager && typeof manager.deleteNote === 'function'
					? manager.deleteNote(note.id)
					: documentStore.remove(note.id);

				Promise.resolve(request).then(refresh);
			});

			return item;
		}

		function setStatus(message, tone = '') {
			status.textContent = message || '';
			status.dataset.pdkTone = tone;
		}

		function getNotes() {
			if (manager && typeof manager.getNotes === 'function') {
				return Promise.resolve(manager.getNotes());
			}

			if (documentStore && typeof documentStore.list === 'function') {
				return documentStore.list(getStickyKind(), {
					includeAllFolders: true
				});
			}

			return Promise.resolve([]);
		}

		function renderList(notes) {
			const query = searchInput.value.trim().toLowerCase();
			const filteredNotes = notes.filter((note) => noteMatchesQuery(note, query));

			list.replaceChildren();

			if (!filteredNotes.length) {
				const empty = document.createElement('p');
				empty.className = 'pdk-sticky-notes-app-empty';
				empty.textContent = notes.length ? getLabel('noSearchResults') : getLabel('noStickyNotes');
				list.appendChild(empty);
				return;
			}

			filteredNotes.forEach((note) => {
				list.appendChild(renderNoteItem(note));
			});
		}

		function refresh() {
			setStatus(getLabel('loading'));

			const restore = manager && typeof manager.restore === 'function' ? manager.restore() : Promise.resolve([]);

			return Promise.resolve(restore).then(getNotes).then((notes) => {
				currentNotes = notes;
				renderList(currentNotes);
				setStatus('');
				return notes;
			}).catch((error) => {
				setStatus(error && error.message ? error.message : getLabel('couldNotLoadStickyNotes'), 'error');
				return [];
			});
		}

		root.className = 'pdk-sticky-notes-app';
		toolbar.className = 'pdk-sticky-notes-app-toolbar';
		heading.className = 'pdk-sticky-notes-app-heading';
		heading.textContent = getLabel('stickyNotes');
		search.className = 'pdk-sticky-notes-app-search';
		searchInput.className = 'pdk-sticky-notes-app-search-input';
		searchInput.type = 'search';
		searchInput.placeholder = getLabel('searchPlaceholder');
		searchInput.setAttribute('aria-label', getLabel('search'));
		search.appendChild(searchInput);
		list.className = 'pdk-sticky-notes-app-list';
		status.className = 'pdk-sticky-notes-app-status';
		toolbar.appendChild(newButton);
		root.append(toolbar, heading, search, list, status);

		newButton.addEventListener('click', () => {
			const request = manager && typeof manager.createStickyNote === 'function'
				? manager.createStickyNote()
				: documentStore.create({
					content: '',
					kind: getStickyKind(),
					title: getLabel('stickyNote')
				});

			Promise.resolve(request).then(refresh);
		});
		searchInput.addEventListener('input', () => renderList(currentNotes));

		refresh();

		return root;
	};

	if (typeof window.PufferDesk.apps.registerNativeAppRenderer === 'function') {
		const nativeIds = window.PufferDesk.apps.nativeIds || {};
		window.PufferDesk.apps.registerNativeAppRenderer(nativeIds.STICKY_NOTES, ({ config }) => {
			const labels = getLabels(config);
			const appIds = window.PufferDesk.apps.ids || {};
			const theme = config && config.theme && typeof config.theme === 'object' ? config.theme : {};
			const isRedmond = theme.family === 'redmond';
			const title = getAppLabel(config, appIds.STICKY_NOTES) || (typeof labels.stickyNotes === 'string' && labels.stickyNotes ? labels.stickyNotes : 'stickyNotes');

			return {
				bodyClass: 'pdk-window-body pdk-sticky-notes-app-body',
				content: window.PufferDesk.apps.createStickyNotesApp({ config }),
				height: isRedmond ? '565px' : '420px',
				resizeMode: 'vertical',
				title,
				titlebarLabel: title,
				width: isRedmond ? '554px' : '360px'
			};
		});
	}
})();
