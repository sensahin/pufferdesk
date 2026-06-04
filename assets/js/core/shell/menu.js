(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createMenuController = function createMenuController(shell, config = {}) {
		const menu = shell.querySelector('[data-aos-menu-items]');
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const desktopItems = normalizeMenuItems(menuConfig.desktop);

		function getLabel(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function normalizeMenuItem(item) {
			if (typeof item === 'string') {
				return item ? { label: item } : null;
			}

			if (!item || typeof item !== 'object' || typeof item.label !== 'string' || !item.label) {
				return null;
			}

			return {
				action: typeof item.action === 'string' ? item.action : '',
				label: item.label,
				target: typeof item.target === 'string' ? item.target : ''
			};
		}

		function normalizeMenuItems(items) {
			if (!Array.isArray(items)) {
				return [];
			}

			return items.map(normalizeMenuItem).filter(Boolean);
		}

		function getStandardItems(title) {
			return normalizeMenuItems([
				title || getLabel('admin', 'Admin'),
				getLabel('file', 'File'),
				getLabel('edit', 'Edit'),
				getLabel('view', 'View'),
				getLabel('window', 'Window'),
				getLabel('help', 'Help')
			]);
		}

		function getDesktopItems() {
			return desktopItems.length
				? desktopItems
				: normalizeMenuItems([
					{
						action: 'open-window',
						label: getLabel('workspace', 'Workspace'),
						target: 'welcome'
					},
					getLabel('file', 'File'),
					getLabel('edit', 'Edit'),
					getLabel('view', 'View'),
					getLabel('go', 'Go'),
					getLabel('window', 'Window'),
					getLabel('help', 'Help')
				]);
		}

		function getItemsForDetail(detail = {}) {
			if (!detail.kind || detail.kind === 'desktop' || detail.kind === 'workspace') {
				return getDesktopItems();
			}

			if (detail.menu && Array.isArray(detail.menu.items)) {
				const detailItems = normalizeMenuItems(detail.menu.items);
				if (detailItems.length) {
					return detailItems;
				}
			}

			if (detail.appId && appMap.has(detail.appId)) {
				const app = appMap.get(detail.appId);
				const appItems = normalizeMenuItems(app.menus);
				if (appItems.length) {
					return appItems;
				}
			}

			return getStandardItems(detail.title);
		}

		function applyMenuAction(button, item) {
			if (!item.action || !item.target) {
				return;
			}

			if (item.action === 'open-window') {
				button.dataset.aosOpenWindow = item.target;
			} else if (item.action === 'open-folder') {
				button.dataset.aosOpenFolder = item.target;
			} else if (item.action === 'open-app') {
				button.dataset.aosOpenApp = item.target;
			}
		}

		function render(detail = {}) {
			if (!menu) {
				return;
			}

			const items = getItemsForDetail(detail);
			menu.replaceChildren(...items.map((item) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = item.label;
				applyMenuAction(button, item);
				return button;
			}));
		}

		function bind() {
			if (!menu) {
				return;
			}

			render({ kind: 'desktop' });
			shell.addEventListener('adminOSMode:active-window-change', (event) => {
				render(event.detail || { kind: 'desktop' });
			});
		}

		return {
			bind,
			render
		};
	};
})();
