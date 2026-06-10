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
		const resizeDirections = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

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

		function getResizeDirections(win) {
			const mode = win.dataset.pdkResizeMode || 'both';

			if (mode === 'none') {
				return [];
			}
			if (mode === 'vertical') {
				return ['n', 's'];
			}
			if (mode === 'horizontal') {
				return ['e', 'w'];
			}

			return resizeDirections;
		}

		function ensureResizeHandles(win) {
			if (win.dataset.pdkResizeHandlesBound === '1') {
				return;
			}

			win.dataset.pdkResizeHandlesBound = '1';

			getResizeDirections(win).forEach((direction) => {
				const handle = document.createElement('span');
				handle.className = `pdk-window-resize-handle pdk-window-resize-handle-${direction}`;
				handle.dataset.pdkResizeHandle = direction;
				handle.setAttribute('aria-hidden', 'true');

				handle.addEventListener('pointerdown', (event) => {
					startResize(win, handle, direction, event);
				});
				handle.addEventListener('mousedown', (event) => {
					startResize(win, handle, direction, event);
				});

				win.appendChild(handle);
			});
		}

		function startResize(win, handle, direction, event) {
			if (
				!desktop
				|| (Number.isFinite(event.button) && event.button !== 0)
				|| win.classList.contains('is-maximized')
				|| win.classList.contains('is-resizing')
				|| !getResizeDirections(win).includes(direction)
			) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			focusWindow(win);

			const desktopRect = desktop.getBoundingClientRect();
			const rect = win.getBoundingClientRect();
			const minSize = layout.getResizeMinSize(win);
			const startX = event.clientX;
			const startY = event.clientY;
			const startLeft = Math.round(rect.left - desktopRect.left);
			const startTop = Math.round(rect.top - desktopRect.top);
			const startWidth = Math.round(rect.width);
			const startHeight = Math.round(rect.height);

			win.classList.add('is-resizing');
			win.style.transform = 'none';
			win.style.left = `${startLeft}px`;
			win.style.top = `${startTop}px`;
			win.style.width = `${startWidth}px`;
			win.style.height = `${startHeight}px`;

			const pointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;

			if (pointerId !== null && typeof handle.setPointerCapture === 'function') {
				try {
					handle.setPointerCapture(pointerId);
				} catch {
					// Window-level listeners below keep resizing reliable if capture is unavailable.
				}
			}

			const move = (moveEvent) => {
				const safeArea = layout.syncWindowSafeArea();
				const deltaX = moveEvent.clientX - startX;
				const deltaY = moveEvent.clientY - startY;
				let nextLeft = startLeft;
				let nextTop = startTop;
				let nextWidth = startWidth;
				let nextHeight = startHeight;

				if (direction.includes('e')) {
					nextWidth = clamp(startWidth + deltaX, minSize.width, desktop.clientWidth - startLeft);
				}

				if (direction.includes('s')) {
					nextHeight = clamp(startHeight + deltaY, minSize.height, desktop.clientHeight - safeArea.bottom - startTop);
				}

				if (direction.includes('w')) {
					nextLeft = clamp(startLeft + deltaX, 0, startLeft + startWidth - minSize.width);
					nextWidth = startWidth + startLeft - nextLeft;
				}

				if (direction.includes('n')) {
					nextTop = clamp(startTop + deltaY, safeArea.top, startTop + startHeight - minSize.height);
					nextHeight = startHeight + startTop - nextTop;
				}

				nextHeight = Math.min(nextHeight, Math.max(minSize.height, desktop.clientHeight - safeArea.bottom - nextTop));

				win.style.left = `${Math.round(nextLeft)}px`;
				win.style.top = `${Math.round(nextTop)}px`;
				win.style.width = `${Math.round(nextWidth)}px`;
				win.style.height = `${Math.round(nextHeight)}px`;
			};

			const up = (upEvent) => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('mousemove', move);
				window.removeEventListener('pointerup', up);
				window.removeEventListener('mouseup', up);
				window.removeEventListener('pointercancel', up);
				win.classList.remove('is-resizing');

				const releasePointerId = Number.isFinite(upEvent.pointerId) ? upEvent.pointerId : pointerId;

				if (
					releasePointerId !== null
					&& typeof handle.hasPointerCapture === 'function'
					&& typeof handle.releasePointerCapture === 'function'
					&& handle.hasPointerCapture(releasePointerId)
				) {
					handle.releasePointerCapture(releasePointerId);
				}

				const nextRect = layout.getRelativeRect(win);
				if (
					nextRect.left !== startLeft
					|| nextRect.top !== startTop
					|| nextRect.width !== startWidth
					|| nextRect.height !== startHeight
				) {
					emitWindowStateChanged(win, 'resized');
				}
				scheduleSave();
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('mousemove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('mouseup', up);
			window.addEventListener('pointercancel', up);
		}

		return {
			ensureResizeHandles,
			isDragExcludedTarget,
			makeDraggable,
			startResize
		};
	};
})();
