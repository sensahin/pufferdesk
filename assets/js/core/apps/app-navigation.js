(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.appNavigation = (function createAppNavigation() {
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};

		function normalizeRoute(route, app) {
			if (!route || typeof route !== 'object') {
				return null;
			}

			const appId = typeof route.appId === 'string' && route.appId ? route.appId : (app && app.id ? app.id : '');
			const label = typeof route.label === 'string' ? route.label.trim() : '';
			const url = typeof route.url === 'string' ? route.url.trim() : '';
			const id = typeof route.id === 'string' && route.id ? route.id : `${appId || 'app'}-route-${label || url}`;

			if (!appId || !label || !url) {
				return null;
			}

			return Object.assign({}, route, {
				appId,
				command: route.command || commandIds.APP_OPEN_ROUTE || 'app.open-route',
				id,
				label,
				target: route.target || appId,
				title: route.title || label,
				url
			});
		}

		function getRoutes(app) {
			if (!app || !Array.isArray(app.navigation)) {
				return [];
			}

			return app.navigation
				.map((route) => normalizeRoute(route, app))
				.filter(Boolean);
		}

		function getRoute(app, routeRef) {
			const ref = String(routeRef || '').trim();
			if (!ref) {
				return null;
			}

			return getRoutes(app).find((route) => route.id === ref || route.url === ref || route.slug === ref) || null;
		}

		function createMenuItem(app, route, options = {}) {
			const normalized = normalizeRoute(route, app);
			if (!normalized) {
				return null;
			}

			return {
				command: commandIds.APP_OPEN_ROUTE || normalized.command,
				icon: options.icon || normalized.icon || '',
				id: options.id || `app-route-${normalized.id}`,
				label: normalized.label,
				payload: Object.assign({
					appId: normalized.appId,
					routeId: normalized.id
				}, options.payload && typeof options.payload === 'object' ? options.payload : {}),
				target: normalized.appId,
				title: normalized.title || normalized.label,
				url: normalized.url
			};
		}

		function createMenuItems(app, options = {}) {
			return getRoutes(app)
				.map((route) => createMenuItem(app, route, options))
				.filter(Boolean);
		}

		return {
			createMenuItem,
			createMenuItems,
			getRoute,
			getRoutes,
			normalizeRoute
		};
	})();
})();
