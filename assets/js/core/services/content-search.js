(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.contentSearch = window.PufferDesk.contentSearch || {};

	function getConfig(config) {
		return config && typeof config === 'object'
			? config
			: (window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function' ? window.PufferDesk.config.get() : {});
	}

	function normalizeString(value) {
		return typeof value === 'string' ? value.trim() : '';
	}

	function normalizeNumber(value) {
		const number = Number.parseInt(value, 10);

		return Number.isFinite(number) ? number : 0;
	}

	function normalizeResult(result) {
		const data = result && typeof result === 'object' ? result : {};
		const label = normalizeString(data.label || data.title);
		const url = normalizeString(data.url || data.target);

		if (!label || !url) {
			return null;
		}

		return {
			command: normalizeString(data.command),
			icon: data.icon || 'dashicons-admin-post',
			id: normalizeString(data.id) || url,
			keywords: Array.isArray(data.keywords) ? data.keywords.map(normalizeString).filter(Boolean) : [],
			label,
			path: normalizeString(data.path),
			postId: normalizeNumber(data.postId),
			postType: normalizeString(data.postType),
			snippet: normalizeString(data.snippet),
			subtitle: normalizeString(data.subtitle),
			target: normalizeString(data.target),
			title: normalizeString(data.title) || label,
			type: normalizeString(data.type) || 'wp_content',
			url
		};
	}

	function unwrapResults(result) {
		const data = result && result.data && typeof result.data === 'object' ? result.data : {};

		if (!result || !result.success) {
			return [];
		}

		return Array.isArray(data.results) ? data.results.map(normalizeResult).filter(Boolean) : [];
	}

	window.PufferDesk.contentSearch.createStore = function createContentSearchStore(config) {
		const runtimeConfig = getConfig(config);
		const searchConfig = runtimeConfig.contentSearch && typeof runtimeConfig.contentSearch === 'object'
			? runtimeConfig.contentSearch
			: {};
		const actions = searchConfig.actions && typeof searchConfig.actions === 'object' ? searchConfig.actions : {};
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const defaultLimit = normalizeNumber(searchConfig.limit) || 18;
		const enabled = searchConfig.enabled !== false;

		function search(query, options = {}) {
			const text = normalizeString(query);
			const limit = normalizeNumber(options.limit) || defaultLimit;

			if (!enabled || !text || !api || typeof api.post !== 'function' || !actions.search) {
				return Promise.resolve([]);
			}

			return api.post(actions.search, {
				limit: String(limit),
				query: text
			}).then(unwrapResults);
		}

		return {
			search
		};
	};
})();
