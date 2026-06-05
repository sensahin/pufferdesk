(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createMenuController = function createMenuController(shell, config = {}, context = {}) {
		const menu = shell.querySelector('[data-aos-menu-items]');
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		const menuConfig = config.menu && typeof config.menu === 'object' ? config.menu : {};
		const labels = menuConfig.labels && typeof menuConfig.labels === 'object' ? menuConfig.labels : {};
		const schema = window.AdminOSMode.shell.createMenuSchema(labels);
		const commands = window.AdminOSMode.shell.createCommandRegistry(shell, context);
		let activeDetail = { kind: 'desktop' };
		let activeDefinition = schema.getDefaultDefinition({ appLabel: labels.workspace || 'Workspace', includeGo: true });

		function getDesktopDefinition() {
			return schema.normalizeDefinition(menuConfig.desktop, {
				appLabel: labels.workspace || 'Workspace',
				includeGo: true
			});
		}

		function getDefaultAppDefinition(detail = {}) {
			return schema.getDefaultDefinition({
				appLabel: detail.title || labels.admin || 'Admin'
			});
		}

		function getDefinitionForDetail(detail = {}) {
			if (!detail.kind || detail.kind === 'desktop' || detail.kind === 'workspace') {
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

		function bindGroupCommand(button, group) {
			if (!group.command) {
				return;
			}

			button.dataset.aosCommand = group.command;
			if (group.target) {
				button.dataset.aosCommandTarget = group.target;
			}
			if (Array.isArray(group.items) && group.items.length) {
				return;
			}
			button.disabled = !commands.canExecute(group, activeDetail);
			button.addEventListener('click', () => {
				commands.execute(group, activeDetail);
			});
		}

		function render(detail = {}) {
			if (!menu) {
				return;
			}

			activeDetail = detail && typeof detail === 'object' ? detail : { kind: 'desktop' };
			commands.setActiveDetail(activeDetail);
			activeDefinition = getDefinitionForDetail(activeDetail);

			menu.replaceChildren(...activeDefinition.groups.map((group) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = group.label;
				button.dataset.aosMenuGroup = group.id;
				bindGroupCommand(button, group);
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

		function getMenuDefinition() {
			return activeDefinition;
		}

		return {
			bind,
			commands,
			getMenuDefinition,
			render
		};
	};
})();
