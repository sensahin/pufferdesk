(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createShellDialogs = function createShellDialogs(shell) {
		const dom = window.PufferDesk.dom || null;
		let activeDialog = null;
		let activeOverlay = null;

		function createButton(label, className) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className;
			button.textContent = label;
			return button;
		}

		function createActionIcon(iconValue) {
			const icon = document.createElement('span');
			icon.className = 'pdk-shell-action-dialog-icon';
			icon.setAttribute('aria-hidden', 'true');

			if (iconValue === 'power') {
				icon.classList.add('pdk-shell-action-dialog-icon-power');
				icon.appendChild(document.createElement('span'));
				return icon;
			}

			if (dom && typeof dom.createIcon === 'function') {
				icon.appendChild(dom.createIcon(iconValue || 'dashicons-admin-generic'));
			}

			return icon;
		}

		function renderCountdownMessage(element, template, seconds, digitCount) {
			const safeTemplate = String(template || '');
			const parts = safeTemplate.split('{seconds}');

			element.replaceChildren();

			if (parts.length === 1) {
				element.textContent = safeTemplate;
				return;
			}

			parts.forEach((part, index) => {
				if (part) {
					element.appendChild(document.createTextNode(part));
				}

				if (index < parts.length - 1) {
					const countdown = document.createElement('span');
					countdown.className = 'pdk-shell-action-dialog-countdown';
					countdown.style.minWidth = `${digitCount}ch`;
					countdown.textContent = String(seconds);
					element.appendChild(countdown);
				}
			});
		}

		function clamp(value, min, max) {
			return Math.min(Math.max(value, min), Math.max(min, max));
		}

		function isDragExcluded(target) {
			if (!target || typeof target.closest !== 'function') {
				return false;
			}

			return Boolean(target.closest('button, input, label, select, textarea, a'));
		}

		function bindDialogDrag(layer, dialog) {
			dialog.addEventListener('pointerdown', (event) => {
				if (event.button !== 0 || isDragExcluded(event.target)) {
					return;
				}

				event.preventDefault();

				const layerRect = layer.getBoundingClientRect();
				const dialogRect = dialog.getBoundingClientRect();
				const startX = event.clientX;
				const startY = event.clientY;
				const startLeft = dialogRect.left - layerRect.left;
				const startTop = dialogRect.top - layerRect.top;
				const maxLeft = Math.max(0, layerRect.width - dialogRect.width);
				const maxTop = Math.max(0, layerRect.height - dialogRect.height);

				function positionDialog(left, top) {
					dialog.style.position = 'absolute';
					dialog.style.left = `${clamp(left, 0, maxLeft)}px`;
					dialog.style.top = `${clamp(top, 0, maxTop)}px`;
					dialog.style.transform = 'none';
				}

				function onPointerMove(moveEvent) {
					positionDialog(startLeft + moveEvent.clientX - startX, startTop + moveEvent.clientY - startY);
				}

				function onPointerEnd(endEvent) {
					window.removeEventListener('pointermove', onPointerMove);
					window.removeEventListener('pointerup', onPointerEnd);
					window.removeEventListener('pointercancel', onPointerEnd);
					dialog.classList.remove('is-dragging');

					if (
						Number.isFinite(endEvent.pointerId) &&
						typeof dialog.hasPointerCapture === 'function' &&
						typeof dialog.releasePointerCapture === 'function' &&
						dialog.hasPointerCapture(endEvent.pointerId)
					) {
						dialog.releasePointerCapture(endEvent.pointerId);
					}
				}

				dialog.classList.add('is-dragging');
				positionDialog(startLeft, startTop);

				if (typeof dialog.setPointerCapture === 'function') {
					try {
						dialog.setPointerCapture(event.pointerId);
					} catch (error) {}
				}

				window.addEventListener('pointermove', onPointerMove);
				window.addEventListener('pointerup', onPointerEnd);
				window.addEventListener('pointercancel', onPointerEnd);
			});
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
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog';
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				const titleElement = document.createElement('h2');
				titleElement.className = 'pdk-shell-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;

				const messageElement = document.createElement('p');
				messageElement.className = 'pdk-shell-dialog-message';
				messageElement.id = messageId;
				messageElement.textContent = message;

				const actions = document.createElement('div');
				actions.className = 'pdk-shell-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'pdk-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'pdk-shell-dialog-button pdk-shell-dialog-button-primary');

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
				bindDialogDrag(layer, dialog);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					confirmButton.focus({ preventScroll: true });
				});
			});
		}

		function confirmActionDialog(options = {}, settings = {}) {
			closeActiveDialog();

			return new Promise((resolve) => {
				const hasTimer = settings.timed === true;
				const secondsTotal = Number.parseInt(options.countdownSeconds, 10);
				const countdownSeconds = hasTimer && Number.isFinite(secondsTotal) && secondsTotal > 0 ? secondsTotal : 60;
				const title = options.title || '';
				const messageTemplate = options.message || '';
				const confirmLabel = options.confirmLabel || 'OK';
				const cancelLabel = options.cancelLabel || 'Cancel';
				const reopenWindowsLabel = options.reopenWindowsLabel || '';
				const reopenWindowsDefault = options.reopenWindowsDefault === true;
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;
				const countdownDigitCount = String(countdownSeconds).length;
				let remaining = countdownSeconds;
				let timerId = null;

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog pdk-shell-action-dialog';
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				const icon = createActionIcon(options.icon || 'power');

				const titleElement = document.createElement('h2');
				titleElement.className = 'pdk-shell-dialog-title pdk-shell-action-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;

				const messageElement = document.createElement('p');
				messageElement.className = 'pdk-shell-dialog-message pdk-shell-action-dialog-message';
				messageElement.id = messageId;

				const checkboxLabel = document.createElement('label');
				checkboxLabel.className = 'pdk-shell-action-dialog-checkbox';

				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.checked = reopenWindowsDefault;

				const checkboxBox = document.createElement('span');
				checkboxBox.className = 'pdk-shell-action-dialog-checkbox-box';

				const checkboxText = document.createElement('span');
				checkboxText.className = 'pdk-shell-action-dialog-checkbox-label';
				checkboxText.textContent = reopenWindowsLabel;

				checkboxLabel.append(checkbox, checkboxBox, checkboxText);

				const actions = document.createElement('div');
				actions.className = 'pdk-shell-dialog-actions pdk-shell-action-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'pdk-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'pdk-shell-dialog-button pdk-shell-dialog-button-primary');

				function updateMessage() {
					if (hasTimer) {
						renderCountdownMessage(messageElement, messageTemplate, remaining, countdownDigitCount);
						return;
					}

					messageElement.textContent = messageTemplate;
				}

				function finish(confirmed, reason) {
					if (timerId) {
						window.clearInterval(timerId);
					}

					layer.removeEventListener('keydown', onKeyDown);
					closeActiveDialog();
					resolve({
						confirmed,
						reason,
						reopenWindows: checkbox.checked
					});
				}

				function onKeyDown(event) {
					if (event.key === 'Escape') {
						event.preventDefault();
						finish(false, 'cancel');
					}
				}

				updateMessage();
				if (hasTimer) {
					timerId = window.setInterval(() => {
						remaining -= 1;
						updateMessage();

						if (remaining <= 0) {
							finish(true, 'timeout');
						}
					}, 1000);
				}

				cancelButton.addEventListener('click', () => finish(false, 'cancel'));
				confirmButton.addEventListener('click', () => finish(true, 'confirm'));
				layer.addEventListener('keydown', onKeyDown);

				actions.append(cancelButton, confirmButton);
				dialog.append(icon, titleElement, messageElement);
				if (reopenWindowsLabel) {
					dialog.appendChild(checkboxLabel);
				}
				dialog.appendChild(actions);
				bindDialogDrag(layer, dialog);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					confirmButton.focus({ preventScroll: true });
				});
			});
		}

		function confirmTimedAction(options = {}) {
			return confirmActionDialog(options, {
				timed: true
			});
		}

		function prompt(options = {}) {
			closeActiveDialog();

			return new Promise((resolve) => {
				const title = options.title || '';
				const message = options.message || '';
				const value = typeof options.value === 'string' ? options.value : '';
				const confirmLabel = options.confirmLabel || 'OK';
				const cancelLabel = options.cancelLabel || 'Cancel';
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog pdk-shell-prompt-dialog';
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				const titleElement = document.createElement('h2');
				titleElement.className = 'pdk-shell-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;

				const messageElement = document.createElement('p');
				messageElement.className = 'pdk-shell-dialog-message';
				messageElement.id = messageId;
				messageElement.textContent = message;

				const input = document.createElement('input');
				input.className = 'pdk-shell-dialog-input';
				input.type = 'text';
				input.value = value;

				const actions = document.createElement('div');
				actions.className = 'pdk-shell-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'pdk-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'pdk-shell-dialog-button pdk-shell-dialog-button-primary');

				function finish(nextValue) {
					layer.removeEventListener('keydown', onKeyDown);
					closeActiveDialog();
					resolve(nextValue);
				}

				function onKeyDown(event) {
					if (event.key === 'Escape') {
						event.preventDefault();
						finish(null);
					} else if (event.key === 'Enter' && event.target === input) {
						event.preventDefault();
						finish(input.value);
					}
				}

				cancelButton.addEventListener('click', () => finish(null));
				confirmButton.addEventListener('click', () => finish(input.value));
				layer.addEventListener('keydown', onKeyDown);

				actions.append(cancelButton, confirmButton);
				dialog.append(titleElement, messageElement, input, actions);
				bindDialogDrag(layer, dialog);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					input.focus({ preventScroll: true });
					input.select();
				});
			});
		}

		function showBlockingOverlay(message) {
			if (activeOverlay) {
				removeLayer(activeOverlay);
			}

			closeActiveDialog();

			const overlay = document.createElement('div');
			overlay.className = 'pdk-shell-blocking-overlay';
			overlay.setAttribute('role', 'status');
			overlay.setAttribute('aria-live', 'polite');

			const label = document.createElement('div');
			label.className = 'pdk-shell-blocking-message';
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
			confirmActionDialog,
			confirmTimedAction,
			prompt,
			showBlockingOverlay
		};
	};
})();
