(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createShellDialogs = function createShellDialogs(shell) {
		let activeDialog = null;
		let activeOverlay = null;

		function createButton(label, className) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className;
			button.textContent = label;
			return button;
		}

		function removeLayer(layer) {
			if (layer && layer.parentNode) {
				layer.parentNode.removeChild(layer);
			}
		}

		function closeActiveDialog() {
			if (activeDialog) {
				removeLayer(activeDialog);
				activeDialog = null;
			}
		}

		function confirm(options = {}) {
			closeActiveDialog();

			return new Promise((resolve) => {
				const title = options.title || '';
				const message = options.message || '';
				const confirmLabel = options.confirmLabel || 'OK';
				const cancelLabel = options.cancelLabel || 'Cancel';
				const titleId = `aos-shell-dialog-title-${Date.now()}`;
				const messageId = `aos-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'aos-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'aos-shell-dialog';
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				const titleElement = document.createElement('h2');
				titleElement.className = 'aos-shell-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;

				const messageElement = document.createElement('p');
				messageElement.className = 'aos-shell-dialog-message';
				messageElement.id = messageId;
				messageElement.textContent = message;

				const actions = document.createElement('div');
				actions.className = 'aos-shell-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'aos-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'aos-shell-dialog-button aos-shell-dialog-button-primary');

				function finish(confirmed) {
					layer.removeEventListener('keydown', onKeyDown);
					closeActiveDialog();
					resolve(confirmed);
				}

				function onKeyDown(event) {
					if (event.key === 'Escape') {
						event.preventDefault();
						finish(false);
					}
				}

				cancelButton.addEventListener('click', () => finish(false));
				confirmButton.addEventListener('click', () => finish(true));
				layer.addEventListener('keydown', onKeyDown);

				actions.append(cancelButton, confirmButton);
				dialog.append(titleElement, messageElement, actions);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					confirmButton.focus({ preventScroll: true });
				});
			});
		}

		function showBlockingOverlay(message) {
			if (activeOverlay) {
				removeLayer(activeOverlay);
			}

			closeActiveDialog();

			const overlay = document.createElement('div');
			overlay.className = 'aos-shell-restart-overlay';
			overlay.setAttribute('role', 'status');
			overlay.setAttribute('aria-live', 'polite');

			const label = document.createElement('div');
			label.className = 'aos-shell-restart-message';
			label.textContent = message || '';

			overlay.appendChild(label);
			shell.appendChild(overlay);
			activeOverlay = overlay;

			window.requestAnimationFrame(() => {
				overlay.classList.add('is-visible');
			});

			return {
				close() {
					removeLayer(overlay);
					if (activeOverlay === overlay) {
						activeOverlay = null;
					}
				}
			};
		}

		return {
			confirm,
			showBlockingOverlay
		};
	};
})();
