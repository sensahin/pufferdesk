(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.documents = window.PufferDesk.documents || {};

	const stickyNoteColors = [ 'yellow', 'green', 'pink', 'purple', 'blue', 'gray', 'dark' ];

	function getConfig(config) {
		return config && typeof config === 'object'
			? config
			: (window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function' ? window.PufferDesk.config.get() : {});
	}

	function normalizeStickyNoteColor(color) {
		const value = typeof color === 'string' ? color.trim().toLowerCase() : '';

		return stickyNoteColors.includes(value) ? value : 'yellow';
	}

	function getDocumentLabels(config) {
		const runtimeConfig = getConfig(config);
		const documentConfig = runtimeConfig.documents && typeof runtimeConfig.documents === 'object' ? runtimeConfig.documents : {};

		return documentConfig.labels && typeof documentConfig.labels === 'object' ? documentConfig.labels : {};
	}

	function getDocumentLabel(labels, key) {
		const value = labels && typeof labels[key] === 'string' ? labels[key] : '';

		return value || key;
	}

	function normalizeDocument(document, labels = getDocumentLabels()) {
		const data = document && typeof document === 'object' ? document : {};
		const id = Number.parseInt(data.id, 10);

		return {
			authorId: Number.parseInt(data.authorId, 10) || 0,
			color: typeof data.color === 'string' ? data.color : '',
			content: typeof data.content === 'string' ? data.content : '',
			created: typeof data.created === 'string' ? data.created : '',
			format: typeof data.format === 'string' ? data.format : 'html',
			id: Number.isFinite(id) ? id : 0,
			kind: typeof data.kind === 'string' ? data.kind : '',
			modified: typeof data.modified === 'string' ? data.modified : '',
			parentPath: typeof data.parentPath === 'string' ? data.parentPath : '',
			path: typeof data.path === 'string' ? data.path : '',
			title: typeof data.title === 'string' && data.title ? data.title : getDocumentLabel(labels, 'untitledDocument')
		};
	}

	function unwrapResult(result, key, labels) {
		const data = result && result.data && typeof result.data === 'object' ? result.data : {};

		if (result && result.success) {
			return data[key];
		}

		throw new Error(data.message || getDocumentLabel(labels, 'documentServiceUnavailable'));
	}

	window.PufferDesk.documents.createDocumentStore = function createDocumentStore(config) {
		const runtimeConfig = getConfig(config);
		const documentConfig = runtimeConfig.documents && typeof runtimeConfig.documents === 'object' ? runtimeConfig.documents : {};
		const actions = documentConfig.actions && typeof documentConfig.actions === 'object' ? documentConfig.actions : {};
		const kinds = documentConfig.kinds && typeof documentConfig.kinds === 'object' ? documentConfig.kinds : {};
		const labels = getDocumentLabels(runtimeConfig);
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(runtimeConfig)
			: null;
		const events = window.PufferDesk.events || null;
		const eventNames = events && events.names ? events.names : {};

		function post(actionKey, payload = {}) {
			const action = actions[actionKey];

			if (!api || typeof api.post !== 'function' || !action) {
				return Promise.reject(new Error(getDocumentLabel(labels, 'documentServiceUnavailable')));
			}

			return api.post(action, payload);
		}

		function emitChange(type, detail = {}) {
			if (events && typeof events.emit === 'function' && eventNames.DOCUMENTS_CHANGED) {
				events.emit(eventNames.DOCUMENTS_CHANGED, Object.assign({ type }, detail));
			}
		}

		function getDefaultParentPath(kind) {
			return virtualFilesystem && typeof virtualFilesystem.getDefaultPathForKind === 'function'
				? virtualFilesystem.getDefaultPathForKind(kind)
				: '';
		}

		function normalizeListOptions(options = {}) {
			if (typeof options === 'string') {
				return {
					parentPath: options
				};
			}

			return options && typeof options === 'object' ? options : {};
		}

		function withDefaultParentPath(payload = {}) {
			const next = Object.assign({}, payload);
			const kind = typeof next.kind === 'string' && next.kind ? next.kind : '';

			if (!next.parentPath && kind) {
				next.parentPath = getDefaultParentPath(kind);
			}

			return next;
		}

		function list(kind = '', options = {}) {
			const normalizedOptions = normalizeListOptions(options);
			const payload = {};
			const defaultParentPath = kind && normalizedOptions.includeAllFolders !== true
				? getDefaultParentPath(kind)
				: '';

			if (kind) {
				payload.kind = kind;
			}
			if (typeof normalizedOptions.parentPath === 'string' && normalizedOptions.parentPath) {
				payload.parentPath = normalizedOptions.parentPath;
			} else if (defaultParentPath) {
				payload.parentPath = defaultParentPath;
			}

			return post('list', payload).then((result) => {
				const documents = unwrapResult(result, 'documents', labels);

				return Array.isArray(documents) ? documents.map((document) => normalizeDocument(document, labels)).filter((document) => document.id > 0) : [];
			});
		}

		function get(id) {
			return post('get', { id: String(id || '') }).then((result) => normalizeDocument(unwrapResult(result, 'document', labels), labels));
		}

		function create(payload = {}) {
			return post('create', withDefaultParentPath(payload)).then((result) => {
				const documentData = normalizeDocument(unwrapResult(result, 'document', labels), labels);
				emitChange('create', {
					document: documentData
				});

				return documentData;
			});
		}

		function update(id, payload = {}) {
			return post('update', Object.assign({}, payload, {
				id: String(id || '')
			})).then((result) => {
				const documentData = normalizeDocument(unwrapResult(result, 'document', labels), labels);
				emitChange('update', {
					document: documentData
				});

				return documentData;
			});
		}

		function remove(id) {
			return post('delete', {
				id: String(id || '')
			}).then((result) => {
				const deleted = Boolean(unwrapResult(result, 'deleted', labels));
				if (deleted) {
					emitChange('delete', {
						id: Number.parseInt(id, 10) || 0
					});
				}

				return deleted;
			});
		}

		return {
			create,
			get,
			kinds: {
				sticky: kinds.sticky || 'sticky_note',
				text: kinds.text || 'text_document'
			},
			list,
			normalizeDocument,
			remove,
			update
		};
	};

	window.PufferDesk.documents.stickyNoteColors = stickyNoteColors.slice();
	window.PufferDesk.documents.normalizeStickyNoteColor = normalizeStickyNoteColor;
})();
