(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextMenuKeyboardController = function createContextMenuKeyboardController(options = {}) {
		const onClose = typeof options.onClose === 'function' ? options.onClose : () => {};

		function getFocusableItems(container) {
			if (!container) {
				return [];
			}

			return Array.from(container.querySelectorAll('.pdk-menu-item:not(:disabled), .pdk-menu-action-strip-button:not(:disabled)'))
				.filter((item) => item.offsetParent !== null || item.getClientRects().length > 0);
		}

		function getCurrentMenu(target, root) {
			const submenu = target && typeof target.closest === 'function'
				? target.closest('.pdk-menu-submenu-popover')
				: null;

			return submenu || root;
		}

		function focusAt(items, index) {
			if (!items.length) {
				return;
			}

			const nextIndex = ((index % items.length) + items.length) % items.length;
			items[nextIndex].focus({ preventScroll: true });
		}

		function focusRelative(event, direction) {
			const menu = getCurrentMenu(event.target, event.currentTarget);
			const items = getFocusableItems(menu);
			const index = items.indexOf(event.target);

			event.preventDefault();
			focusAt(items, index < 0 ? 0 : index + direction);
		}

		function focusEdge(event, edge) {
			const menu = getCurrentMenu(event.target, event.currentTarget);
			const items = getFocusableItems(menu);

			event.preventDefault();
			focusAt(items, edge === 'last' ? items.length - 1 : 0);
		}

		function activateFocused(event) {
			const target = event.target;
			if (!target || !target.classList || (!target.classList.contains('pdk-menu-item') && !target.classList.contains('pdk-menu-action-strip-button'))) {
				return;
			}

			event.preventDefault();
			target.click();
		}

		function focusParentSubmenu(event) {
			const submenu = event.target && typeof event.target.closest === 'function'
				? event.target.closest('.pdk-menu-submenu')
				: null;
			const trigger = submenu ? submenu.querySelector('.pdk-menu-submenu-trigger') : null;

			if (!trigger) {
				return false;
			}

			event.preventDefault();
			submenu.classList.remove('is-open');
			trigger.setAttribute('aria-expanded', 'false');
			trigger.focus({ preventScroll: true });

			return true;
		}

		function bind(popover) {
			if (!popover) {
				return () => {};
			}

			const keydown = (event) => {
				if (event.key === 'ArrowDown') {
					focusRelative(event, 1);
				} else if (event.key === 'ArrowUp') {
					focusRelative(event, -1);
				} else if (event.key === 'Home') {
					focusEdge(event, 'first');
				} else if (event.key === 'End') {
					focusEdge(event, 'last');
				} else if (event.key === 'Enter' || event.key === ' ') {
					activateFocused(event);
				} else if (event.key === 'Escape') {
					event.preventDefault();
					onClose();
				} else if (event.key === 'ArrowLeft') {
					if (!focusParentSubmenu(event)) {
						onClose();
					}
				}
			};

			popover.addEventListener('keydown', keydown);

			return () => {
				popover.removeEventListener('keydown', keydown);
			};
		}

		function focusFirst(popover) {
			const first = getFocusableItems(popover)[0];
			if (first) {
				first.focus({ preventScroll: true });
			}
		}

		return {
			bind,
			focusFirst,
			getFocusableItems
		};
	};
})();
