(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	let dialogId = 0;

	function addClasses(element, classes) {
		String(classes || '').split(/\s+/).filter(Boolean).forEach((className) => {
			element.classList.add(className);
		});
	}

	function createElement(tagName, className = '', text = '') {
		const element = document.createElement(tagName);

		if (className) {
			element.className = className;
		}
		if (text) {
			element.textContent = text;
		}

		return element;
	}

	function getDefaultInitialFocus(panel) {
		return panel.querySelector('.pdk-native-dialog-content input, .pdk-native-dialog-content select, .pdk-native-dialog-content textarea, .pdk-native-dialog-content button')
			|| panel.querySelector('button');
	}

	function create(options = {}) {
		const mount = options.mount || options.root || document.body;
		const titleText = typeof options.title === 'string' ? options.title : String(options.title || '');
		const layer = createElement('div', 'pdk-native-dialog-layer');
		const panel = createElement('section', 'pdk-native-dialog');
		const header = createElement('header', 'pdk-native-dialog-header');
		const title = createElement('h3', 'pdk-native-dialog-title', titleText);
		const closeButton = createElement('button', 'pdk-native-dialog-close');
		const content = createElement('div', 'pdk-native-dialog-content');
		const footer = createElement('footer', 'pdk-native-dialog-footer');
		const status = createElement('div', 'pdk-native-dialog-status');
		const actions = createElement('div', 'pdk-native-dialog-actions');
		const focusService = window.PufferDesk.services.modalFocus || null;
		let trap = null;
		let closed = false;

		dialogId += 1;
		title.id = `pdk-native-dialog-title-${dialogId}`;
		layer.tabIndex = -1;
		layer.setAttribute('role', 'presentation');
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-modal', 'true');
		panel.setAttribute('aria-labelledby', title.id);
		closeButton.type = 'button';
		closeButton.setAttribute('aria-label', options.closeLabel || 'Close');
		status.setAttribute('role', 'status');
		status.setAttribute('aria-live', 'polite');
		status.setAttribute('aria-hidden', 'true');

		addClasses(layer, options.layerClassName);
		addClasses(panel, options.panelClassName);
		addClasses(header, options.headerClassName);
		addClasses(content, options.contentClassName);
		addClasses(footer, options.footerClassName);
		addClasses(status, options.statusClassName);

		header.append(title, closeButton);
		footer.append(status, actions);
		panel.append(header, content, footer);
		layer.appendChild(panel);
		mount.appendChild(layer);

		function setStatus(message, isError = false) {
			const nextMessage = typeof message === 'string' ? message.trim() : String(message || '').trim();

			status.textContent = nextMessage;
			status.setAttribute('aria-hidden', nextMessage ? 'false' : 'true');
			status.classList.toggle('has-message', Boolean(nextMessage));
			status.classList.toggle('is-error', Boolean(isError) && Boolean(nextMessage));
		}

		function close(closeOptions = {}) {
			if (closed) {
				return;
			}

			closed = true;
			if (trap && typeof trap.deactivate === 'function') {
				trap.deactivate({
					restoreFocus: closeOptions.restoreFocus !== false
				});
			}
			trap = null;
			if (layer.parentNode) {
				layer.parentNode.removeChild(layer);
			}
			if (typeof options.onClose === 'function') {
				options.onClose(closeOptions);
			}
		}

		closeButton.addEventListener('click', () => close());
		if (options.closeOnBackdrop !== false) {
			layer.addEventListener('click', (event) => {
				if (event.target === layer) {
					close();
				}
			});
		}

		if (focusService && typeof focusService.createTrap === 'function') {
			trap = focusService.createTrap({
				layer,
				panel,
				initialFocus: options.initialFocus || getDefaultInitialFocus,
				onEscape: () => close()
			});
			trap.activate();
		}

		return {
			close,
			actions,
			closeButton,
			content,
			footer,
			header,
			layer,
			panel,
			setStatus,
			status,
			title,
			focusInitial() {
				if (trap && typeof trap.focusInitial === 'function') {
					trap.focusInitial();
				}
			}
		};
	}

	window.PufferDesk.services.modalDialog = {
		create
	};
})();
