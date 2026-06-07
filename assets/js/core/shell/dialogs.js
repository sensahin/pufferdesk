(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createShellDialogs = function createShellDialogs(shell) {
		const dom = window.AdminOSMode.dom || null;
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
			icon.className = 'aos-shell-action-dialog-icon';
			icon.setAttribute('aria-hidden', 'true');

			if (iconValue === 'power') {
				icon.classList.add('aos-shell-action-dialog-icon-power');
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
					countdown.className = 'aos-shell-action-dialog-countdown';
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
			closeActiveDialog();

			return new Promise((resolve) => {
				const secondsTotal = Number.parseInt(options.countdownSeconds, 10);
				const countdownSeconds = Number.isFinite(secondsTotal) && secondsTotal > 0 ? secondsTotal : 60;
				const title = options.title || '';
				const messageTemplate = options.message || '';
				const confirmLabel = options.confirmLabel || 'OK';
				const cancelLabel = options.cancelLabel || 'Cancel';
				const reopenWindowsLabel = options.reopenWindowsLabel || '';
				const reopenWindowsDefault = options.reopenWindowsDefault === true;
				const titleId = `aos-shell-dialog-title-${Date.now()}`;
				const messageId = `aos-shell-dialog-message-${Date.now()}`;
				const countdownDigitCount = String(countdownSeconds).length;
				let remaining = countdownSeconds;
				let timerId = null;

				const layer = document.createElement('div');
				layer.className = 'aos-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'aos-shell-dialog aos-shell-action-dialog';
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				const icon = createActionIcon(options.icon || 'power');

				const titleElement = document.createElement('h2');
				titleElement.className = 'aos-shell-dialog-title aos-shell-action-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;

				const messageElement = document.createElement('p');
				messageElement.className = 'aos-shell-dialog-message aos-shell-action-dialog-message';
				messageElement.id = messageId;

				const checkboxLabel = document.createElement('label');
				checkboxLabel.className = 'aos-shell-action-dialog-checkbox';

				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.checked = reopenWindowsDefault;

				const checkboxBox = document.createElement('span');
				checkboxBox.className = 'aos-shell-action-dialog-checkbox-box';

				const checkboxText = document.createElement('span');
				checkboxText.className = 'aos-shell-action-dialog-checkbox-label';
				checkboxText.textContent = reopenWindowsLabel;

				checkboxLabel.append(checkbox, checkboxBox, checkboxText);

				const actions = document.createElement('div');
				actions.className = 'aos-shell-dialog-actions aos-shell-action-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'aos-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'aos-shell-dialog-button aos-shell-dialog-button-primary');

				function updateMessage() {
					renderCountdownMessage(messageElement, messageTemplate, remaining, countdownDigitCount);
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
				timerId = window.setInterval(() => {
					remaining -= 1;
					updateMessage();

					if (remaining <= 0) {
						finish(true, 'timeout');
					}
				}, 1000);

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

		function prompt(options = {}) {
			closeActiveDialog();

			return new Promise((resolve) => {
				const title = options.title || '';
				const message = options.message || '';
				const value = typeof options.value === 'string' ? options.value : '';
				const confirmLabel = options.confirmLabel || 'OK';
				const cancelLabel = options.cancelLabel || 'Cancel';
				const titleId = `aos-shell-dialog-title-${Date.now()}`;
				const messageId = `aos-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'aos-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'aos-shell-dialog aos-shell-prompt-dialog';
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

				const input = document.createElement('input');
				input.className = 'aos-shell-dialog-input';
				input.type = 'text';
				input.value = value;

				const actions = document.createElement('div');
				actions.className = 'aos-shell-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'aos-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'aos-shell-dialog-button aos-shell-dialog-button-primary');

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
			overlay.className = 'aos-shell-blocking-overlay';
			overlay.setAttribute('role', 'status');
			overlay.setAttribute('aria-live', 'polite');

			const label = document.createElement('div');
			label.className = 'aos-shell-blocking-message';
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
			confirmTimedAction,
			prompt,
			showBlockingOverlay
		};
	};
})();
