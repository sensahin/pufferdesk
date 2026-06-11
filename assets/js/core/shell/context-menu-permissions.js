(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createContextMenuPermissionResolver = function createContextMenuPermissionResolver(config = {}) {
		const features = config.features && typeof config.features === 'object' ? config.features : {};
		const permissions = config.permissions && typeof config.permissions === 'object' ? config.permissions : {};
		const capabilities = config.capabilities && typeof config.capabilities === 'object' ? config.capabilities : {};
		const shellCapabilities = config.shellCapabilities && typeof config.shellCapabilities === 'object' ? config.shellCapabilities : {};
		const theme = config.theme && typeof config.theme === 'object' ? config.theme : {};

		function getPathValue(source, path) {
			if (!source || typeof source !== 'object' || typeof path !== 'string' || !path) {
				return undefined;
			}

			return path.split('.').reduce((current, part) => {
				if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
					return undefined;
				}

				return current[part];
			}, source);
		}

		function everyRequirement(requirement, predicate) {
			if (!requirement) {
				return true;
			}

			const items = Array.isArray(requirement) ? requirement : [requirement];
			return items.every((item) => typeof item === 'string' && item ? predicate(item) : true);
		}

		function hasFeature(feature) {
			const value = getPathValue(features, feature);
			if (value !== undefined) {
				return Boolean(value);
			}

			return Boolean(getPathValue(shellCapabilities, feature));
		}

		function hasPermission(permission) {
			const value = getPathValue(permissions, permission);
			if (value !== undefined) {
				return Boolean(value);
			}

			return Boolean(getPathValue(capabilities, permission));
		}

		function hasThemeSupport(requirement, context = {}) {
			if (!requirement) {
				return true;
			}

			if (typeof requirement === 'function') {
				return Boolean(requirement(context, theme, config));
			}

			return everyRequirement(requirement, (item) => Boolean(getPathValue(theme, item)));
		}

		function isVisible(item, context = {}) {
			if (!item || item.type === 'separator') {
				return true;
			}

			if (typeof item.visibleWhen === 'function' && !item.visibleWhen(context, config)) {
				return false;
			}

			if (!everyRequirement(item.requiresFeature, hasFeature)) {
				return false;
			}

			if (!everyRequirement(item.requiresPermission, hasPermission)) {
				return false;
			}

			return hasThemeSupport(item.themeSupport, context);
		}

		function isEnabled(item, context = {}) {
			if (!item || item.disabled) {
				return false;
			}

			if (typeof item.enabledWhen === 'function') {
				return Boolean(item.enabledWhen(context, config));
			}

			return true;
		}

		function normalizeItem(item, context = {}) {
			if (!isVisible(item, context)) {
				return null;
			}

			if (item.type === 'separator') {
				return item;
			}

			const next = Object.assign({}, item);
			if (Array.isArray(next.items) && next.items.length) {
				next.items = filterItems(next.items, context);
			}

			if (typeof item.enabledWhen === 'function' && !isEnabled(item, context)) {
				next.disabled = true;
			}

			return next;
		}

		function trimSeparators(items) {
			const trimmed = [];
			let previousWasSeparator = true;

			items.forEach((item) => {
				if (!item) {
					return;
				}

				if (item.type === 'separator') {
					if (!previousWasSeparator) {
						trimmed.push(item);
					}
					previousWasSeparator = true;
					return;
				}

				trimmed.push(item);
				previousWasSeparator = false;
			});

			while (trimmed.length && trimmed[trimmed.length - 1].type === 'separator') {
				trimmed.pop();
			}

			return trimmed;
		}

		function filterItems(items, context = {}) {
			return trimSeparators((Array.isArray(items) ? items : [])
				.map((item) => normalizeItem(item, context))
				.filter(Boolean));
		}

		function filterMenu(menuDefinition, context = {}) {
			const groups = menuDefinition && Array.isArray(menuDefinition.groups) ? menuDefinition.groups : [];

			return {
				groups: groups
					.map((group) => Object.assign({}, group, {
						items: filterItems(group.items, context)
					}))
					.filter((group) => group.items.length)
			};
		}

		return {
			filterItems,
			filterMenu,
			hasFeature,
			hasPermission,
			isEnabled,
			isVisible
		};
	};
})();
