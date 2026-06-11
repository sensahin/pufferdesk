(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createMoveValidator = function createMoveValidator(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
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
				return invalid('missing-item', 'Move requests must include a supported item id and type.', move);
			}

			if (!['app', 'folder'].includes(move.itemType)) {
				return invalid('unsupported-item-type', 'Only apps and folders can be moved by the core move service.', move);
			}

			if (!move.item || !move.item.metadata || move.item.metadata.exists === false) {
				return invalid('unknown-item', 'The moved item does not exist in the current workspace.', move);
			}

			if (move.item.metadata.locked && move.toContainerId !== 'folder-sidebar:favorites') {
				return invalid('locked-item', 'Locked or system items cannot be moved to that container.', move);
			}

			return null;
		}

		function validateContainers(move) {
			const sourceContainer = getContainer(move.fromContainerId);
			const targetContainer = getContainer(move.toContainerId);

			if (!move.fromContainerId) {
				return invalid('missing-source-container', 'Move requests must include a source container.', move);
			}

			if (!move.toContainerId) {
				return invalid('missing-target-container', 'Move requests must include a target container.', move);
			}

			if (!sourceContainer) {
				return invalid('unknown-source-container', 'The source container is not registered.', move);
			}

			if (!targetContainer) {
				return invalid('unknown-target-container', 'The target container is not registered.', move);
			}

			if (typeof sourceContainer.canMoveOut === 'function' && !sourceContainer.canMoveOut(move.item, move)) {
				return invalid('source-locked', 'The item cannot be moved out of its source container.', move);
			}

			if (typeof targetContainer.accepts === 'function' && !targetContainer.accepts(move.item, move)) {
				return invalid('target-rejected', 'The target container does not accept this item.', move);
			}

			return null;
		}

		function validateFolderRules(move) {
			const target = models.parseContainerId(move.toContainerId);

			if (move.itemType !== 'folder') {
				return null;
			}

			if (!move.item.metadata || !move.item.metadata.user) {
				return move.toContainerId === 'folder-sidebar:favorites'
					? null
					: invalid('system-folder-move', 'Only user-created folders can be moved between containers.', move);
			}

			if (target.type === 'folder') {
				if (target.targetId === 'trash') {
					return invalid('trash-parent', 'Trash cannot be used as a folder parent.', move);
				}

				if (target.targetId === move.itemId) {
					return invalid('self-nesting', 'A folder cannot be moved into itself.', move);
				}

				if (
					stateStore
					&& typeof stateStore.isFolderDescendant === 'function'
					&& stateStore.isFolderDescendant(target.targetId, move.itemId)
				) {
					return invalid('descendant-nesting', 'A folder cannot be moved into one of its descendants.', move);
				}
			}

			return null;
		}

		function validateAppRules(move) {
			const target = models.parseContainerId(move.toContainerId);
			const metadata = move.item && move.item.metadata ? move.item.metadata : {};

			if (move.itemType !== 'app') {
				return null;
			}

			if (move.toContainerId === 'desktop' && metadata.actualContainerId === 'desktop') {
				return invalid('already-on-desktop', 'The app is already available on the desktop.', move);
			}

			if (target.type === 'folder' && metadata.userFolderId && metadata.userFolderId === target.targetId) {
				return invalid('duplicate-item', 'The target folder already contains this app.', move);
			}

			return null;
		}

		function validateAllowedTargets(move) {
			const allowed = move.item && Array.isArray(move.item.allowedDropTargets) ? move.item.allowedDropTargets : [];

			if (!allowed.length || allowed.includes(move.toContainerId)) {
				return null;
			}

			return invalid('target-not-allowed', 'The item model does not allow this drop target.', move);
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
