(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};
	window.PufferDesk.shortcuts = window.PufferDesk.shortcuts || {};

	const shortcutContexts = Object.freeze({
		COMMAND_PALETTE: 'command-palette',
		DESKTOP: 'desktop',
		FOLDER: 'folder',
		FOLDER_TAB: 'folder-tab',
		GLOBAL: 'global',
		INPUT_FOCUSED: 'input-focused',
		MODAL: 'modal',
		WINDOW: 'window'
	});

	window.PufferDesk.shortcuts.contexts = shortcutContexts;
	window.PufferDesk.shell.shortcutContexts = shortcutContexts;
})();
