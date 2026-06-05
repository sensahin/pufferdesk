(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createContextMenuRegistry = function createContextMenuRegistry(config = {}, schema = null) {
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const folderMap = new Map((Array.isArray(config.folders) ? config.folders : []).map((folder) => [folder.id, folder]));
		const widgetMap = new Map((Array.isArray(config.widgets) ? config.widgets : []).map((widget) => [widget.id, widget]));
		const providers = new Map();
		const menuSchema = schema || window.AdminOSMode.shell.createMenuSchema();

		function commandItem(label, command, options = {}) {
			return Object.assign({
				command,
				label
			}, options);
		}

		function separator() {
			return { type: 'separator' };
		}

		function getAppItems(app) {
			if (!app) {
				return [];
			}

			return [
				commandItem('Open', 'open-app', {
					icon: app.icon || 'dashicons-admin-generic',
					target: app.id
				}),
				commandItem('About', 'open-about', {
					icon: 'dashicons-info-outline',
					target: app.id
				})
			];
		}

		function getFolderItems(folder) {
			if (!folder) {
				return [];
			}

			return [
				commandItem('Open', 'open-folder', {
					icon: folder.icon || 'dashicons-category',
					target: folder.id
				})
			];
		}

		function normalizeMenu(definition, detail = {}) {
			const normalized = menuSchema.normalizeDefinition(definition, {
				appLabel: detail.label || 'Context Menu'
			});
			const groups = normalized.groups
				.map((group) => Object.assign({}, group, {
					items: group.items.filter((item) => item.type === 'separator' || item.command || item.label)
				}))
				.filter((group) => group.items.length);

			return { groups };
		}

		function registerProvider(type, provider) {
			if (!type || typeof provider !== 'function') {
				return;
			}

			providers.set(type, provider);
		}

		function getMenuForTarget(detail = {}) {
			const provider = providers.get(detail.type);
			if (!provider) {
				return { groups: [] };
			}

			return normalizeMenu(provider(detail), detail);
		}

		registerProvider('desktop', () => ({
			groups: [
				{
					id: 'primary',
					items: [
						commandItem('Change Wallpaper...', 'settings.open-panel', {
							icon: 'dashicons-format-image',
							panel: 'wallpaper'
						}),
						commandItem('System Settings', 'open-app', {
							icon: 'dashicons-admin-customizer',
							target: 'os-settings'
						}),
						separator(),
						commandItem('Reset Layout', 'session.reset-layout', {
							icon: 'dashicons-update'
						})
					]
				}
			]
		}));

		registerProvider('app', (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getAppItems(detail.app || appMap.get(detail.id))
				}
			]
		}));
		registerProvider('desktop-app', (detail) => providers.get('app')(detail));

		registerProvider('dock-app', (detail) => {
			const app = detail.app || appMap.get(detail.id);
			return {
				groups: [
					{
						id: 'primary',
						items: getAppItems(app)
					}
				]
			};
		});

		registerProvider('folder', (detail) => ({
			groups: [
				{
					id: 'primary',
					items: getFolderItems(detail.folder || folderMap.get(detail.id))
				}
			]
		}));
		registerProvider('desktop-folder', (detail) => providers.get('folder')(detail));

		registerProvider('window', (detail) => {
			const app = detail.appId ? appMap.get(detail.appId) : null;
			const items = [
				commandItem('Bring to Front', 'window.focus', {
					icon: 'dashicons-editor-expand'
				}),
				commandItem('Minimize', 'window.minimize', {
					icon: 'dashicons-minus'
				}),
				commandItem('Close', 'window.close', {
					icon: 'dashicons-no-alt'
				})
			];

			if (app) {
				items.push(separator(), commandItem('About', 'open-about', {
					icon: 'dashicons-info-outline',
					target: app.id
				}));
			}

			return {
				groups: [
					{
						id: 'primary',
						items
					}
				]
			};
		});

		registerProvider('widget', (detail) => {
			const widget = detail.widget || widgetMap.get(detail.id);
			return {
				groups: [
					{
						id: 'primary',
						items: [
							commandItem('Hide Widget', 'widget.hide', {
								icon: widget && widget.icon ? widget.icon : 'dashicons-hidden',
								target: detail.id
							})
						]
					}
				]
			};
		});

		return {
			getMenuForTarget,
			registerProvider
		};
	};

	window.AdminOSMode.shell.createContextMenuController = function createContextMenuController(shell, config = {}, context = {}) {
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.AdminOSMode.shell.createMenuSchema(labels);
		const commands = context.commands || window.AdminOSMode.shell.createCommandRegistry(shell, context);
		const registry = context.registry || window.AdminOSMode.shell.createContextMenuRegistry(config, schema);
		const itemRenderer = window.AdminOSMode.shell.createMenuItemRenderer(commands);
		let popover = null;
		let activeDetail = null;

		function getTargetLabel(target) {
			return target.dataset.aosContextLabel
				|| target.getAttribute('aria-label')
				|| target.getAttribute('title')
				|| '';
		}

		function getTargetDetail(target) {
			const type = target.dataset.aosContext || 'desktop';
			const id = target.dataset.aosContextId || target.dataset.aosOpenApp || target.dataset.aosOpenFolder || target.dataset.aosWidget || '';
			const app = id && Array.isArray(config.apps) ? config.apps.find((item) => item.id === id) : null;
			const folder = id && Array.isArray(config.folders) ? config.folders.find((item) => item.id === id) : null;
			const widget = id && Array.isArray(config.widgets) ? config.widgets.find((item) => item.id === id) : null;
			const detail = {
				app,
				appId: target.dataset.aosAppWindow || (app ? app.id : ''),
				folder,
				id,
				kind: type,
				label: getTargetLabel(target),
				targetElement: target,
				type,
				widget,
				widgetElement: target.dataset.aosWidget ? target : null,
				widgetId: target.dataset.aosWidget || '',
				windowElement: target.classList.contains('aos-window') ? target : target.closest('.aos-window')
			};

			if (!detail.label) {
				detail.label = app && app.label ? app.label : folder && folder.label ? folder.label : widget && widget.label ? widget.label : '';
			}

			return detail;
		}

		function resolveTarget(eventTarget) {
			if (!eventTarget || !shell.contains(eventTarget)) {
				return null;
			}

			if (eventTarget.closest('.aos-context-menu')) {
				return null;
			}

			const explicit = eventTarget.closest('[data-aos-context]');
			if (explicit && shell.contains(explicit)) {
				return explicit;
			}

			const desktop = shell.querySelector('.aos-desktop');
			return desktop && desktop.contains(eventTarget) ? desktop : null;
		}

		function closeMenu() {
			if (popover) {
				popover.remove();
				popover = null;
			}

			activeDetail = null;
		}

		function positionMenu(clientX, clientY) {
			if (!popover) {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const minLeft = 8;
			const minTop = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const maxTop = Math.max(minTop, shell.clientHeight - popover.offsetHeight - 8);
			const left = Math.min(Math.max(minLeft, Math.round(clientX - shellRect.left)), maxLeft);
			const top = Math.min(Math.max(minTop, Math.round(clientY - shellRect.top)), maxTop);

			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;
		}

		function hasMenuItems(menuDefinition) {
			return Boolean(menuDefinition.groups.some((group) => group.items.length));
		}

		function openMenu(detail, point) {
			const menuDefinition = registry.getMenuForTarget(detail);
			if (!hasMenuItems(menuDefinition)) {
				closeMenu();
				return false;
			}

			closeMenu();
			activeDetail = detail;
			popover = document.createElement('div');
			popover.className = 'aos-menu-popover aos-context-menu';
			popover.dataset.aosContextMenu = detail.type;
			popover.setAttribute('role', 'menu');
			popover.setAttribute('aria-label', detail.label || 'Context menu');
			popover.replaceChildren(...menuDefinition.groups.flatMap((group, groupIndex) => {
				const groupItems = group.items.map((item) => itemRenderer.createItem(item, activeDetail, closeMenu));
				if (groupIndex === 0) {
					return groupItems;
				}

				const separator = document.createElement('span');
				separator.className = 'aos-menu-separator';
				separator.setAttribute('role', 'separator');
				return [separator].concat(groupItems);
			}));

			shell.appendChild(popover);
			positionMenu(point.x, point.y);

			return true;
		}

		function openFromEvent(event) {
			const disabled = event.target.closest('[data-aos-context-menu-disabled="1"]');
			if (disabled && shell.contains(disabled)) {
				closeMenu();
				event.preventDefault();
				event.stopPropagation();
				return false;
			}

			const target = resolveTarget(event.target);
			if (!target) {
				closeMenu();
				return false;
			}

			const detail = getTargetDetail(target);
			const opened = openMenu(detail, {
				x: event.clientX,
				y: event.clientY
			});

			if (opened) {
				event.preventDefault();
				event.stopPropagation();
			}

			return opened;
		}

		function bind() {
			shell.addEventListener('contextmenu', openFromEvent);
			shell.addEventListener('pointerdown', (event) => {
				if (event.ctrlKey && event.button === 0) {
					openFromEvent(event);
				}
			});
			document.addEventListener('pointerdown', (event) => {
				if (popover && !popover.contains(event.target)) {
					closeMenu();
				}
			});
			document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					closeMenu();
				}
			});
			window.addEventListener('resize', closeMenu);
			window.addEventListener('scroll', closeMenu, true);
		}

		return {
			bind,
			closeMenu,
			openMenu,
			registry
		};
	};
})();
