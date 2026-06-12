(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const explorerModes = new Set(['extra-large-icons', 'large-icons', 'medium-icons', 'small-icons', 'list', 'details', 'tiles', 'content']);
	const finderModes = new Set(['icons', 'list']);
	const iconAliases = new Set(['icons', 'extra-large-icons', 'large-icons', 'medium-icons', 'small-icons']);
	const listAliases = new Set(['list', 'details', 'tiles', 'content']);
	const toolbarDisplayModes = new Set(['icon-text', 'icon-only', 'text-only']);
	const explorerSortModes = new Set(['none', 'name', 'kind', 'date-added', 'date-modified', 'size']);
	const explorerOptions = [
		{ group: 'icons', key: 'extra_large_icons', mode: 'extra-large-icons' },
		{ group: 'icons', key: 'large_icons', mode: 'large-icons' },
		{ group: 'icons', key: 'medium_icons', mode: 'medium-icons' },
		{ group: 'icons', key: 'small_icons', mode: 'small-icons' },
		{ group: 'list', key: 'list_view_short', mode: 'list' },
		{ group: 'list', key: 'details_view_short', mode: 'details' },
		{ group: 'list', key: 'tiles_view', mode: 'tiles' },
		{ group: 'list', key: 'content_view', mode: 'content' }
	];
	const finderOptions = [
		{ group: 'view', key: 'as_icons', mode: 'icons' },
		{ group: 'view', key: 'as_list', mode: 'list' }
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
			? getMenuLabel(option.key, option.key)
			: option.key;
	}

	function isIconMode(mode) {
		return iconAliases.has(mode);
	}

	function isListMode(mode) {
		return listAliases.has(mode);
	}

	function normalizeToolbarDisplayMode(mode, fallback = 'icon-text') {
		return toolbarDisplayModes.has(mode) ? mode : fallback;
	}

	function normalizeExplorerSortMode(mode, fallback = 'none') {
		return explorerSortModes.has(mode) ? mode : fallback;
	}

	window.PufferDesk.apps.folderViewModes = {
		getDefaultMode,
		getLabel,
		getOptions,
		isIconMode,
		isKnown,
		isListMode,
		normalizeExplorerSortMode,
		normalizeToolbarDisplayMode,
		normalize,
		normalizeLayout
	};
})();
