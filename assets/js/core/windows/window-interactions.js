(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowInteractions = function createWindowInteractions(shell, options = {}) {
		const geometry = window.PufferDesk.geometry;
		const clamp = geometry.clamp;
		const desktop = options.desktop || shell.querySelector('.pdk-desktop');
		const layout = options.layout;
		const focusWindow = typeof options.focusWindow === 'function' ? options.focusWindow : () => null;
		const toggleMaximizeWindow = typeof options.toggleMaximizeWindow === 'function'
			? options.toggleMaximizeWindow
			: () => null;
		const titlebarActions = window.PufferDesk.windows.titlebarActions || null;
		const emitWindowStateChanged = typeof options.emitWindowStateChanged === 'function'
			? options.emitWindowStateChanged
			: () => null;
		const scheduleSave = typeof options.scheduleSave === 'function' ? options.scheduleSave : () => null;
		const resizeHandles = window.PufferDesk.windows.createResizeHandleController({
			container: desktop,
			focusElement: focusWindow,
			getMinSize: (win) => layout.getResizeMinSize(win),
			getRelativeRect: (win) => layout.getRelativeRect(win),
			getResizeMode: (win) => win.dataset.pdkResizeMode || 'both',
			handleClassPrefix: 'pdk-window-resize-handle',
			isResizeDisabled: (win) => win.classList.contains('is-maximized'),
			onResizeEnd(win, detail = {}) {
				if (detail.changed) {
					emitWindowStateChanged(win, 'resized');
				}
				scheduleSave();
			},
			syncSafeArea: () => layout.syncWindowSafeArea()
		});

		function isDragExcludedTarget(target, root = null) {
			if (titlebarActions && typeof titlebarActions.isInteractiveTarget === 'function') {
				return titlebarActions.isInteractiveTarget(target, root);
			}

			return Boolean(
				target
				&& typeof target.closest === 'function'
				&& target.closest('button, input, select, textarea, a, [contenteditable="true"], [data-pdk-no-drag], [data-pdk-titlebar-dblclick-exclude]')
			);
		}

		function bindTitlebarDoubleClick(handle, win) {
			const callback = () => toggleMaximizeWindow(win);

			if (titlebarActions && typeof titlebarActions.bindDoubleClick === 'function') {
				titlebarActions.bindDoubleClick(handle, callback);
				return;
			}

			handle.addEventListener('dblclick', (event) => {
				if (isDragExcludedTarget(event.target, handle)) {
					return;
				}

				event.preventDefault();
				callback();
			});
		}

		function makeDraggable(win) {
			const handles = Array.from(win.querySelectorAll('[data-pdk-drag-handle]'));

			if (!handles.length || !desktop) {
				return;
			}

			handles.forEach((handle) => {
				if (handle.dataset.pdkDragBound === '1') {
					return;
				}

				handle.dataset.pdkDragBound = '1';

				bindTitlebarDoubleClick(handle, win);

				handle.addEventListener('pointerdown', (event) => {
					if (event.button !== 0 || isDragExcludedTarget(event.target, handle) || win.classList.contains('is-maximized')) {
						return;
					}

					event.preventDefault();
					focusWindow(win);

					const desktopRect = desktop.getBoundingClientRect();
					const rect = win.getBoundingClientRect();
					const startX = event.clientX;
					const startY = event.clientY;
					const startLeft = rect.left - desktopRect.left;
					const startTop = rect.top - desktopRect.top;

					win.style.transform = 'none';
					win.style.left = `${startLeft}px`;
					win.style.top = `${startTop}px`;
					handle.setPointerCapture(event.pointerId);

					const move = (moveEvent) => {
						const nextLeft = startLeft + moveEvent.clientX - startX;
						const nextTop = startTop + moveEvent.clientY - startY;
						const bounds = layout.getWindowBounds(win);

						win.style.left = `${clamp(nextLeft, bounds.minLeft, bounds.maxLeft)}px`;
						win.style.top = `${clamp(nextTop, bounds.minTop, bounds.maxTop)}px`;
					};

					const up = () => {
						handle.removeEventListener('pointermove', move);
						handle.removeEventListener('pointerup', up);
						handle.removeEventListener('pointercancel', up);
						const nextRect = layout.getRelativeRect(win);
						if (Math.round(startLeft) !== nextRect.left || Math.round(startTop) !== nextRect.top) {
							emitWindowStateChanged(win, 'moved');
						}
						scheduleSave();
					};

					handle.addEventListener('pointermove', move);
					handle.addEventListener('pointerup', up);
					handle.addEventListener('pointercancel', up);
				});
			});
		}

		return {
			ensureResizeHandles: resizeHandles.ensureResizeHandles,
			isDragExcludedTarget,
			makeDraggable,
			startResize: resizeHandles.startResize
		};
	};
})();
