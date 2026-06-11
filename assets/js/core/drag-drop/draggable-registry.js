(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createDraggableRegistry = function createDraggableRegistry(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const constants = window.PufferDesk.dragDrop.constants || {};
		const containerTypes = constants.containerTypes || {};
		const items = new Map();
		const events = options.events || window.PufferDesk.events || null;
		const eventNames = events && events.names ? events.names : {};

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function') {
				events.emit(name, detail);
			}
		}

		function getLabelFromElement(element) {
			if (!element || !element.dataset) {
				return '';
			}

			const labelElement = element.querySelector
				? element.querySelector('.pdk-desktop-app-label, .pdk-app-launcher-label')
				: null;

			return element.dataset.pdkContextLabel || (labelElement ? labelElement.textContent : '') || '';
		}

		function getIconFromElement(element) {
			if (!element || !element.dataset) {
				return '';
			}

			return element.dataset.pdkIcon || '';
		}

		function fromDesktopElement(element, overrides = {}) {
			const kind = element && element.dataset ? element.dataset.pdkDesktopIconKind || '' : '';
			const id = element && element.dataset ? element.dataset.pdkOpenApp || element.dataset.pdkOpenFolder || element.dataset.pdkContextId || '' : '';

			if (!id || !kind) {
				return null;
			}

			return models.normalizeItem(overrides.item || {}, {
				icon: getIconFromElement(element),
				id,
				label: getLabelFromElement(element),
				metadata: Object.assign({
					element,
					source: containerTypes.DESKTOP
				}, overrides.metadata || {}),
				sourceContainerId: containerTypes.DESKTOP,
				type: kind
			});
		}

		function fromFolderItemElement(element, overrides = {}) {
			const kind = element && element.dataset ? element.dataset.pdkFolderItemKind || '' : '';
			const id = element && element.dataset ? element.dataset.pdkFolderItemId || element.dataset.pdkContextId || element.dataset.pdkOpenFolder || '' : '';
			const folderId = element && element.dataset ? element.dataset.pdkFolderId || overrides.folderId || '' : overrides.folderId || '';

			if (!id || !kind) {
				return null;
			}

			return models.normalizeItem(overrides.item || {}, {
				icon: getIconFromElement(element),
				id,
				label: getLabelFromElement(element),
				metadata: Object.assign({
					element,
					source: 'folder-item',
					sourceFolderId: folderId
				}, overrides.metadata || {}),
				sourceContainerId: folderId ? models.createContainerId(containerTypes.FOLDER, folderId) : '',
				type: kind
			});
		}

		function fromLegacyDropDetail(detail = {}, source = containerTypes.DESKTOP) {
			const type = detail.sourceKind || detail.kind || detail.itemType || '';
			const id = detail.sourceId || detail.id || detail.itemId || '';
			const sourceFolderId = detail.sourceFolderId || detail.folderId || '';
			const sourceContainerId = detail.fromContainerId
				|| (sourceFolderId ? models.createContainerId(containerTypes.FOLDER, sourceFolderId) : source === containerTypes.DESKTOP ? containerTypes.DESKTOP : '');

			return models.normalizeItem(detail.item || {}, {
				id,
				label: detail.label || '',
				metadata: Object.assign({}, detail.metadata || {}, {
					source,
					sourceFolderId
				}),
				sourceContainerId,
				type
			});
		}

		function register(item) {
			const normalized = models.normalizeItem(item);
			const key = models.itemKey(normalized);

			if (!key) {
				return null;
			}

			items.set(key, normalized);
			emit(eventNames.DRAGDROP_ITEM_REGISTERED, {
				item: normalized
			});

			return normalized;
		}

		function unregister(item) {
			const key = typeof item === 'string' ? item : models.itemKey(item);

			if (!key || !items.has(key)) {
				return false;
			}

			const removed = items.get(key);
			items.delete(key);
			emit(eventNames.DRAGDROP_ITEM_UNREGISTERED, {
				item: removed
			});

			return true;
		}

		function get(item) {
			const key = typeof item === 'string' ? item : models.itemKey(item);

			return key ? items.get(key) || null : null;
		}

		function fromElement(element, overrides = {}) {
			if (!element || !element.dataset) {
				return null;
			}

			if (element.dataset.pdkDesktopIcon !== undefined) {
				return fromDesktopElement(element, overrides);
			}

			if (element.dataset.pdkDraggableFolderItem === '1') {
				return fromFolderItemElement(element, overrides);
			}

			return null;
		}

		return {
			fromElement,
			fromLegacyDropDetail,
			get,
			register,
			unregister
		};
	};
})();
