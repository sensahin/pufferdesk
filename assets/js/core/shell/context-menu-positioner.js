(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextMenuPositioner = function createContextMenuPositioner(shell) {
		const geometry = window.PufferDesk.geometry;
		const targets = window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};

		function clamp(value, min, max) {
			if (geometry && typeof geometry.clamp === 'function') {
				return geometry.clamp(value, min, max);
			}

			return Math.max(min, Math.min(max, value));
		}

		function getBounds(popover) {
			const minLeft = 8;
			const minTop = 8;

			return {
				maxLeft: Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8),
				maxTop: Math.max(minTop, shell.clientHeight - popover.offsetHeight - 8),
				minLeft,
				minTop,
				shellRect: shell.getBoundingClientRect()
			};
		}

		function positionDockMenu(popover, detail = {}) {
			const target = detail.targetElement;
			if (!popover || !target || typeof target.getBoundingClientRect !== 'function') {
				return false;
			}

			const bounds = getBounds(popover);
			const targetRect = target.getBoundingClientRect();
			const dockPosition = shell.dataset.pdkDockPosition || 'bottom';
			const targetCenterX = targetRect.left - bounds.shellRect.left + (targetRect.width / 2);
			const targetCenterY = targetRect.top - bounds.shellRect.top + (targetRect.height / 2);
			const gap = 26;
			const preferredMenuOffset = clamp(Math.round(popover.offsetWidth * 0.24), 52, 66);
			let left = targetCenterX - preferredMenuOffset;
			let top = targetRect.top - bounds.shellRect.top - popover.offsetHeight - gap;

			if (dockPosition === 'left') {
				left = targetRect.right - bounds.shellRect.left + gap;
				top = targetCenterY - (popover.offsetHeight / 2);
			} else if (dockPosition === 'right') {
				left = targetRect.left - bounds.shellRect.left - popover.offsetWidth - gap;
				top = targetCenterY - (popover.offsetHeight / 2);
			}

			popover.style.left = `${clamp(Math.round(left), bounds.minLeft, bounds.maxLeft)}px`;
			popover.style.top = `${clamp(Math.round(top), bounds.minTop, bounds.maxTop)}px`;

			return true;
		}

		function positionAtPoint(popover, point = {}, detail = {}) {
			if (!popover) {
				return;
			}

			if (detail.type === targets.DOCK_APP && positionDockMenu(popover, detail)) {
				return;
			}

			const bounds = getBounds(popover);
			const clientX = Number.isFinite(point.x) ? point.x : 0;
			const clientY = Number.isFinite(point.y) ? point.y : 0;
			const left = clamp(Math.round(clientX - bounds.shellRect.left), bounds.minLeft, bounds.maxLeft);
			const top = clamp(Math.round(clientY - bounds.shellRect.top), bounds.minTop, bounds.maxTop);

			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;
		}

		function positionAtElement(popover, target, point = {}, detail = {}) {
			if (!target || typeof target.getBoundingClientRect !== 'function') {
				positionAtPoint(popover, point, detail);
				return;
			}

			const rect = target.getBoundingClientRect();
			positionAtPoint(popover, {
				x: Number.isFinite(point.x) ? point.x : rect.left + (rect.width / 2),
				y: Number.isFinite(point.y) ? point.y : rect.top + (rect.height / 2)
			}, detail);
		}

		return {
			positionAtElement,
			positionAtPoint,
			positionDockMenu
		};
	};
})();
