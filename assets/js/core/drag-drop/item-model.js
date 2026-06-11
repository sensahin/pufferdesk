(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	const constants = window.PufferDesk.dragDrop.constants || {};
	const containerTypes = constants.containerTypes || {};
	const containerPrefixes = constants.containerPrefixes || {};
	const targetKinds = constants.targetKinds || {};
	const dragReasons = constants.reasons || {};
	const itemTypeMap = constants.itemTypes || {};
	const itemTypes = new Set(Object.keys(itemTypeMap).map((key) => itemTypeMap[key]).filter(Boolean));
	const scalarPositionKeys = ['clientX', 'clientY', 'left', 'top', 'index'];

	function clone(value) {
		if (!value || typeof value !== 'object') {
			return value;
		}

		try {
			return JSON.parse(JSON.stringify(value));
		} catch (error) {
			return Array.isArray(value) ? value.slice() : Object.assign({}, value);
		}
	}

	function normalizeString(value) {
		return String(value || '').trim();
	}

	function normalizeType(value) {
		const type = normalizeString(value);

		return itemTypes.has(type) ? type : '';
	}

	function normalizeId(value) {
		return normalizeString(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
	}

	function normalizeContainerId(value) {
		if (value && typeof value === 'object') {
			return createContainerId(value.type || value.kind || '', value.id || value.folderId || value.targetId || '');
		}

		const id = normalizeString(value);
		if (!id) {
			return '';
		}

		if (id === containerTypes.DESKTOP || id === containerTypes.DOCK || id === containerTypes.TRASH) {
			return id;
		}

		if (id === targetKinds.FOLDER_SIDEBAR_FAVORITES || id === containerTypes.SIDEBAR_FAVORITES_LEGACY) {
			return containerTypes.FOLDER_SIDEBAR_FAVORITES;
		}

		if (id.startsWith(containerPrefixes.FOLDER)) {
			const folderId = normalizeId(id.slice(containerPrefixes.FOLDER.length));

			return folderId ? `${containerPrefixes.FOLDER}${folderId}` : '';
		}

		if (id.startsWith(containerPrefixes.FOLDER_SIDEBAR)) {
			const sectionId = normalizeId(id.slice(containerPrefixes.FOLDER_SIDEBAR.length));

			return sectionId ? `${containerPrefixes.FOLDER_SIDEBAR}${sectionId}` : '';
		}

		return id;
	}

	function parseContainerId(value) {
		const id = normalizeContainerId(value);

		if (id === containerTypes.DESKTOP || id === containerTypes.DOCK || id === containerTypes.TRASH) {
			return {
				id,
				targetId: id,
				type: id
			};
		}

		if (id.startsWith(containerPrefixes.FOLDER)) {
			return {
				id,
				targetId: id.slice(containerPrefixes.FOLDER.length),
				type: containerTypes.FOLDER
			};
		}

		if (id.startsWith(containerPrefixes.FOLDER_SIDEBAR)) {
			return {
				id,
				targetId: id.slice(containerPrefixes.FOLDER_SIDEBAR.length),
				type: containerTypes.FOLDER_SIDEBAR
			};
		}

		return {
			id,
			targetId: id,
			type: ''
		};
	}

	function createContainerId(type, id = '') {
		const kind = normalizeString(type);
		const targetId = normalizeId(id);

		if (kind === containerTypes.DESKTOP) {
			return containerTypes.DESKTOP;
		}

		if (kind === containerTypes.DOCK) {
			return containerTypes.DOCK;
		}

		if (kind === containerTypes.TRASH) {
			return containerTypes.TRASH;
		}

		if (kind === containerTypes.FOLDER) {
			return targetId ? `${containerPrefixes.FOLDER}${targetId}` : '';
		}

		if (kind === containerTypes.FOLDER_SIDEBAR || kind === targetKinds.FOLDER_SIDEBAR_FAVORITES || kind === containerTypes.SIDEBAR_FAVORITES_LEGACY) {
			return `${containerPrefixes.FOLDER_SIDEBAR}${targetId || 'favorites'}`;
		}

		return targetId || normalizeContainerId(kind);
	}

	function normalizeAllowedDropTargets(targets) {
		if (!Array.isArray(targets)) {
			return [];
		}

		return Array.from(new Set(targets.map(normalizeContainerId).filter(Boolean)));
	}

	function normalizeIcon(icon) {
		if (!icon) {
			return '';
		}

		if (typeof icon === 'string') {
			return icon;
		}

		return icon && typeof icon === 'object' ? clone(icon) : '';
	}

	function normalizePosition(position) {
		if (!position || typeof position !== 'object') {
			return null;
		}

		const normalized = {};

		scalarPositionKeys.forEach((key) => {
			const value = Number.parseFloat(position[key]);
			if (Number.isFinite(value)) {
				normalized[key] = key === 'index' ? Math.max(0, Math.round(value)) : value;
			}
		});

		return Object.keys(normalized).length ? normalized : null;
	}

	function normalizeItem(item = {}, fallback = {}) {
		const raw = item && typeof item === 'object' ? item : {};
		const fallbackValue = fallback && typeof fallback === 'object' ? fallback : {};
		const type = normalizeType(raw.type || raw.kind || fallbackValue.type || fallbackValue.kind);
		const id = normalizeId(raw.id || raw.itemId || fallbackValue.id || fallbackValue.itemId);
		const sourceContainerId = normalizeContainerId(raw.sourceContainerId || fallbackValue.sourceContainerId || raw.fromContainerId || fallbackValue.fromContainerId);
		const currentContainerId = normalizeContainerId(raw.currentContainerId || fallbackValue.currentContainerId || sourceContainerId);

		return {
			allowedDropTargets: normalizeAllowedDropTargets(raw.allowedDropTargets || fallbackValue.allowedDropTargets),
			currentContainerId,
			icon: normalizeIcon(raw.icon || fallbackValue.icon),
			id,
			label: normalizeString(raw.label || fallbackValue.label),
			metadata: Object.assign({}, clone(fallbackValue.metadata || {}), clone(raw.metadata || {})),
			sourceContainerId,
			type
		};
	}

	function itemKey(item) {
		const normalized = normalizeItem(item);

		return normalized.type && normalized.id ? `${normalized.type}:${normalized.id}` : '';
	}

	function normalizeMoveRequest(request = {}) {
		const raw = request && typeof request === 'object' ? request : {};
		const item = normalizeItem(raw.item || {}, {
			id: raw.itemId,
			label: raw.label,
			metadata: raw.metadata,
			sourceContainerId: raw.fromContainerId || raw.sourceContainerId,
			type: raw.itemType || raw.type
		});
		const fromContainerId = normalizeContainerId(raw.fromContainerId || item.sourceContainerId || item.currentContainerId);
		const toContainerId = normalizeContainerId(raw.toContainerId || raw.targetContainerId);

		item.sourceContainerId = item.sourceContainerId || fromContainerId;
		item.currentContainerId = item.currentContainerId || fromContainerId;

		return {
			fromContainerId,
			item,
			itemId: item.id,
			itemType: item.type,
			metadata: Object.assign({}, clone(raw.metadata || {})),
			position: normalizePosition(raw.position),
			reason: normalizeString(raw.reason || dragReasons.DRAG_DROP) || dragReasons.DRAG_DROP,
			toContainerId
		};
	}

	window.PufferDesk.dragDrop.models = {
		clone,
		createContainerId,
		itemKey,
		normalizeAllowedDropTargets,
		normalizeContainerId,
		normalizeId,
		normalizeItem,
		normalizeMoveRequest,
		normalizePosition,
		normalizeType,
		parseContainerId
	};
})();
