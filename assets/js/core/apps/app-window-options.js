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
		const workspace = window.PufferDesk.session && window.PufferDesk.session.workspace ? window.PufferDesk.session.workspace : {};
		const windowKinds = workspace.windowKinds || {};
		const descriptorContract = config.contracts && config.contracts.appDescriptors && typeof config.contracts.appDescriptors === 'object'
			? config.contracts.appDescriptors
			: {};
		const appKinds = descriptorContract.kinds || {};
		const iframeCompatibility = descriptorContract.iframeCompatibility || {};
		const windowPersistence = descriptorContract.windowPersistence || {};

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

		function normalizeIframeCompatibility(value) {
			const compatibility = typeof value === 'string' ? value : '';
			const embed = iframeCompatibility.EMBED || 'embed';

			return compatibility && Object.keys(iframeCompatibility).some((key) => iframeCompatibility[key] === compatibility)
				? compatibility
				: embed;
		}

		function getNavigationRoute(app, nativeContext = {}) {
			const routes = app && Array.isArray(app.navigation) ? app.navigation : [];
			const routeRef = nativeContext && typeof nativeContext === 'object'
				? String(nativeContext.routeId || nativeContext.url || '').trim()
				: '';

			if (!routeRef || !routes.length) {
				return '';
			}

			const route = routes.find((item) => item && (
				item.id === routeRef ||
				item.url === routeRef ||
				item.slug === routeRef
			));

			return route && typeof route.url === 'string' ? route : null;
		}

		function getNativeAdminRequestedFeature(nativeContext = {}) {
			return String(nativeContext.nativeAdminFeature || '').trim();
		}

		function nativeAdminFeatureEnabled(appConfig, feature) {
			const features = appConfig && appConfig.features && typeof appConfig.features === 'object'
				? appConfig.features
				: {};

			return Boolean(feature && features[feature] === true);
		}

		function getNativeAdminAppConfig(app, nativeContext = {}) {
			const nativeAdmin = config.nativeAdmin && typeof config.nativeAdmin === 'object'
				? config.nativeAdmin
				: {};
			const nativeAdminApps = nativeAdmin.apps && typeof nativeAdmin.apps === 'object'
				? nativeAdmin.apps
				: {};
			const requestedFeature = getNativeAdminRequestedFeature(nativeContext);
			const appConfig = app && app.id && nativeAdminApps[app.id] && typeof nativeAdminApps[app.id] === 'object'
				? nativeAdminApps[app.id]
				: null;

			if (!appConfig || (!appConfig.enabled && !nativeAdminFeatureEnabled(appConfig, requestedFeature)) || !appConfig.native) {
				return null;
			}

			if (
				nativeApps
				&& typeof nativeApps.hasNativeAppRenderer === 'function'
				&& !nativeApps.hasNativeAppRenderer(appConfig.native)
			) {
				return null;
			}

			return appConfig;
		}

		function getNativeAdminWindowOptions(app, baseOptions, nativeContext = {}) {
			const nativeAdminApp = getNativeAdminAppConfig(app, nativeContext);
			const requestedFeature = getNativeAdminRequestedFeature(nativeContext);

			if (!nativeAdminApp) {
				return null;
			}

			const getOptions = nativeApps && typeof nativeApps.getNativeAppWindowOptions === 'function'
				? nativeApps.getNativeAppWindowOptions
				: null;
			const nativeOptions = getOptions
				? getOptions(nativeAdminApp.native, {
					app,
					baseOptions,
					config,
					manager,
					nativeAdmin: nativeAdminApp,
					shell
				}, nativeContext && typeof nativeContext === 'object' ? nativeContext : {})
				: null;

			if (!nativeOptions) {
				return null;
			}

			const windowOptions = Object.assign({}, baseOptions, nativeOptions);
			if (requestedFeature) {
				windowOptions.persist = false;
				windowOptions.windowIdentity = `native-admin:${app.id}:${requestedFeature}`;
			}

			return windowOptions;
		}

		function getAppWindowOptions(app, nativeContext = {}) {
			if (!app || typeof app !== 'object') {
				return null;
			}

			const windowOptions = {
				appId: app.id,
				icon: app.icon,
				menu: app.menu || null,
				navigation: Array.isArray(app.navigation) ? app.navigation : [],
				title: app.label,
				windowKind: windowKinds.APP
			};

			if (app.window_persistence === windowPersistence.NONE) {
				windowOptions.persist = false;
			}

			const nativeAdminOptions = getNativeAdminWindowOptions(app, windowOptions, nativeContext);
			if (nativeAdminOptions) {
				return nativeAdminOptions;
			}

			if (app.kind === appKinds.NATIVE) {
				return getNativeAppWindowOptions(app, windowOptions, nativeContext);
			}

			const route = getNavigationRoute(app, nativeContext);
			windowOptions.iframeCompatibility = normalizeIframeCompatibility(route && route.iframe_compatibility ? route.iframe_compatibility : app.iframe_compatibility);
			windowOptions.url = route && route.url ? route.url : app.url;
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
