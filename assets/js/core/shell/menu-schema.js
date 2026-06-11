(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	const standardGroupIds = ['app', 'file', 'edit', 'view', 'go', 'window', 'help'];
	const recognizedGroupIds = ['site'].concat(standardGroupIds);

	window.PufferDesk.shell.createMenuSchema = function createMenuSchema(labels = {}) {
		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function getDefaultGroupLabel(id, context = {}) {
			if (id === 'app') {
				return context.appLabel || context.title || getLabel('admin', 'Admin');
			}

			return getLabel(id, id.charAt(0).toUpperCase() + id.slice(1));
		}

		function getGroupId(group, index) {
			if (group && typeof group === 'object' && typeof group.id === 'string' && group.id) {
				return group.id;
			}

			return standardGroupIds[index] || `menu-${index + 1}`;
		}

		function normalizeShortcut(shortcut) {
			if (typeof shortcut === 'string') {
				return shortcut;
			}

			if (!shortcut || typeof shortcut !== 'object') {
				return '';
			}

			const normalized = {
				allowInTextFields: shortcut.allowInTextFields === true,
				key: typeof shortcut.key === 'string' ? shortcut.key : '',
				label: typeof shortcut.label === 'string' ? shortcut.label : '',
				modifiers: Array.isArray(shortcut.modifiers)
					? shortcut.modifiers.filter((modifier) => typeof modifier === 'string')
					: [],
				preventDefault: shortcut.preventDefault !== false
			};

			return normalized.key || normalized.label ? normalized : '';
		}

		function normalizeCommandItem(item) {
			if (typeof item === 'string') {
				return item ? { label: item } : null;
			}

			if (!item || typeof item !== 'object') {
				return null;
			}

			if (item.type === 'separator' || item.separator === true) {
				return { type: 'separator' };
			}

			if (item.type === 'action-strip') {
				return {
					id: typeof item.id === 'string' ? item.id : '',
					items: normalizeCommandItems(item.items),
					label: typeof item.label === 'string' ? item.label : '',
					type: 'action-strip'
				};
			}

			if (typeof item.label !== 'string' || !item.label) {
				return null;
			}

			return {
				command: typeof item.command === 'string' ? item.command : '',
				disabled: Boolean(item.disabled),
				enabledWhen: typeof item.enabledWhen === 'function' ? item.enabledWhen : null,
				icon: typeof item.icon === 'string' || (item.icon && typeof item.icon === 'object') ? item.icon : '',
				id: typeof item.id === 'string' ? item.id : '',
				items: normalizeCommandItems(item.items),
				label: item.label,
				order: Number.isFinite(item.order) ? item.order : null,
				panel: typeof item.panel === 'string' ? item.panel : '',
				payload: item.payload && typeof item.payload === 'object' ? item.payload : {},
				requiresFeature: typeof item.requiresFeature === 'string' || Array.isArray(item.requiresFeature) ? item.requiresFeature : '',
				requiresPermission: typeof item.requiresPermission === 'string' || Array.isArray(item.requiresPermission) ? item.requiresPermission : '',
				shortcut: normalizeShortcut(item.shortcut),
				target: typeof item.target === 'string' ? item.target : '',
				themeSupport: typeof item.themeSupport === 'string' || Array.isArray(item.themeSupport) || typeof item.themeSupport === 'function' ? item.themeSupport : '',
				title: typeof item.title === 'string' ? item.title : '',
				url: typeof item.url === 'string' ? item.url : '',
				visibleWhen: typeof item.visibleWhen === 'function' ? item.visibleWhen : null
			};
		}

		function normalizeCommandItems(items) {
			if (!Array.isArray(items)) {
				return [];
			}

			return items.map(normalizeCommandItem).filter(Boolean);
		}

		function normalizeGroup(group, index, context = {}) {
			if (typeof group === 'string') {
				return {
					id: getGroupId(null, index),
					items: [],
					label: group
				};
			}

			if (!group || typeof group !== 'object') {
				return null;
			}

			const id = getGroupId(group, index);
			const label = typeof group.label === 'string' && group.label
				? group.label
				: getDefaultGroupLabel(id, context);

			return {
				command: typeof group.command === 'string' ? group.command : '',
				disabled: Boolean(group.disabled),
				icon: typeof group.icon === 'string' ? group.icon : '',
				id,
				items: normalizeCommandItems(group.items),
				label,
				payload: group.payload && typeof group.payload === 'object' ? group.payload : {},
				target: typeof group.target === 'string' ? group.target : '',
				title: typeof group.title === 'string' ? group.title : '',
				url: typeof group.url === 'string' ? group.url : ''
			};
		}

		function getGroups(definition) {
			if (Array.isArray(definition)) {
				return definition;
			}

			if (!definition || typeof definition !== 'object') {
				return [];
			}

			if (Array.isArray(definition.groups)) {
				return definition.groups;
			}

			return recognizedGroupIds
				.filter((id) => Object.prototype.hasOwnProperty.call(definition, id))
				.map((id) => {
					const group = definition[id];

					if (Array.isArray(group)) {
						return {
							id,
							items: group
						};
					}

					if (typeof group === 'string') {
						return {
							id,
							items: [],
							label: group
						};
					}

					return Object.assign({}, group && typeof group === 'object' ? group : {}, { id });
				});
		}

		function getDefaultDefinition(context = {}) {
			const groups = standardGroupIds
				.filter((id) => id !== 'go' || context.includeGo)
				.map((id) => ({
					id,
					items: [],
					label: getDefaultGroupLabel(id, context)
				}));

			return { groups };
		}

		function normalizeDefinition(definition, context = {}) {
			const groups = getGroups(definition)
				.map((group, index) => normalizeGroup(group, index, context))
				.filter(Boolean);

			return groups.length ? { groups } : getDefaultDefinition(context);
		}

		return {
			getDefaultDefinition,
			normalizeCommandItems,
			normalizeDefinition
		};
	};
})();
