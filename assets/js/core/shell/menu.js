(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createMenuController = function createMenuController(shell, config = {}, context = {}) {
		const systemButton = shell.querySelector('[data-aos-system-menu]');
		const menu = shell.querySelector('[data-aos-menu-items]');
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.AdminOSMode.shell.createMenuSchema(labels);
		const commands = context.commands || window.AdminOSMode.shell.createCommandRegistry(shell, context);
		const itemRenderer = window.AdminOSMode.shell.createMenuItemRenderer(commands);
		let activeDetail = { kind: 'desktop' };
		const persistentDefinition = menuConfig.persistent
			? schema.normalizeDefinition(menuConfig.persistent, {
				appLabel: labels.site || config.siteName || 'Site'
			})
			: { groups: [] };
		const systemDefinition = menuConfig.system
			? schema.normalizeDefinition(menuConfig.system, {
				appLabel: labels.system || 'Admin OS'
			})
			: { groups: [] };
		const systemGroup = {
			id: 'system',
			items: getGroupedItems(systemDefinition),
			label: systemDefinition.groups[0] && systemDefinition.groups[0].label ? systemDefinition.groups[0].label : 'Admin OS'
		};
		const persistentGroupIds = new Set(persistentDefinition.groups.map((group) => group.id));
		let activeDefinition = getDesktopDefinition();
		let activeButton = null;
		let popover = null;
		let openGroupId = '';

		function getDesktopDefinition() {
			return schema.normalizeDefinition(menuConfig.desktop, {
				includeGo: true
			});
		}

		function getDefaultAppDefinition(detail = {}) {
			return schema.getDefaultDefinition({
				appLabel: detail.title || labels.admin || 'Admin'
			});
		}

		function getInitialActiveDetail() {
			if (
				context.restoreWindows === false ||
				!config.storageKey ||
				!window.AdminOSMode.session ||
				!window.AdminOSMode.session.createSessionStore
			) {
				return { kind: 'desktop' };
			}

			const savedWindows = window.AdminOSMode.session.createSessionStore(config.storageKey).getSection('windows', []);
			if (!Array.isArray(savedWindows) || !savedWindows.length) {
				return { kind: 'desktop' };
			}

			const topSavedWindow = savedWindows
				.filter((item) => {
					const state = item && typeof item === 'object' && item.state && typeof item.state === 'object'
						? item.state
						: {};

					return item
						&& typeof item === 'object'
						&& item.kind === 'app'
						&& typeof item.appId === 'string'
						&& item.appId
						&& !state.hidden
						&& !state.closed;
				})
				.sort((first, second) => {
					const firstState = first.state && typeof first.state === 'object' ? first.state : {};
					const secondState = second.state && typeof second.state === 'object' ? second.state : {};
					const firstZIndex = Number.parseFloat(firstState.zIndex);
					const secondZIndex = Number.parseFloat(secondState.zIndex);

					return (Number.isFinite(secondZIndex) ? secondZIndex : 0) - (Number.isFinite(firstZIndex) ? firstZIndex : 0);
				})[0];

			if (!topSavedWindow || !appMap.has(topSavedWindow.appId)) {
				return { kind: 'desktop' };
			}

			const app = appMap.get(topSavedWindow.appId);

			return {
				appId: app.id,
				kind: 'app',
				menu: app.menu || null,
				title: app.label || labels.admin || 'Admin'
			};
		}

		function getDefinitionForDetail(detail = {}) {
			if (!detail.kind || detail.kind === 'desktop') {
				return getDesktopDefinition();
			}

			if (detail.menu) {
				return schema.normalizeDefinition(detail.menu, {
					appLabel: detail.title || labels.admin || 'Admin'
				});
			}

			if (detail.appId && appMap.has(detail.appId)) {
				const app = appMap.get(detail.appId);
				if (app.menu) {
					return schema.normalizeDefinition(app.menu, {
						appLabel: app.label || detail.title || labels.admin || 'Admin'
					});
				}
			}

			return getDefaultAppDefinition(detail);
		}

		function getRenderedGroups() {
			return persistentDefinition.groups.concat(activeDefinition.groups.filter((group) => !persistentGroupIds.has(group.id)));
		}

		function getGroupedItems(definition) {
			const items = [];

			definition.groups.forEach((group) => {
				if (!group.items.length) {
					return;
				}

				if (items.length) {
					items.push({ type: 'separator' });
				}

				items.push(...group.items);
			});

			return items;
		}

		function hasMenuItems(group) {
			return Boolean(group && Array.isArray(group.items) && group.items.length);
		}

		function resolveMenuItem(item) {
			if (item.id !== 'close-active-window') {
				return item;
			}

			const title = activeDetail && activeDetail.title ? activeDetail.title : '';
			if (!title) {
				return item;
			}

			return Object.assign({}, item, {
				label: `Close ${title}`
			});
		}

		function closePopover() {
			if (popover) {
				popover.remove();
				popover = null;
			}

			if (activeButton) {
				activeButton.classList.remove('is-active');
				activeButton.setAttribute('aria-expanded', 'false');
				activeButton = null;
			}

			openGroupId = '';
		}

		function positionPopover(button) {
			if (!popover) {
				return;
			}

			const shellRect = shell.getBoundingClientRect();
			const buttonRect = button.getBoundingClientRect();
			const top = Math.round(buttonRect.bottom - shellRect.top + 2);
			const minLeft = 8;
			const maxLeft = Math.max(minLeft, shell.clientWidth - popover.offsetWidth - 8);
			const left = Math.min(Math.max(minLeft, Math.round(buttonRect.left - shellRect.left)), maxLeft);

			popover.style.left = `${left}px`;
			popover.style.top = `${top}px`;
		}

		function createMenuItem(item) {
			return itemRenderer.createItem(resolveMenuItem(item), activeDetail, closePopover);
		}

		function openPopover(group, button, options = {}) {
			if (!hasMenuItems(group)) {
				return;
			}

			closePopover();

			activeButton = button;
			openGroupId = group.id;
			activeButton.classList.add('is-active');
			activeButton.setAttribute('aria-expanded', 'true');

			popover = document.createElement('div');
			popover.className = 'aos-menu-popover';
			popover.dataset.aosMenuPopover = group.id;
			popover.setAttribute('role', 'menu');
			popover.setAttribute('aria-label', group.label);
			popover.replaceChildren(...group.items.map(createMenuItem));

			shell.appendChild(popover);
			positionPopover(button);

			if (options.focus) {
				const firstEnabled = popover.querySelector('.aos-menu-item:not(:disabled)');
				if (firstEnabled) {
					firstEnabled.focus();
				}
			}
		}

		function togglePopover(group, button) {
			if (openGroupId === group.id) {
				closePopover();
				return;
			}

			openPopover(group, button);
		}

		function bindGroupButton(button, group) {
			button.dataset.aosMenuGroup = group.id;

			if (hasMenuItems(group)) {
				button.setAttribute('aria-haspopup', 'menu');
				button.setAttribute('aria-expanded', 'false');
				button.addEventListener('click', () => togglePopover(group, button));
				button.addEventListener('pointerenter', () => {
					if (popover) {
						openPopover(group, button);
					}
				});
				button.addEventListener('keydown', (event) => {
					if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						openPopover(group, button, { focus: true });
					} else if (event.key === 'Escape') {
						closePopover();
						button.focus();
					}
				});
				return;
			}

			if (!group.command) {
				return;
			}

			button.dataset.aosCommand = group.command;
			if (group.target) {
				button.dataset.aosCommandTarget = group.target;
			}
			button.disabled = !commands.canExecute(group, activeDetail);
			button.addEventListener('click', () => {
				commands.execute(group, activeDetail);
				closePopover();
			});
		}

		function render(detail = {}) {
			if (!menu) {
				return;
			}

			activeDetail = detail && typeof detail === 'object' ? detail : { kind: 'desktop' };
			commands.setActiveDetail(activeDetail);
			activeDefinition = getDefinitionForDetail(activeDetail);
			closePopover();

			menu.replaceChildren(...getRenderedGroups().map((group) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = group.label;
				bindGroupButton(button, group);
				return button;
			}));
		}

		function bindSystemButton() {
			if (!systemButton || systemButton.dataset.aosSystemMenuBound === '1' || !hasMenuItems(systemGroup)) {
				return;
			}

			systemButton.dataset.aosSystemMenuBound = '1';
			bindGroupButton(systemButton, systemGroup);
		}

		function bind() {
			if (!menu) {
				return;
			}

			bindSystemButton();
			render(getInitialActiveDetail());
			shell.addEventListener('adminOSMode:active-window-change', (event) => {
				render(event.detail || { kind: 'desktop' });
			});
			document.addEventListener('pointerdown', (event) => {
				if (
					popover
					&& !popover.contains(event.target)
					&& !menu.contains(event.target)
					&& (!systemButton || !systemButton.contains(event.target))
				) {
					closePopover();
				}
			});
			document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					closePopover();
				}
			});
			window.addEventListener('resize', closePopover);
		}

		function getMenuDefinition() {
			return {
				system: systemGroup,
				groups: getRenderedGroups()
			};
		}

		return {
			bind,
			closePopover,
			commands,
			getMenuDefinition,
			render
		};
	};
})();
