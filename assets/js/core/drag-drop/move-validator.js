(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createMoveValidator = function createMoveValidator(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const constants = window.PufferDesk.dragDrop.constants || {};
		const containerTypes = constants.containerTypes || {};
		const itemTypes = constants.itemTypes || {};
		const messages = constants.messages || {};
		const containers = options.dropTargets || null;
		const stateStore = options.stateStore || null;

		function invalid(code, message, move = null) {
			return {
				code,
				message,
				move,
				valid: false
			};
		}

		function valid(move, details = {}) {
			return Object.assign({
				code: '',
				message: '',
				move,
				valid: true
			}, details);
		}

		function getContainer(containerId) {
			if (containers && typeof containers.get === 'function') {
				const registered = containers.get(containerId);
				if (registered) {
					return registered;
				}
			}

			return stateStore && typeof stateStore.getContainer === 'function'
				? stateStore.getContainer(containerId)
				: null;
		}

		function enrichItem(item) {
			return stateStore && typeof stateStore.getItem === 'function'
				? stateStore.getItem(item)
				: models.normalizeItem(item);
		}

		function isSameContainerMove(move) {
			return move.fromContainerId && move.fromContainerId === move.toContainerId && !move.position;
		}

		function validateItem(move) {
			if (!move.itemId || !move.itemType) {
				return invalid('missing-item', messages.MISSING_ITEM, move);
			}

			if (![itemTypes.APP, itemTypes.DOCUMENT, itemTypes.FOLDER].includes(move.itemType)) {
				return invalid('unsupported-item-type', messages.UNSUPPORTED_ITEM_TYPE, move);
			}

			if (!move.item || !move.item.metadata || move.item.metadata.exists === false) {
				return invalid('unknown-item', messages.UNKNOWN_ITEM, move);
			}

			if (move.item.metadata.locked && move.toContainerId !== containerTypes.FOLDER_SIDEBAR_FAVORITES) {
				return invalid('locked-item', messages.LOCKED_ITEM, move);
			}

			return null;
		}

		function validateContainers(move) {
			const sourceContainer = getContainer(move.fromContainerId);
			const targetContainer = getContainer(move.toContainerId);

			if (!move.fromContainerId) {
				return invalid('missing-source-container', messages.MISSING_SOURCE_CONTAINER, move);
			}

			if (!move.toContainerId) {
				return invalid('missing-target-container', messages.MISSING_TARGET_CONTAINER, move);
			}

			if (!sourceContainer) {
				return invalid('unknown-source-container', messages.UNKNOWN_SOURCE_CONTAINER, move);
			}

			if (!targetContainer) {
				return invalid('unknown-target-container', messages.UNKNOWN_TARGET_CONTAINER, move);
			}

			if (typeof sourceContainer.canMoveOut === 'function' && !sourceContainer.canMoveOut(move.item, move)) {
				return invalid('source-locked', messages.SOURCE_LOCKED, move);
			}

			if (typeof targetContainer.accepts === 'function' && !targetContainer.accepts(move.item, move)) {
				return invalid('target-rejected', messages.TARGET_REJECTED, move);
			}

			return null;
		}

		function validateFolderRules(move) {
			const target = models.parseContainerId(move.toContainerId);

			if (move.itemType !== itemTypes.FOLDER) {
				return null;
			}

			if (!move.item.metadata || !move.item.metadata.user) {
				return move.toContainerId === containerTypes.FOLDER_SIDEBAR_FAVORITES
					? null
					: invalid('system-folder-move', messages.SYSTEM_FOLDER_MOVE, move);
			}

			if (target.type === containerTypes.FOLDER) {
				if (target.targetId === containerTypes.TRASH) {
					return invalid('trash-parent', messages.TRASH_PARENT, move);
				}

				if (target.targetId === move.itemId) {
					return invalid('self-nesting', messages.SELF_NESTING, move);
				}

				if (
					stateStore
					&& typeof stateStore.isFolderDescendant === 'function'
					&& stateStore.isFolderDescendant(target.targetId, move.itemId)
				) {
					return invalid('descendant-nesting', messages.DESCENDANT_NESTING, move);
				}
			}

			return null;
		}

		function validateAppRules(move) {
			const target = models.parseContainerId(move.toContainerId);
			const metadata = move.item && move.item.metadata ? move.item.metadata : {};

			if (move.itemType !== itemTypes.APP) {
				return null;
			}

			if (move.toContainerId === containerTypes.DESKTOP && metadata.actualContainerId === containerTypes.DESKTOP) {
				return invalid('already-on-desktop', messages.ALREADY_ON_DESKTOP, move);
			}

			if (target.type === containerTypes.FOLDER && metadata.userFolderId && metadata.userFolderId === target.targetId) {
				return invalid('duplicate-item', messages.DUPLICATE_ITEM, move);
			}

			return null;
		}

		function validateAllowedTargets(move) {
			const allowed = move.item && Array.isArray(move.item.allowedDropTargets) ? move.item.allowedDropTargets : [];

			if (!allowed.length || allowed.includes(move.toContainerId)) {
				return null;
			}

			return invalid('target-not-allowed', messages.TARGET_NOT_ALLOWED, move);
		}

		function validate(request) {
			const normalizedRequest = models.normalizeMoveRequest(request);
			const item = enrichItem(normalizedRequest.item);
			const move = Object.assign({}, normalizedRequest, {
				fromContainerId: normalizedRequest.fromContainerId || item.currentContainerId || item.sourceContainerId,
				item,
				itemId: item.id,
				itemType: item.type
			});
			const setupFailures = [
				validateItem(move),
				validateContainers(move)
			].filter(Boolean);

			if (setupFailures.length) {
				return setupFailures[0];
			}

			if (isSameContainerMove(move)) {
				return valid(move, {
					noOp: true
				});
			}

			const failures = [
				validateFolderRules(move),
				validateAppRules(move),
				validateAllowedTargets(move)
			].filter(Boolean);

			if (failures.length) {
				return failures[0];
			}

			return valid(move);
		}

		return {
			validate
		};
	};
})();
