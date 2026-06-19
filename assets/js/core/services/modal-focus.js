(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	const focusableSelector = [
		'a[href]',
		'area[href]',
		'button:not([disabled])',
		'input:not([disabled]):not([type="hidden"])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'iframe',
		'object',
		'embed',
		'[contenteditable]:not([contenteditable="false"])',
		'[tabindex]:not([tabindex="-1"])'
	].join(',');

	function isVisible(element) {
		return Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
	}

	function isFocusable(element) {
		if (!element || typeof element.focus !== 'function' || element.disabled || element.getAttribute('aria-hidden') === 'true') {
			return false;
		}

		if (element.tabIndex < 0 && !element.matches(focusableSelector)) {
			return false;
		}

		return isVisible(element);
	}

	function getFocusableElements(container) {
		if (!container || typeof container.querySelectorAll !== 'function') {
			return [];
		}

		return Array.from(container.querySelectorAll(focusableSelector)).filter(isFocusable);
	}

	function focusElement(element) {
		if (!isFocusable(element) && !(element && typeof element.focus === 'function')) {
			return false;
		}

		try {
			element.focus({ preventScroll: true });
		} catch {
			element.focus();
		}

		return true;
	}

	function resolveTarget(target, panel) {
		return typeof target === 'function' ? target(panel) : target || null;
	}

	function createTrap(options = {}) {
		const layer = options.layer || options.container || null;
		const panel = options.panel || layer;
		const keydownTarget = layer || panel;
		const previousFocus = document.activeElement && document.activeElement !== document.body
			? document.activeElement
			: null;
		let active = false;

		function getInitialFocus() {
			return resolveTarget(options.initialFocus, panel) || getFocusableElements(panel)[0] || panel;
		}

		function focusInitial() {
			return focusElement(getInitialFocus());
		}

		function handleKeydown(event) {
			if (!active) {
				return;
			}

			if (event.key === 'Escape' && typeof options.onEscape === 'function') {
				event.preventDefault();
				options.onEscape(event);
				return;
			}

			if (event.key !== 'Tab') {
				return;
			}

			const focusable = getFocusableElements(panel);
			if (!focusable.length) {
				event.preventDefault();
				focusElement(panel);
				return;
			}

			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const current = document.activeElement;

			if (event.shiftKey && (current === first || !panel.contains(current))) {
				event.preventDefault();
				focusElement(last);
				return;
			}

			if (!event.shiftKey && current === last) {
				event.preventDefault();
				focusElement(first);
			}
		}

		function handleFocusin(event) {
			if (active && panel && !panel.contains(event.target)) {
				focusInitial();
			}
		}

		return {
			activate() {
				if (active || !panel || !keydownTarget) {
					return;
				}

				active = true;
				if (!panel.hasAttribute('tabindex')) {
					panel.tabIndex = -1;
				}
				keydownTarget.addEventListener('keydown', handleKeydown, true);
				document.addEventListener('focusin', handleFocusin, true);
				window.setTimeout(focusInitial, 0);
			},

			deactivate(deactivateOptions = {}) {
				if (!active) {
					return;
				}

				active = false;
				keydownTarget.removeEventListener('keydown', handleKeydown, true);
				document.removeEventListener('focusin', handleFocusin, true);
				if (deactivateOptions.restoreFocus !== false && previousFocus && previousFocus.isConnected) {
					focusElement(previousFocus);
				}
			},

			focusInitial
		};
	}

	window.PufferDesk.services.modalFocus = {
		createTrap,
		focusElement,
		getFocusableElements
	};
})();
