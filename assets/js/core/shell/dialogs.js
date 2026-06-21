(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createShellDialogs = function createShellDialogs(shell) {
			const dom = window.PufferDesk.dom || null;
			const geometry = window.PufferDesk.geometry;
			let activeDialog = null;
		let activeOverlay = null;

		function getRuntimeConfig() {
			return window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
				? window.PufferDesk.config.get()
				: (window.pufferDesk || {});
		}

		function getDialogConfig() {
			const config = getRuntimeConfig();

			return config.dialogs && typeof config.dialogs === 'object' ? config.dialogs : {};
		}

		function getDialogLabel(key) {
			const dialogs = getDialogConfig();
			const labels = dialogs.labels && typeof dialogs.labels === 'object' ? dialogs.labels : {};
			const value = labels[key];

			if (typeof value === 'string' && value) {
				return value;
			}

			return getMenuLabel(key);
		}

		function getMenuLabel(key) {
			const config = getRuntimeConfig();
			const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};
			const labels = menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
			const value = labels[key];

			return typeof value === 'string' && value ? value : key;
		}

		function getDocumentLabel(key) {
			const config = getRuntimeConfig();
			const documents = config.documents && typeof config.documents === 'object' ? config.documents : {};
			const labels = documents.labels && typeof documents.labels === 'object' ? documents.labels : {};
			const value = labels[key];

			return typeof value === 'string' && value ? value : getMenuLabel(key);
		}

		function normalizeClassToken(value, fallback = 'default') {
			const token = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);

			return token || fallback;
		}

		function getDialogStyle(options = {}) {
			const dialogs = getDialogConfig();
			const style = options.style || dialogs.style || 'floating';

			return ['floating', 'system-window'].includes(style) ? style : 'floating';
		}

		function getDefaultAction(options = {}) {
			return options.defaultAction === 'cancel' || options.default_action === 'cancel' ? 'cancel' : 'confirm';
		}

		function applyDialogMetadata(layer, dialog, options = {}, fallbackVariant = 'default') {
			const style = getDialogStyle(options);
			const variant = normalizeClassToken(options.variant, fallbackVariant);

			layer.dataset.pdkDialogStyle = style;
			layer.dataset.pdkDialogVariant = variant;
			dialog.dataset.pdkDialogStyle = style;
			dialog.dataset.pdkDialogVariant = variant;
			dialog.dataset.pdkDefaultAction = getDefaultAction(options);
		}

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
				icon.appendChild(dom.createIcon(iconValue));
			}

			return icon;
		}

		function createDialogIcon(iconValue) {
			const icon = document.createElement('span');
			icon.className = 'pdk-shell-dialog-icon';
			icon.setAttribute('aria-hidden', 'true');

			if (dom && typeof dom.createIcon === 'function') {
				icon.appendChild(dom.createIcon(iconValue || 'dashicons-info-outline'));
			}

			return icon;
		}

		function normalizeDetails(options = {}) {
			if (Array.isArray(options.details)) {
				return options.details;
			}

			if (options.detail && typeof options.detail === 'object') {
				return [options.detail];
			}

			if (options.item && typeof options.item === 'object') {
				return [options.item];
			}

			return [];
		}

		function createDialogDetails(options = {}) {
			const details = normalizeDetails(options);
			if (!details.length) {
				return null;
			}

			const list = document.createElement('div');
			list.className = 'pdk-shell-dialog-details';

			details.forEach((detail) => {
				if (!detail || typeof detail !== 'object') {
					return;
				}

				const row = document.createElement('div');
				row.className = 'pdk-shell-dialog-detail';

				if (detail.icon) {
					row.appendChild(createDialogIcon(detail.icon));
				}

				const text = document.createElement('div');
				text.className = 'pdk-shell-dialog-detail-text';

				const label = document.createElement('strong');
				label.className = 'pdk-shell-dialog-detail-label';
				label.textContent = detail.label || '';
				text.appendChild(label);

				(Array.isArray(detail.meta) ? detail.meta : []).forEach((line) => {
					if (!line) {
						return;
					}

					const meta = document.createElement('span');
					meta.className = 'pdk-shell-dialog-detail-meta';
					meta.textContent = line;
					text.appendChild(meta);
				});

				row.appendChild(text);
				list.appendChild(row);
			});

			return list.childElementCount ? list : null;
		}

		function createDialogTitlebar(title, closeLabel, onClose) {
			const titlebar = document.createElement('div');
			titlebar.className = 'pdk-shell-dialog-titlebar';

			const label = document.createElement('span');
			label.className = 'pdk-shell-dialog-titlebar-label';
			label.textContent = title || '';

			const labelText = closeLabel || getDialogLabel('close');
			const closeButton = createButton(labelText, 'pdk-shell-dialog-titlebar-close');
			closeButton.setAttribute('aria-label', labelText);
			closeButton.addEventListener('click', onClose);

			titlebar.append(label, closeButton);

			return titlebar;
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
					dialog.style.left = `${geometry.clamp(left, 0, maxLeft)}px`;
					dialog.style.top = `${geometry.clamp(top, 0, maxTop)}px`;
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
				const confirmLabel = options.confirmLabel || getDialogLabel('confirm');
				const cancelLabel = options.cancelLabel || getDialogLabel('cancel');
				const closeLabel = options.closeLabel || getDialogLabel('close');
				const windowTitle = options.windowTitle || '';
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog';
				applyDialogMetadata(layer, dialog, options, 'confirm');
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
				messageElement.hidden = !message;

				const body = document.createElement('div');
				body.className = 'pdk-shell-dialog-body';

				if (options.icon) {
					body.appendChild(createDialogIcon(options.icon));
				}

				const copy = document.createElement('div');
				copy.className = 'pdk-shell-dialog-copy';
				copy.append(titleElement, messageElement);

				const details = createDialogDetails(options);
				if (details) {
					copy.appendChild(details);
				}

				body.appendChild(copy);

				const actions = document.createElement('div');
				actions.className = 'pdk-shell-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'pdk-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'pdk-shell-dialog-button pdk-shell-dialog-button-primary');
				const initialFocusButton = getDefaultAction(options) === 'cancel' ? cancelButton : confirmButton;

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
				if (windowTitle || getDialogStyle(options) === 'system-window') {
					dialog.appendChild(createDialogTitlebar(windowTitle || title, closeLabel, () => finish(false)));
				}
				dialog.append(body, actions);
				bindDialogDrag(layer, dialog);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					initialFocusButton.focus({ preventScroll: true });
				});
			});
		}

		function choose(options = {}) {
			closeActiveDialog();

			return new Promise((resolve) => {
				const title = options.title || '';
				const message = options.message || '';
				const actions = Array.isArray(options.actions) && options.actions.length
					? options.actions
					: [
						{ id: 'cancel', label: getMenuLabel('cancel'), variant: 'cancel' }
					];
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog pdk-shell-choice-dialog';
				applyDialogMetadata(layer, dialog, options, 'choice');
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				if (options.icon) {
					dialog.appendChild(createDialogIcon(options.icon));
				}

				const copy = document.createElement('div');
				copy.className = 'pdk-shell-dialog-copy pdk-shell-choice-dialog-copy';

				const titleElement = document.createElement('h2');
				titleElement.className = 'pdk-shell-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;
				copy.appendChild(titleElement);

				const messageElement = document.createElement('p');
				messageElement.className = 'pdk-shell-dialog-message';
				messageElement.id = messageId;
				messageElement.textContent = message;
				messageElement.hidden = !message;
				copy.appendChild(messageElement);

				dialog.appendChild(copy);

				const actionList = document.createElement('div');
				actionList.className = 'pdk-shell-dialog-actions pdk-shell-choice-dialog-actions';
				let initialFocusButton = null;

				function finish(actionId) {
					layer.removeEventListener('keydown', onKeyDown);
					closeActiveDialog();
					resolve(actionId);
				}

				function onKeyDown(event) {
					if (event.key === 'Escape') {
						event.preventDefault();
						finish(options.cancelAction || 'cancel');
					}
				}

				actions.forEach((action) => {
					const actionId = action && action.id ? String(action.id) : '';
					const label = action && action.label ? String(action.label) : actionId;
					const variant = action && action.variant ? normalizeClassToken(action.variant, '') : '';
					const button = createButton(label, `pdk-shell-dialog-button pdk-shell-choice-dialog-button${variant ? ` pdk-shell-dialog-button-${variant}` : ''}`);

					button.addEventListener('click', () => finish(actionId));
					actionList.appendChild(button);

					if (!initialFocusButton || action.default === true) {
						initialFocusButton = button;
					}
				});

				layer.addEventListener('keydown', onKeyDown);
				dialog.appendChild(actionList);
				bindDialogDrag(layer, dialog);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					if (initialFocusButton) {
						initialFocusButton.focus({ preventScroll: true });
					}
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
				const confirmLabel = options.confirmLabel || getDialogLabel('confirm');
				const cancelLabel = options.cancelLabel || getDialogLabel('cancel');
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
				applyDialogMetadata(layer, dialog, options, hasTimer ? 'timed-action' : 'action');
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
				const confirmLabel = options.confirmLabel || getDialogLabel('confirm');
				const cancelLabel = options.cancelLabel || getDialogLabel('cancel');
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog pdk-shell-prompt-dialog';
				applyDialogMetadata(layer, dialog, options, 'prompt');
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

		function getLocationOptionLabel(location) {
			return location.label && location.label !== location.path
				? location.label
				: location.where || location.path;
		}

		function getSaveDialogLocations(options = {}) {
			const config = getRuntimeConfig();
			const virtualFilesystem = window.PufferDesk.virtualFilesystem && typeof window.PufferDesk.virtualFilesystem.create === 'function'
				? window.PufferDesk.virtualFilesystem.create(config)
				: null;
			const folderManager = window.PufferDesk.desktopFolderManager && typeof window.PufferDesk.desktopFolderManager.getFolders === 'function'
				? window.PufferDesk.desktopFolderManager
				: null;
			const folders = virtualFilesystem && typeof virtualFilesystem.getFolders === 'function'
				? virtualFilesystem.getFolders()
				: [];
			const seen = new Set();
			const locations = [];

			function getFolderWhereLabel(path, options = {}) {
				if (typeof options.where === 'string' && options.where) {
					return options.where;
				}

				return virtualFilesystem && typeof virtualFilesystem.getWhereLabel === 'function'
					? virtualFilesystem.getWhereLabel(path)
					: path;
			}

			function addLocation(folder, options = {}) {
				const path = folder && typeof folder.path === 'string' ? folder.path : '';

				if (!path || seen.has(path) || folder.special === 'trash') {
					return;
				}

				seen.add(path);
				locations.push({
					label: folder.label || path,
					path,
					where: getFolderWhereLabel(path, options)
				});
			}

			folders.forEach((folder) => {
				addLocation(folder);
			});

			if (folderManager) {
				folderManager.getFolders().forEach((folder) => {
					addLocation(folder, {
						where: folder && typeof folder.label === 'string' && folder.label ? folder.label : ''
					});
				});
			}

			if (
				options.parentPath
				&& !seen.has(options.parentPath)
				&& virtualFilesystem
				&& typeof virtualFilesystem.getDisplayPath === 'function'
			) {
				locations.push({
					label: virtualFilesystem.getDisplayPath(options.parentPath),
					path: options.parentPath,
					where: virtualFilesystem.getWhereLabel(options.parentPath)
				});
			}

			return {
				locations,
				virtualFilesystem
			};
		}

		function saveDocument(options = {}) {
			closeActiveDialog();

			return new Promise((resolve) => {
				const title = options.title || getDocumentLabel('saveStickyNoteTitle');
				const initialName = typeof options.value === 'string' && options.value.trim()
					? options.value.trim()
					: getDocumentLabel('untitledStickyNote');
				const closeLabel = options.closeLabel || getDialogLabel('close');
				const confirmLabel = options.confirmLabel || getDocumentLabel('save');
				const cancelLabel = options.cancelLabel || getDocumentLabel('cancel');
				const titleId = `pdk-shell-dialog-title-${Date.now()}`;
				const messageId = `pdk-shell-dialog-message-${Date.now()}`;
				const locationData = getSaveDialogLocations(options);
				const locations = locationData.locations;
				const virtualFilesystem = locationData.virtualFilesystem;
				const defaultParentPath = options.parentPath
					|| (
						options.kind
						&& virtualFilesystem
						&& typeof virtualFilesystem.getDefaultPathForKind === 'function'
							? virtualFilesystem.getDefaultPathForKind(options.kind)
							: ''
					)
					|| (locations[0] ? locations[0].path : '');

				const layer = document.createElement('div');
				layer.className = 'pdk-shell-dialog-layer';

				const dialog = document.createElement('div');
				dialog.className = 'pdk-shell-dialog pdk-shell-document-save-dialog';
				applyDialogMetadata(layer, dialog, options, 'document-save');
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');
				dialog.setAttribute('aria-labelledby', titleId);
				dialog.setAttribute('aria-describedby', messageId);

				const titleElement = document.createElement('h2');
				titleElement.className = 'pdk-shell-dialog-title';
				titleElement.id = titleId;
				titleElement.textContent = title;

				const statusElement = document.createElement('p');
				statusElement.className = 'pdk-shell-dialog-message pdk-shell-document-save-status';
				statusElement.id = messageId;
				statusElement.textContent = locations.length ? '' : getDocumentLabel('saveLocationUnavailable');
				statusElement.hidden = locations.length > 0;

				const form = document.createElement('form');
				form.className = 'pdk-shell-document-save-form';

				const nameRow = document.createElement('label');
				nameRow.className = 'pdk-shell-document-save-row';
				const nameLabel = document.createElement('span');
				nameLabel.className = 'pdk-shell-document-save-label';
				nameLabel.textContent = getDocumentLabel('saveAs');
				const nameInput = document.createElement('input');
				nameInput.className = 'pdk-shell-dialog-input pdk-shell-document-save-input';
				nameInput.type = 'text';
				nameInput.value = initialName;
				nameRow.append(nameLabel, nameInput);

				const locationRow = document.createElement('label');
				locationRow.className = 'pdk-shell-document-save-row';
				const locationLabel = document.createElement('span');
				locationLabel.className = 'pdk-shell-document-save-label';
				locationLabel.textContent = getDocumentLabel('where');
				const locationControl = document.createElement('span');
				locationControl.className = 'pdk-shell-document-save-location-control';
				const locationIcon = document.createElement('span');
				locationIcon.className = 'dashicons dashicons-category pdk-shell-document-save-location-icon';
				locationIcon.setAttribute('aria-hidden', 'true');
				const locationSelect = document.createElement('select');
				locationSelect.className = 'pdk-shell-dialog-select pdk-shell-document-save-select';
				locationSelect.disabled = !locations.length;

				locations.forEach((location) => {
					const option = document.createElement('option');
					option.value = location.path;
					option.textContent = getLocationOptionLabel(location);
					option.selected = location.path === defaultParentPath;
					locationSelect.appendChild(option);
				});

				if (locations.length && !locationSelect.value) {
					locationSelect.value = locations[0].path;
				}

				locationControl.append(locationIcon, locationSelect);
				locationRow.append(locationLabel, locationControl);
				form.append(nameRow, locationRow);

				const actions = document.createElement('div');
				actions.className = 'pdk-shell-dialog-actions';

				const cancelButton = createButton(cancelLabel, 'pdk-shell-dialog-button');
				const confirmButton = createButton(confirmLabel, 'pdk-shell-dialog-button pdk-shell-dialog-button-primary');
				confirmButton.disabled = !locations.length;

				function finish(value) {
					layer.removeEventListener('keydown', onKeyDown);
					closeActiveDialog();
					resolve(value);
				}

				function getPayload() {
					const titleValue = nameInput.value.trim() || initialName;
					const parentPath = locationSelect.value || defaultParentPath;

					if (!parentPath) {
						return null;
					}

					return {
						parentPath,
						title: titleValue
					};
				}

				function onKeyDown(event) {
					if (event.key === 'Escape') {
						event.preventDefault();
						finish(null);
					}
				}

				cancelButton.addEventListener('click', () => finish(null));
				confirmButton.addEventListener('click', () => finish(getPayload()));
				form.addEventListener('submit', (event) => {
					event.preventDefault();
					if (!confirmButton.disabled) {
						finish(getPayload());
					}
				});
				layer.addEventListener('keydown', onKeyDown);

				actions.append(cancelButton, confirmButton);
				if (getDialogStyle(options) === 'system-window') {
					dialog.appendChild(createDialogTitlebar(title, closeLabel, () => finish(null)));
				}
				dialog.append(titleElement, statusElement, form, actions);
				bindDialogDrag(layer, dialog);
				layer.appendChild(dialog);
				shell.appendChild(layer);
				activeDialog = layer;

				window.requestAnimationFrame(() => {
					layer.classList.add('is-visible');
					nameInput.focus({ preventScroll: true });
					nameInput.select();
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
			choose,
			confirm,
			confirmActionDialog,
			confirmTimedAction,
			prompt,
			saveDocument,
			showBlockingOverlay
		};
	};
})();
