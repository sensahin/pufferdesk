(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createMutations = function createMutations(options = {}) {
		const api = options.api || (window.PufferDesk.services ? window.PufferDesk.services.api : null);
		const t = typeof options.t === 'function' ? options.t : (key, fallback) => fallback || key;
		const createDebouncedTask = window.PufferDesk.services && window.PufferDesk.services.createDebouncedTask
			? window.PufferDesk.services.createDebouncedTask
			: null;

		function getPayload(payload) {
			return typeof payload === 'function' ? payload() : (payload || {});
		}

		function getErrorMessage(result, error, fallback) {
			if (result && result.data && result.data.message) {
				return result.data.message;
			}

			return error && error.message ? error.message : fallback;
		}

		function post(request = {}) {
			const status = request.status || null;
			const pendingText = Object.prototype.hasOwnProperty.call(request, 'pendingText')
				? request.pendingText
				: t('status.saving', 'Saving...');

			if (status && pendingText !== false) {
				status.textContent = pendingText;
			}

			if (!api || typeof api.post !== 'function' || !request.action) {
				const error = new Error(t('status.serviceUnavailable', 'Settings service unavailable.'));

				if (status) {
					status.textContent = error.message;
				}
				if (typeof request.onError === 'function') {
					request.onError(error, null);
				}

				return Promise.resolve(null);
			}

			return api.post(request.action, getPayload(request.payload))
				.then((result) => {
					if (!result || !result.success) {
						const message = getErrorMessage(result, null, request.errorText);

						if (status && message) {
							status.textContent = message;
						}
						if (typeof request.onError === 'function') {
							request.onError(null, result);
						}

						return null;
					}

					const data = result.data && typeof result.data === 'object' ? result.data : {};
					const successMessage = typeof request.onSuccess === 'function'
						? request.onSuccess(data, result)
						: data.message || request.successText || '';

					if (status && successMessage !== false) {
						status.textContent = successMessage || data.message || request.successText || '';
					}

					return data;
				})
				.catch((error) => {
					const message = getErrorMessage(null, error, request.errorText);

					if (status && message) {
						status.textContent = message;
					}
					if (typeof request.onError === 'function') {
						request.onError(error, null);
					}

					return null;
				});
		}

		function createDebounced(request = {}) {
			let latestRequest = request;
			let sequence = 0;
			const task = createDebouncedTask
				? createDebouncedTask(() => {
					const runSequence = sequence;
					const currentRequest = latestRequest;

					return post(Object.assign({}, currentRequest, {
						pendingText: false,
						onError(error, result) {
							if (request.latestOnly && runSequence !== sequence) {
								return;
							}

							if (typeof currentRequest.onError === 'function') {
								currentRequest.onError(error, result);
							}
						},
						onSuccess(data, result) {
							if (request.latestOnly && runSequence !== sequence) {
								return false;
							}

							return typeof currentRequest.onSuccess === 'function'
								? currentRequest.onSuccess(data, result)
								: data.message || currentRequest.successText || '';
						}
					}));
				}, {
					shouldRun: request.shouldRun,
					wait: request.wait || 180
				})
				: null;

			return function queueDebounced(overrides = {}) {
				const pendingText = Object.prototype.hasOwnProperty.call(overrides, 'pendingText')
					? overrides.pendingText
					: (Object.prototype.hasOwnProperty.call(request, 'pendingText') ? request.pendingText : t('status.saving', 'Saving...'));
				const status = overrides.status || request.status || null;

				sequence += 1;
				latestRequest = Object.assign({}, request, overrides);
				if (status && pendingText !== false) {
					status.textContent = pendingText;
				}

				return task ? task.schedule() : post(Object.assign({}, latestRequest, { pendingText: false }));
			};
		}

		return {
			createDebounced,
			post
		};
	};
})();
