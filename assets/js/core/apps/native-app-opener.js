(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createNativeAppOpener = function createNativeAppOpener(options = {}) {
		const appMap = options.appMap instanceof Map ? options.appMap : new Map();
		const manager = options.manager || null;
		const config = options.config && typeof options.config === 'object'
			? options.config
			: window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const descriptorContract = config.contracts && config.contracts.appDescriptors && typeof config.contracts.appDescriptors === 'object'
			? config.contracts.appDescriptors
			: {};
		const appKinds = descriptorContract.kinds || {};
		const nativeAppKind = appKinds.NATIVE;
		const onOpen = typeof options.onOpen === 'function' ? options.onOpen : () => {};
		const resolveWindowOptions = typeof options.resolveWindowOptions === 'function'
			? options.resolveWindowOptions
			: () => null;

		function getApp(appId) {
			return appMap.get(appId) || null;
		}

		function canOpen(appId) {
			const app = getApp(appId);

			return Boolean(app && app.kind === nativeAppKind);
		}

		function open(appId, nativeContext = {}) {
			const app = getApp(appId);

			if (!app || app.kind !== nativeAppKind) {
				return null;
			}

			const windowOptions = resolveWindowOptions(app.id, nativeContext, app);
			if (!windowOptions || !manager || typeof manager.createWindow !== 'function') {
				return null;
			}

			const win = manager.createWindow(windowOptions);
			if (win) {
				onOpen(app, win);
			}

			return win || null;
		}

		return {
			canOpen,
			open
		};
	};
})();
