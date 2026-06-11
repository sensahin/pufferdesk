(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createMoveService = function createMoveService(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const validator = options.validator || null;
		const stateStore = options.stateStore || null;
		const events = options.events || window.PufferDesk.events || null;

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function') {
				return events.emit(name, detail);
			}

			return null;
		}

		function getFolderIdFromContainer(containerId) {
			const parsed = models.parseContainerId(containerId);

			return parsed.type === 'folder' ? parsed.targetId : '';
		}

		function emitContainerChanges(move, changed) {
			const folderIds = Array.from(new Set([
				getFolderIdFromContainer(move.fromContainerId),
				getFolderIdFromContainer(move.toContainerId),
				move.itemType === 'folder' ? move.itemId : ''
			].filter(Boolean)));
			const desktopChanged = move.fromContainerId === 'desktop' || move.toContainerId === 'desktop' || move.itemType === 'app';

			if (desktopChanged) {
				emit('desktop:layout:changed', {
					changed: Boolean(changed),
					item: move.item,
					move,
					reason: move.reason
				});
			}

			folderIds.forEach((folderId) => {
				emit('folder:contents:changed', {
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
					message: 'The move validator is not available.',
					move: models.normalizeMoveRequest(request),
					valid: false
				};

			if (validateOptions.emit !== false) {
				emit('drop:validate', {
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
				emit('item:move:error', {
					error: validation,
					move
				});

				return {
					error: validation,
					move,
					success: false
				};
			}

			emit('item:move:start', {
				move
			});

			if (validation.noOp) {
				emit('item:move:success', {
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
						message: 'The move did not change workspace state.',
						move,
						valid: false
					};

					emit('item:move:error', {
						error,
						move
					});

					return {
						error,
						move,
						success: false
					};
				}

				emit('item:move:success', {
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
					message: error && error.message ? error.message : 'The move could not be completed.',
					move,
					valid: false
				};

				emit('item:move:error', {
					error: normalizedError,
					move
				});
				emit('item:move:rollback', {
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
