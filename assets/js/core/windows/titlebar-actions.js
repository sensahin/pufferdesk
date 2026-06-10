(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	const interactiveSelector = 'button, input, select, textarea, a, [contenteditable="true"], [data-pdk-no-drag], [data-pdk-titlebar-dblclick-exclude]';

	function isInteractiveTarget(target, root = null) {
		if (!target || typeof target.closest !== 'function') {
			return false;
		}

		const match = target.closest(interactiveSelector);

		return Boolean(match && (!root || root.contains(match)));
	}

	function bindDoubleClick(handle, callback) {
		if (!handle || typeof callback !== 'function' || handle.dataset.pdkTitlebarDoubleClickBound === '1') {
			return false;
		}

		handle.dataset.pdkTitlebarDoubleClickBound = '1';
		handle.addEventListener('dblclick', (event) => {
			if (isInteractiveTarget(event.target, handle)) {
				return;
			}

			event.preventDefault();
			callback(event);
		});

		return true;
	}

	window.PufferDesk.windows.titlebarActions = Object.freeze({
		bindDoubleClick,
		isInteractiveTarget
	});
})();
