(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createResizeHandleController = function createResizeHandleController(options = {}) {
		const geometry = window.PufferDesk.geometry || {};
		const clamp = typeof geometry.clamp === 'function'
			? geometry.clamp
			: (value, min, max) => Math.min(Math.max(min, value), Math.max(min, max));
		const readNumber = typeof geometry.readNumber === 'function'
			? geometry.readNumber
			: (value) => {
				const parsed = Number.parseFloat(value);

				return Number.isFinite(parsed) ? parsed : null;
			};
		const resizeDirections = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
		const handleClassPrefix = options.handleClassPrefix || 'pdk-resize-handle';
		const boundDatasetKey = options.boundDatasetKey || 'pdkResizeHandlesBound';
		const getContainer = typeof options.getContainer === 'function'
			? options.getContainer
			: () => options.container || null;
		const getResizeMode = typeof options.getResizeMode === 'function'
			? options.getResizeMode
			: (element) => element && element.dataset ? element.dataset.pdkResizeMode || 'both' : 'both';
		const focusElement = typeof options.focusElement === 'function' ? options.focusElement : () => null;
		const getRelativeRect = typeof options.getRelativeRect === 'function' ? options.getRelativeRect : null;
		const getMinSize = typeof options.getMinSize === 'function' ? options.getMinSize : readComputedMinSize;
		const syncSafeArea = typeof options.syncSafeArea === 'function' ? options.syncSafeArea : () => ({});
		const isResizeDisabled = typeof options.isResizeDisabled === 'function' ? options.isResizeDisabled : () => false;
		const onResizeStart = typeof options.onResizeStart === 'function' ? options.onResizeStart : () => null;
		const onResizeEnd = typeof options.onResizeEnd === 'function' ? options.onResizeEnd : () => null;

		function normalizeSafeArea(safeArea = {}) {
			return {
				bottom: readNumber(safeArea.bottom) ?? 0,
				left: readNumber(safeArea.left) ?? 0,
				right: readNumber(safeArea.right) ?? 0,
				top: readNumber(safeArea.top) ?? 0
			};
		}

		function readComputedMinSize(element) {
			const styles = window.getComputedStyle(element);

			return {
				height: readNumber(styles.minHeight) ?? 140,
				width: readNumber(styles.minWidth) ?? 180
			};
		}

		function readRelativeRect(container, element) {
			if (getRelativeRect) {
				return getRelativeRect(element);
			}

			const containerRect = container.getBoundingClientRect();
			const rect = element.getBoundingClientRect();

			return {
				height: Math.round(rect.height),
				left: Math.round(rect.left - containerRect.left),
				top: Math.round(rect.top - containerRect.top),
				width: Math.round(rect.width)
			};
		}

		function getResizeDirections(element) {
			const mode = getResizeMode(element);

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

		function ensureResizeHandles(element) {
			if (!element || element.dataset[boundDatasetKey] === '1') {
				return;
			}

			element.dataset[boundDatasetKey] = '1';

			getResizeDirections(element).forEach((direction) => {
				const handle = document.createElement('span');
				handle.className = `${handleClassPrefix} ${handleClassPrefix}-${direction}`;
				handle.dataset.pdkResizeHandle = direction;
				handle.setAttribute('aria-hidden', 'true');

				handle.addEventListener('pointerdown', (event) => {
					startResize(element, handle, direction, event);
				});
				handle.addEventListener('mousedown', (event) => {
					startResize(element, handle, direction, event);
				});

				element.appendChild(handle);
			});
		}

		function startResize(element, handle, direction, event) {
			const container = getContainer();

			if (
				!container
				|| !element
				|| (Number.isFinite(event.button) && event.button !== 0)
				|| element.classList.contains('is-resizing')
				|| isResizeDisabled(element, direction, event)
				|| !getResizeDirections(element).includes(direction)
			) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			focusElement(element, event);
			onResizeStart(element, direction, event);

			const startRect = readRelativeRect(container, element);
			const minSize = getMinSize(element);
			const startX = event.clientX;
			const startY = event.clientY;
			const startLeft = startRect.left;
			const startTop = startRect.top;
			const startWidth = startRect.width;
			const startHeight = startRect.height;

			element.classList.add('is-resizing');
			element.style.transform = 'none';
			element.style.left = `${startLeft}px`;
			element.style.top = `${startTop}px`;
			element.style.width = `${startWidth}px`;
			element.style.height = `${startHeight}px`;

			const pointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;

			if (pointerId !== null && typeof handle.setPointerCapture === 'function') {
				try {
					handle.setPointerCapture(pointerId);
				} catch {
					// Window-level listeners below keep resizing reliable if capture is unavailable.
				}
			}

			const move = (moveEvent) => {
				const safeArea = normalizeSafeArea(syncSafeArea(element, direction, moveEvent));
				const deltaX = moveEvent.clientX - startX;
				const deltaY = moveEvent.clientY - startY;
				const maxRight = Math.max(safeArea.left, container.clientWidth - safeArea.right);
				const maxBottom = Math.max(safeArea.top, container.clientHeight - safeArea.bottom);
				let nextLeft = startLeft;
				let nextTop = startTop;
				let nextWidth = startWidth;
				let nextHeight = startHeight;

				if (direction.includes('e')) {
					nextWidth = clamp(startWidth + deltaX, minSize.width, maxRight - startLeft);
				}

				if (direction.includes('s')) {
					nextHeight = clamp(startHeight + deltaY, minSize.height, maxBottom - startTop);
				}

				if (direction.includes('w')) {
					nextLeft = clamp(startLeft + deltaX, safeArea.left, startLeft + startWidth - minSize.width);
					nextWidth = startWidth + startLeft - nextLeft;
				}

				if (direction.includes('n')) {
					nextTop = clamp(startTop + deltaY, safeArea.top, startTop + startHeight - minSize.height);
					nextHeight = startHeight + startTop - nextTop;
				}

				nextWidth = Math.min(nextWidth, Math.max(minSize.width, maxRight - nextLeft));
				nextHeight = Math.min(nextHeight, Math.max(minSize.height, maxBottom - nextTop));

				element.style.left = `${Math.round(nextLeft)}px`;
				element.style.top = `${Math.round(nextTop)}px`;
				element.style.width = `${Math.round(nextWidth)}px`;
				element.style.height = `${Math.round(nextHeight)}px`;
			};

			const up = (upEvent) => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('mousemove', move);
				window.removeEventListener('pointerup', up);
				window.removeEventListener('mouseup', up);
				window.removeEventListener('pointercancel', up);
				element.classList.remove('is-resizing');

				const releasePointerId = Number.isFinite(upEvent.pointerId) ? upEvent.pointerId : pointerId;

				if (
					releasePointerId !== null
					&& typeof handle.hasPointerCapture === 'function'
					&& typeof handle.releasePointerCapture === 'function'
					&& handle.hasPointerCapture(releasePointerId)
				) {
					handle.releasePointerCapture(releasePointerId);
				}

				const nextRect = readRelativeRect(container, element);
				const changed = nextRect.left !== startLeft
					|| nextRect.top !== startTop
					|| nextRect.width !== startWidth
					|| nextRect.height !== startHeight;

				onResizeEnd(element, {
					changed,
					direction,
					event: upEvent,
					nextRect,
					startRect
				});
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('mousemove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('mouseup', up);
			window.addEventListener('pointercancel', up);
		}

		return {
			ensureResizeHandles,
			getResizeDirections,
			startResize
		};
	};
})();
