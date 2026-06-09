(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createAppWindowOptionsResolver = function createAppWindowOptionsResolver(options = {}) {
		const config = options.config || {};
		const manager = options.manager || null;
		const shell = options.shell || null;
		const appMap = options.appMap instanceof Map ? options.appMap : new Map();
		const nativeApps = options.nativeApps || window.PufferDesk.apps || {};

		function getNativeAppWindowOptions(app, baseOptions, nativeContext = {}) {
			const getOptions = nativeApps && typeof nativeApps.getNativeAppWindowOptions === 'function'
				? nativeApps.getNativeAppWindowOptions
				: null;
			const nativeOptions = getOptions
				? getOptions(app.native, {
					app,
					baseOptions,
					config,
					manager,
					shell
				}, nativeContext && typeof nativeContext === 'object' ? nativeContext : {})
				: null;

			return nativeOptions ? Object.assign({}, baseOptions, nativeOptions) : null;
		}

		function getAppWindowOptions(app, nativeContext = {}) {
			if (!app || typeof app !== 'object') {
				return null;
			}

			const windowOptions = {
				appId: app.id,
				icon: app.icon,
				menu: app.menu || null,
				title: app.label,
				windowKind: 'app'
			};

			if (app.window_persistence === 'none') {
				windowOptions.persist = false;
			}

			if (app.kind === 'native') {
				return getNativeAppWindowOptions(app, windowOptions, nativeContext);
			}

			windowOptions.url = app.url;
			return windowOptions;
		}

		function getWindowOptions(appId, nativeContext = {}) {
			const app = appMap.get(appId);

			return app ? getAppWindowOptions(app, nativeContext) : null;
		}

		return {
			getAppWindowOptions,
			getNativeAppWindowOptions,
			getWindowOptions
		};
	};
})();
