(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.documents = window.PufferDesk.documents || {};

	function getConfig(config) {
		return config && typeof config === 'object'
			? config
			: (window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function' ? window.PufferDesk.config.get() : {});
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

		function post(actionKey, payload = {}) {
			const action = actions[actionKey];

			if (!api || typeof api.post !== 'function' || !action) {
				return Promise.reject(new Error('Document service unavailable.'));
			}

			return api.post(action, payload);
		}

		function list(kind = '') {
			return post('list', kind ? { kind } : {}).then((result) => {
				const documents = unwrapResult(result, 'documents');

				return Array.isArray(documents) ? documents.map(normalizeDocument).filter((document) => document.id > 0) : [];
			});
		}

		function get(id) {
			return post('get', { id: String(id || '') }).then((result) => normalizeDocument(unwrapResult(result, 'document')));
		}

		function create(payload = {}) {
			return post('create', payload).then((result) => normalizeDocument(unwrapResult(result, 'document')));
		}

		function update(id, payload = {}) {
			return post('update', Object.assign({}, payload, {
				id: String(id || '')
			})).then((result) => normalizeDocument(unwrapResult(result, 'document')));
		}

		function remove(id) {
			return post('delete', {
				id: String(id || '')
			}).then((result) => Boolean(unwrapResult(result, 'deleted')));
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
})();
