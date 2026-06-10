(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const explorerModes = new Set(['extra-large-icons', 'large-icons', 'medium-icons', 'small-icons', 'list', 'details', 'tiles', 'content']);
	const finderModes = new Set(['icons', 'list']);
	const iconAliases = new Set(['icons', 'extra-large-icons', 'large-icons', 'medium-icons', 'small-icons']);
	const listAliases = new Set(['list', 'details', 'tiles', 'content']);
	const explorerOptions = [
		{ fallback: 'Extra large icons', group: 'icons', key: 'extra_large_icons', mode: 'extra-large-icons' },
		{ fallback: 'Large icons', group: 'icons', key: 'large_icons', mode: 'large-icons' },
		{ fallback: 'Medium icons', group: 'icons', key: 'medium_icons', mode: 'medium-icons' },
		{ fallback: 'Small icons', group: 'icons', key: 'small_icons', mode: 'small-icons' },
		{ fallback: 'List', group: 'list', key: 'list_view_short', mode: 'list' },
		{ fallback: 'Details', group: 'list', key: 'details_view_short', mode: 'details' },
		{ fallback: 'Tiles', group: 'list', key: 'tiles_view', mode: 'tiles' },
		{ fallback: 'Content', group: 'list', key: 'content_view', mode: 'content' }
	];
	const finderOptions = [
		{ fallback: 'as Icons', group: 'view', key: 'as_icons', mode: 'icons' },
		{ fallback: 'as List', group: 'view', key: 'as_list', mode: 'list' }
	];

	function normalizeLayout(layout) {
		return layout === 'file-explorer' ? 'file-explorer' : 'finder';
	}

	function getDefaultMode(layout) {
		return normalizeLayout(layout) === 'file-explorer' ? 'large-icons' : 'icons';
	}

	function normalize(mode, layout = 'finder') {
		const normalizedLayout = normalizeLayout(layout);
		const value = typeof mode === 'string' ? mode : '';

		if (normalizedLayout === 'file-explorer') {
			if (explorerModes.has(value)) {
				return value;
			}

			if (value === 'icons') {
				return 'large-icons';
			}

			return getDefaultMode(normalizedLayout);
		}

		if (finderModes.has(value)) {
			return value;
		}

		if (iconAliases.has(value)) {
			return 'icons';
		}

		if (listAliases.has(value)) {
			return 'list';
		}

		return getDefaultMode(normalizedLayout);
	}

	function isKnown(mode) {
		return iconAliases.has(mode) || listAliases.has(mode);
	}

	function getOptions(layout = 'finder') {
		return normalizeLayout(layout) === 'file-explorer'
			? explorerOptions.slice()
			: finderOptions.slice();
	}

	function getLabel(option, getMenuLabel) {
		return typeof getMenuLabel === 'function'
			? getMenuLabel(option.key, option.fallback)
			: option.fallback;
	}

	function isIconMode(mode) {
		return iconAliases.has(mode);
	}

	function isListMode(mode) {
		return listAliases.has(mode);
	}

	window.PufferDesk.apps.folderViewModes = {
		getDefaultMode,
		getLabel,
		getOptions,
		isIconMode,
		isKnown,
		isListMode,
		normalize,
		normalizeLayout
	};
})();
