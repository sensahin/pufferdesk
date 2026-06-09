(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	function getLabels(config = {}) {
		const documents = config.documents && typeof config.documents === 'object' ? config.documents : {};

		return documents.labels && typeof documents.labels === 'object' ? documents.labels : {};
	}

	function createButton(className, label, text) {
		const button = document.createElement('button');
		button.className = className;
		button.type = 'button';
		button.setAttribute('aria-label', label);
		button.textContent = text;

		return button;
	}

	window.PufferDesk.apps.createStickyNotesApp = function createStickyNotesApp(context = {}) {
		const config = context.config || (window.PufferDesk.config ? window.PufferDesk.config.get() : {});
		const labels = getLabels(config);
		const root = document.createElement('div');
		const toolbar = document.createElement('div');
		const list = document.createElement('div');
		const status = document.createElement('div');
		const newButton = createButton('pdk-sticky-notes-app-new', 'New Sticky Note', 'New Note');
		const manager = window.PufferDesk.stickyNoteManager || null;
		const documentStore = context.documentStore || (window.PufferDesk.documents ? window.PufferDesk.documents.createDocumentStore(config) : null);

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : 'sticky_note';
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
				return documentStore.list(getStickyKind());
			}

			return Promise.resolve([]);
		}

		function renderList(notes) {
			list.replaceChildren();

			if (!notes.length) {
				const empty = document.createElement('p');
				empty.className = 'pdk-sticky-notes-app-empty';
				empty.textContent = getLabel('noStickyNotes', 'No sticky notes');
				list.appendChild(empty);
				return;
			}

			notes.forEach((note) => {
				const item = document.createElement('div');
				const title = document.createElement('span');
				const actions = document.createElement('div');
				const showButton = createButton('pdk-sticky-notes-app-button', getLabel('show', 'Show'), getLabel('show', 'Show'));
				const deleteButton = createButton('pdk-sticky-notes-app-button', getLabel('delete', 'Delete'), getLabel('delete', 'Delete'));

				item.className = 'pdk-sticky-notes-app-item';
				title.className = 'pdk-sticky-notes-app-title';
				title.textContent = note.title || getLabel('stickyNote', 'Sticky Note');
				actions.className = 'pdk-sticky-notes-app-actions';
				actions.append(showButton, deleteButton);
				item.append(title, actions);
				list.appendChild(item);

				showButton.addEventListener('click', () => {
					if (manager && typeof manager.showNote === 'function') {
						manager.showNote(note.id);
					}
				});
				deleteButton.addEventListener('click', () => {
					if (window.confirm && !window.confirm(getLabel('deleteStickyNote', 'Delete this note?'))) {
						return;
					}
					const request = manager && typeof manager.deleteNote === 'function'
						? manager.deleteNote(note.id)
						: documentStore.remove(note.id);

					Promise.resolve(request).then(refresh);
				});
			});
		}

		function refresh() {
			setStatus(getLabel('loading', 'Loading...'));

			const restore = manager && typeof manager.restore === 'function' ? manager.restore() : Promise.resolve([]);

			return Promise.resolve(restore).then(getNotes).then((notes) => {
				renderList(notes);
				setStatus('');
				return notes;
			}).catch((error) => {
				setStatus(error && error.message ? error.message : getLabel('couldNotLoadStickyNotes', 'Could not load sticky notes.'), 'error');
				return [];
			});
		}

		root.className = 'pdk-sticky-notes-app';
		toolbar.className = 'pdk-sticky-notes-app-toolbar';
		list.className = 'pdk-sticky-notes-app-list';
		status.className = 'pdk-sticky-notes-app-status';
		toolbar.appendChild(newButton);
		root.append(toolbar, list, status);

		newButton.addEventListener('click', () => {
			const request = manager && typeof manager.createStickyNote === 'function'
				? manager.createStickyNote()
				: documentStore.create({
					content: '',
					kind: getStickyKind(),
					title: getLabel('stickyNote', 'Sticky Note')
				});

			Promise.resolve(request).then(refresh);
		});

		refresh();

		return root;
	};

	if (typeof window.PufferDesk.apps.registerNativeAppRenderer === 'function') {
		window.PufferDesk.apps.registerNativeAppRenderer('sticky-notes', ({ config }) => {
			const labels = getLabels(config);
			const title = typeof labels.stickyNotes === 'string' && labels.stickyNotes ? labels.stickyNotes : 'Sticky Notes';

			return {
				bodyClass: 'pdk-window-body pdk-sticky-notes-app-body',
				content: window.PufferDesk.apps.createStickyNotesApp({ config }),
				height: '420px',
				resizeMode: 'vertical',
				title,
				titlebarLabel: title,
				width: '360px'
			};
		});
	}
})();
