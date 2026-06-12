(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	const defaults = {};

	function isPlainObject(value) {
		return value && typeof value === 'object' && !Array.isArray(value);
	}

	function mergeDeep(base, override) {
		const merged = Array.isArray(base) ? base.slice() : Object.assign({}, base || {});

		if (!isPlainObject(override)) {
			return merged;
		}

		Object.keys(override).forEach((key) => {
			const value = override[key];
			if (Array.isArray(value)) {
				merged[key] = value.slice();
			} else if (isPlainObject(value)) {
				merged[key] = mergeDeep(isPlainObject(merged[key]) ? merged[key] : {}, value);
			} else if (value !== undefined && value !== null) {
				merged[key] = value;
			}
		});

		return merged;
	}

	function getPath(source, path, fallback) {
		if (!path) {
			return source;
		}

		const value = String(path).split('.').reduce((current, key) => (
			current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
		), source);

		return value === undefined || value === null ? fallback : value;
	}

	function format(template, values = []) {
		if (window.PufferDesk.config && typeof window.PufferDesk.config.formatTemplate === 'function') {
			return window.PufferDesk.config.formatTemplate(template, values);
		}

		return String(template || '');
	}

	function getOptions(source, path) {
		const options = getPath(source, path, []);

		return Array.isArray(options) ? options.slice() : [];
	}

	window.PufferDesk.apps.settings.createLabels = function createLabels(settingsConfig = {}) {
		const runtimeLabels = settingsConfig.labels && isPlainObject(settingsConfig.labels)
			? settingsConfig.labels
			: {};
		const labels = mergeDeep(defaults, runtimeLabels);

		return {
			all: labels,
			format(template, values) {
				return format(template, values);
			},
			get(path, fallback = '') {
				return getPath(labels, path, fallback);
			},
			getOptions(path) {
				return getOptions(labels, path);
			}
		};
	};
})();
