(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextMenuThemeAdapter = function createContextMenuThemeAdapter(shell, config = {}) {
		const theme = config.theme && typeof config.theme === 'object' ? config.theme : {};
		const family = typeof theme.family === 'string' ? theme.family : '';
		const id = typeof theme.id === 'string' ? theme.id : '';
		const surfaces = theme.surfaces && typeof theme.surfaces === 'object' ? theme.surfaces : {};

		function apply(popover, context = {}) {
			if (!popover) {
				return;
			}

			popover.dataset.pdkContextMenu = context.type || context.contextKey || '';
			popover.dataset.pdkContextKey = context.contextKey || '';
			popover.dataset.pdkContextArea = context.area || '';
			popover.dataset.pdkContextTargetType = context.targetType || '';
			popover.dataset.pdkContextItemType = context.itemType || '';
			popover.dataset.pdkContextTheme = id || family || '';
			popover.dataset.pdkContextThemeFamily = family || '';

			if (surfaces.folder) {
				popover.dataset.pdkFolderSurface = surfaces.folder;
			}

			if (shell && shell.dataset && shell.dataset.pdkShellLauncher) {
				popover.dataset.pdkShellLauncher = shell.dataset.pdkShellLauncher;
			}
		}

		return {
			apply
		};
	};
})();
