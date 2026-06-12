(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createMoveService = function createMoveService(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const constants = window.PufferDesk.dragDrop.constants || {};
		const containerTypes = constants.containerTypes || {};
		const itemTypes = constants.itemTypes || {};
		const messages = constants.messages || {};
		const validator = options.validator || null;
		const stateStore = options.stateStore || null;
		const events = options.events || window.PufferDesk.events || null;
		const eventNames = events && events.names ? events.names : {};

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function') {
				return events.emit(name, detail);
			}

			return null;
		}

		function getFolderIdFromContainer(containerId) {
			const parsed = models.parseContainerId(containerId);

			return parsed.type === containerTypes.FOLDER ? parsed.targetId : '';
		}

		function emitContainerChanges(move, changed) {
			const folderIds = Array.from(new Set([
				getFolderIdFromContainer(move.fromContainerId),
				getFolderIdFromContainer(move.toContainerId),
				move.itemType === itemTypes.FOLDER ? move.itemId : ''
			].filter(Boolean)));
			const desktopChanged = move.fromContainerId === containerTypes.DESKTOP || move.toContainerId === containerTypes.DESKTOP || move.itemType === itemTypes.APP;

			if (desktopChanged) {
				emit(eventNames.DESKTOP_LAYOUT_CHANGED, {
					changed: Boolean(changed),
					item: move.item,
					move,
					reason: move.reason
				});
			}

			folderIds.forEach((folderId) => {
				emit(eventNames.FOLDER_CONTENTS_CHANGED, {
					changed: Boolean(changed),
					folderId,
					item: move.item,
					move,
					reason: move.reason
				});
			});
		}

		function validateMove(request, validateOptions = {}) {
			const validation = validator && typeof validator.validate === 'function'
				? validator.validate(request)
				: {
					code: 'missing-validator',
					message: messages.MISSING_VALIDATOR,
					move: models.normalizeMoveRequest(request),
					valid: false
				};

			if (validateOptions.emit !== false) {
				emit(eventNames.DROP_VALIDATE, {
					move: validation.move || models.normalizeMoveRequest(request),
					validation
				});
			}

			return validation;
		}

		function moveItem(request) {
			const validation = validateMove(request);
			const move = validation.move || models.normalizeMoveRequest(request);

			if (!validation.valid) {
				emit(eventNames.ITEM_MOVE_ERROR, {
					error: validation,
					move
				});

				return {
					error: validation,
					move,
					success: false
				};
			}

			emit(eventNames.ITEM_MOVE_START, {
				move
			});

			if (validation.noOp) {
				emit(eventNames.ITEM_MOVE_SUCCESS, {
					changed: false,
					move,
					noOp: true
				});

				return {
					changed: false,
					move,
					noOp: true,
					success: true
				};
			}

			try {
				const changed = Boolean(stateStore && typeof stateStore.applyMove === 'function' && stateStore.applyMove(move));

				if (!changed) {
					const error = {
						code: 'move-not-applied',
						message: messages.MOVE_NOT_APPLIED,
						move,
						valid: false
					};

					emit(eventNames.ITEM_MOVE_ERROR, {
						error,
						move
					});

					return {
						error,
						move,
						success: false
					};
				}

				emit(eventNames.ITEM_MOVE_SUCCESS, {
					changed,
					move
				});
				emitContainerChanges(move, changed);

				return {
					changed,
					move,
					success: true
				};
			} catch (error) {
				const normalizedError = {
					code: 'move-exception',
					message: error && error.message ? error.message : messages.MOVE_EXCEPTION,
					move,
					valid: false
				};

				emit(eventNames.ITEM_MOVE_ERROR, {
					error: normalizedError,
					move
				});
				emit(eventNames.ITEM_MOVE_ROLLBACK, {
					error: normalizedError,
					move
				});

				return {
					error: normalizedError,
					move,
					success: false
				};
			}
		}

		return {
			moveItem,
			validateMove
		};
	};
})();
