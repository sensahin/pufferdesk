(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	const itemTypes = new Set(['app', 'folder']);
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

		if (id === 'desktop' || id === 'dock' || id === 'trash') {
			return id;
		}

		if (id === 'folder-sidebar-favorites' || id === 'sidebar-favorites') {
			return 'folder-sidebar:favorites';
		}

		if (id.startsWith('folder:')) {
			const folderId = normalizeId(id.slice(7));

			return folderId ? `folder:${folderId}` : '';
		}

		if (id.startsWith('folder-sidebar:')) {
			const sectionId = normalizeId(id.slice(15));

			return sectionId ? `folder-sidebar:${sectionId}` : '';
		}

		return id;
	}

	function parseContainerId(value) {
		const id = normalizeContainerId(value);

		if (id === 'desktop' || id === 'dock' || id === 'trash') {
			return {
				id,
				targetId: id,
				type: id
			};
		}

		if (id.startsWith('folder:')) {
			return {
				id,
				targetId: id.slice(7),
				type: 'folder'
			};
		}

		if (id.startsWith('folder-sidebar:')) {
			return {
				id,
				targetId: id.slice(15),
				type: 'folder-sidebar'
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

		if (kind === 'desktop') {
			return 'desktop';
		}

		if (kind === 'dock') {
			return 'dock';
		}

		if (kind === 'trash') {
			return 'trash';
		}

		if (kind === 'folder') {
			return targetId ? `folder:${targetId}` : '';
		}

		if (kind === 'folder-sidebar' || kind === 'folder-sidebar-favorites' || kind === 'sidebar-favorites') {
			return `folder-sidebar:${targetId || 'favorites'}`;
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
			reason: normalizeString(raw.reason || 'drag-drop') || 'drag-drop',
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
