(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createDragDropManager = function createDragDropManager(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const draggables = options.draggables || null;
		const moveService = options.moveService || null;
		const stateStore = options.stateStore || null;
		const events = options.events || window.PufferDesk.events || null;
		let activeDrag = null;

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function') {
				return events.emit(name, detail);
			}

			return null;
		}

		function getItem(item) {
			const normalized = models.normalizeItem(item);

			return stateStore && typeof stateStore.getItem === 'function'
				? stateStore.getItem(normalized)
				: normalized;
		}

		function createItemFromElement(element, overrides = {}) {
			const item = draggables && typeof draggables.fromElement === 'function'
				? draggables.fromElement(element, overrides)
				: null;

			return item ? getItem(item) : null;
		}

		function getContainerIdFromTarget(target) {
			if (!target) {
				return '';
			}

			if (typeof target === 'string') {
				return models.normalizeContainerId(target);
			}

			if (target.toContainerId || target.containerId) {
				return models.normalizeContainerId(target.toContainerId || target.containerId);
			}

			if (target.kind === 'desktop' || target.type === 'desktop') {
				return 'desktop';
			}

			if (target.kind === 'sidebar-favorites' || target.kind === 'folder-sidebar-favorites' || target.type === 'folder-sidebar') {
				return 'folder-sidebar:favorites';
			}

			if (target.kind === 'trash' || target.type === 'trash') {
				return 'trash';
			}

			if (target.kind === 'dock' || target.type === 'dock') {
				return 'dock';
			}

			if (target.kind === 'folder' || target.type === 'folder' || target.targetKind === 'folder') {
				return models.createContainerId('folder', target.id || target.targetId || target.folderId || '');
			}

			if (target.targetKind === 'folder-sidebar-favorites') {
				return 'folder-sidebar:favorites';
			}

			return '';
		}

		function createMoveRequest(request = {}) {
			const raw = request && typeof request === 'object' ? request : {};
			const item = getItem(raw.item || activeDrag && activeDrag.item || {});
			const fromContainerId = raw.fromContainerId
				|| item.sourceContainerId
				|| item.currentContainerId
				|| activeDrag && activeDrag.sourceContainerId
				|| '';
			const toContainerId = raw.toContainerId || getContainerIdFromTarget(raw.target || raw.dropTarget);

			return models.normalizeMoveRequest(Object.assign({}, raw, {
				fromContainerId,
				item,
				toContainerId
			}));
		}

		function createLegacyMoveRequest(detail = {}, options = {}) {
			const item = draggables && typeof draggables.fromLegacyDropDetail === 'function'
				? draggables.fromLegacyDropDetail(detail, options.source || 'desktop')
				: models.normalizeItem({
					id: detail.sourceId || detail.id,
					sourceContainerId: detail.sourceFolderId ? models.createContainerId('folder', detail.sourceFolderId) : 'desktop',
					type: detail.sourceKind || detail.kind
				});
			const toContainerId = getContainerIdFromTarget({
				id: detail.targetId,
				kind: detail.targetKind
			});

			return createMoveRequest({
				fromContainerId: item.sourceContainerId || (detail.sourceFolderId ? models.createContainerId('folder', detail.sourceFolderId) : 'desktop'),
				item,
				metadata: Object.assign({}, detail.metadata || {}, options.metadata || {}),
				position: options.position || detail.position || null,
				reason: options.reason || 'drag-drop',
				toContainerId
			});
		}

		function startDrag(item, context = {}) {
			const normalized = getItem(item);

			if (!normalized || !normalized.id || !normalized.type) {
				return null;
			}

			activeDrag = {
				context: Object.assign({}, context),
				item: normalized,
				sourceContainerId: normalized.sourceContainerId || normalized.currentContainerId || '',
				startedAt: Date.now()
			};
			emit('drag:start', {
				drag: activeDrag,
				item: normalized
			});

			return activeDrag;
		}

		function startDragFromElement(element, context = {}) {
			const item = createItemFromElement(element, context);

			return item ? startDrag(item, Object.assign({}, context, {
				element
			})) : null;
		}

		function hover(request = {}) {
			const move = createMoveRequest(request);
			const validation = moveService && typeof moveService.validateMove === 'function'
				? moveService.validateMove(move)
				: {
					valid: false
				};

			emit('drag:hover', {
				activeDrag,
				move: validation.move || move,
				validation
			});

			return validation;
		}

		function leave(target = null) {
			emit('drag:leave', {
				activeDrag,
				target
			});
		}

		function cancel(reason = 'cancelled') {
			const drag = activeDrag;
			activeDrag = null;
			emit('drag:cancel', {
				drag,
				reason
			});
		}

		function validateDrop(request = {}, validateOptions = {}) {
			const move = createMoveRequest(request);

			return moveService && typeof moveService.validateMove === 'function'
				? moveService.validateMove(move, validateOptions)
				: {
					move,
					valid: false
				};
		}

		function completeDrop(request = {}) {
			const move = createMoveRequest(request);
			const result = moveService && typeof moveService.moveItem === 'function'
				? moveService.moveItem(move)
				: {
					move,
					success: false
				};

			activeDrag = null;

			return result;
		}

		function canDropLegacy(detail = {}, options = {}) {
			return Boolean(validateDrop(createLegacyMoveRequest(detail, options), {
				emit: options.emit
			}).valid);
		}

		function hoverLegacy(detail = {}, options = {}) {
			return hover(createLegacyMoveRequest(detail, options));
		}

		function dropLegacy(detail = {}, options = {}) {
			return completeDrop(createLegacyMoveRequest(detail, options));
		}

		function moveItem(request = {}) {
			return completeDrop(request);
		}

		function getActiveDrag() {
			return activeDrag ? Object.assign({}, activeDrag) : null;
		}

		return {
			canDropLegacy,
			cancel,
			completeDrop,
			createItemFromElement,
			createLegacyMoveRequest,
			createMoveRequest,
			dropLegacy,
			getActiveDrag,
			getContainerIdFromTarget,
			hover,
			hoverLegacy,
			leave,
			moveItem,
			startDrag,
			startDragFromElement,
			validateDrop
		};
	};
})();
