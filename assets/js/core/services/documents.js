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

	function normalizeDocument(document) {
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
			title: typeof data.title === 'string' && data.title ? data.title : 'Untitled Document'
		};
	}

	function unwrapResult(result, key) {
		const data = result && result.data && typeof result.data === 'object' ? result.data : {};

		if (result && result.success) {
			return data[key];
		}

		throw new Error(data.message || 'Document service unavailable.');
	}

	window.PufferDesk.documents.createDocumentStore = function createDocumentStore(config) {
		const runtimeConfig = getConfig(config);
		const documentConfig = runtimeConfig.documents && typeof runtimeConfig.documents === 'object' ? runtimeConfig.documents : {};
		const actions = documentConfig.actions && typeof documentConfig.actions === 'object' ? documentConfig.actions : {};
		const kinds = documentConfig.kinds && typeof documentConfig.kinds === 'object' ? documentConfig.kinds : {};
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
			? window.PufferDesk.virtualFilesystem.create(runtimeConfig)
			: null;
		const events = window.PufferDesk.events || null;

		function post(actionKey, payload = {}) {
			const action = actions[actionKey];

			if (!api || typeof api.post !== 'function' || !action) {
				return Promise.reject(new Error('Document service unavailable.'));
			}

			return api.post(action, payload);
		}

		function emitChange(type, detail = {}) {
			if (events && typeof events.emit === 'function') {
				events.emit('documents:changed', Object.assign({ type }, detail));
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
				const documents = unwrapResult(result, 'documents');

				return Array.isArray(documents) ? documents.map(normalizeDocument).filter((document) => document.id > 0) : [];
			});
		}

		function get(id) {
			return post('get', { id: String(id || '') }).then((result) => normalizeDocument(unwrapResult(result, 'document')));
		}

		function create(payload = {}) {
			return post('create', withDefaultParentPath(payload)).then((result) => {
				const documentData = normalizeDocument(unwrapResult(result, 'document'));
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
				const documentData = normalizeDocument(unwrapResult(result, 'document'));
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
				const deleted = Boolean(unwrapResult(result, 'deleted'));
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
