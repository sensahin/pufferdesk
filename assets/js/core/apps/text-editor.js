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

	window.PufferDesk.apps.createTextEditorApp = function createTextEditorApp(context = {}) {
		const config = context.config || (window.PufferDesk.config ? window.PufferDesk.config.get() : {});
		const labels = getLabels(config);
		const documentStore = context.documentStore || (window.PufferDesk.documents ? window.PufferDesk.documents.createDocumentStore(config) : null);
		const root = document.createElement('div');
		const sidebar = document.createElement('aside');
		const list = document.createElement('div');
		const main = document.createElement('section');
		const titleInput = document.createElement('input');
		const editor = document.createElement('textarea');
		const status = document.createElement('div');
		const saveButton = createButton('pdk-document-editor-button is-primary', getLabel('save', 'Save'), getLabel('save', 'Save'));
		const deleteButton = createButton('pdk-document-editor-button', getLabel('delete', 'Delete'), getLabel('delete', 'Delete'));
		const newButton = createButton('pdk-document-editor-new', getLabel('newDocument', 'New Document'), getLabel('newDocument', 'New Document'));
		const documents = [];
		let currentDocument = null;
		let isSaving = false;

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function getTextKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.text : 'text_document';
		}

		function setStatus(message, tone = '') {
			status.textContent = message || '';
			status.dataset.pdkTone = tone;
		}

		function getUntitledDocument() {
			return {
				content: '',
				id: 0,
				kind: getTextKind(),
				title: getLabel('untitledDocument', 'Untitled Document')
			};
		}

		function syncEditor() {
			const documentData = currentDocument || getUntitledDocument();

			titleInput.value = documentData.title || getLabel('untitledDocument', 'Untitled Document');
			editor.value = documentData.content || '';
			deleteButton.disabled = !documentData.id;
			saveButton.disabled = isSaving;
			Array.from(list.querySelectorAll('[data-pdk-document-id]')).forEach((item) => {
				const selected = Number.parseInt(item.dataset.pdkDocumentId, 10) === Number.parseInt(documentData.id, 10);
				item.classList.toggle('is-active', selected);
				if (selected) {
					item.setAttribute('aria-current', 'page');
				} else {
					item.removeAttribute('aria-current');
				}
			});
		}

		function setCurrentDocument(documentData) {
			currentDocument = Object.assign(getUntitledDocument(), documentData || {});
			syncEditor();
		}

		function renderList() {
			list.replaceChildren();

			if (!documents.length) {
				const empty = document.createElement('p');
				empty.className = 'pdk-document-editor-empty';
				empty.textContent = getLabel('noDocuments', 'No documents');
				list.appendChild(empty);
				return;
			}

			documents.forEach((documentData) => {
				const item = document.createElement('button');
				const title = document.createElement('span');
				const meta = document.createElement('span');
				item.className = 'pdk-document-editor-list-item';
				item.type = 'button';
				item.dataset.pdkDocumentId = String(documentData.id);
				title.className = 'pdk-document-editor-list-title';
				title.textContent = documentData.title || getLabel('untitledDocument', 'Untitled Document');
				meta.className = 'pdk-document-editor-list-meta';
				meta.textContent = documentData.modified ? new Date(documentData.modified).toLocaleString() : '';
				item.append(title, meta);
				item.addEventListener('click', () => setCurrentDocument(documentData));
				list.appendChild(item);
			});

			syncEditor();
		}

		function upsertDocument(documentData) {
			const index = documents.findIndex((item) => Number.parseInt(item.id, 10) === Number.parseInt(documentData.id, 10));
			if (index >= 0) {
				documents[index] = documentData;
			} else {
				documents.unshift(documentData);
			}

			renderList();
			setCurrentDocument(documentData);
		}

		function saveDocument() {
			if (!documentStore || isSaving) {
				return Promise.resolve(false);
			}

			const payload = {
				content: editor.value,
				kind: getTextKind(),
				title: titleInput.value || getLabel('untitledDocument', 'Untitled Document')
			};
			const currentId = currentDocument && currentDocument.id ? currentDocument.id : 0;

			isSaving = true;
			saveButton.disabled = true;
			setStatus(getLabel('saving', 'Saving...'));

			const request = currentId
				? documentStore.update(currentId, payload)
				: documentStore.create(payload);

			return request.then((documentData) => {
				upsertDocument(documentData);
				setStatus(getLabel('saved', 'Saved'), 'success');
				return true;
			}).catch((error) => {
				setStatus(error && error.message ? error.message : getLabel('couldNotSaveDocument', 'Could not save document.'), 'error');
				return false;
			}).finally(() => {
				isSaving = false;
				syncEditor();
			});
		}

		function deleteCurrentDocument() {
			if (!documentStore || !currentDocument || !currentDocument.id) {
				return Promise.resolve(false);
			}

			if (window.confirm && !window.confirm(getLabel('deleteDocumentConfirm', 'Delete this document?'))) {
				return Promise.resolve(false);
			}

			const documentId = currentDocument.id;
			return documentStore.remove(documentId).then(() => {
				const index = documents.findIndex((item) => Number.parseInt(item.id, 10) === Number.parseInt(documentId, 10));
				if (index >= 0) {
					documents.splice(index, 1);
				}
				renderList();
				setCurrentDocument(documents[0] || getUntitledDocument());
				setStatus(getLabel('deleted', 'Deleted'), 'success');
				return true;
			}).catch((error) => {
				setStatus(error && error.message ? error.message : getLabel('couldNotDeleteDocument', 'Could not delete document.'), 'error');
				return false;
			});
		}

		function loadDocuments() {
			if (!documentStore || typeof documentStore.list !== 'function') {
				setStatus(getLabel('documentServiceUnavailable', 'Document service unavailable.'), 'error');
				return Promise.resolve([]);
			}

			setStatus(getLabel('loading', 'Loading...'));

			return documentStore.list(getTextKind()).then((items) => {
				documents.splice(0, documents.length, ...items);
				renderList();
				setCurrentDocument(documents[0] || getUntitledDocument());
				setStatus('');
				return documents;
			}).catch((error) => {
				renderList();
				setCurrentDocument(getUntitledDocument());
				setStatus(error && error.message ? error.message : getLabel('couldNotLoadDocuments', 'Could not load documents.'), 'error');
				return [];
			});
		}

		root.className = 'pdk-document-editor';
		sidebar.className = 'pdk-document-editor-sidebar';
		list.className = 'pdk-document-editor-list';
		main.className = 'pdk-document-editor-main';
		titleInput.className = 'pdk-document-editor-title';
		titleInput.type = 'text';
		titleInput.placeholder = getLabel('untitledDocument', 'Untitled Document');
		editor.className = 'pdk-document-editor-content';
		editor.spellcheck = true;
		status.className = 'pdk-document-editor-status';

		sidebar.append(newButton, list);
		main.append(titleInput, editor);

		const footer = document.createElement('footer');
		footer.className = 'pdk-document-editor-footer';
		footer.append(status, deleteButton, saveButton);
		main.appendChild(footer);
		root.append(sidebar, main);

		newButton.addEventListener('click', () => {
			setCurrentDocument(getUntitledDocument());
			editor.focus();
		});
		saveButton.addEventListener('click', saveDocument);
		deleteButton.addEventListener('click', deleteCurrentDocument);
		root.addEventListener('keydown', (event) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 's';
			if (!isSaveShortcut) {
				return;
			}

			event.preventDefault();
			saveDocument();
		});

		loadDocuments();

		return root;
	};

	if (typeof window.PufferDesk.apps.registerNativeAppRenderer === 'function') {
		window.PufferDesk.apps.registerNativeAppRenderer('text-editor', ({ config }) => {
			const labels = getLabels(config);
			const title = typeof labels.textEditor === 'string' && labels.textEditor ? labels.textEditor : 'Text Editor';

			return {
				bodyClass: 'pdk-window-body pdk-document-editor-body',
				content: window.PufferDesk.apps.createTextEditorApp({ config }),
				height: '560px',
				resizeMode: 'both',
				title,
				titlebarLabel: title,
				width: '780px'
			};
		});
	}
})();
