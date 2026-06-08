(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createWorkspacePanel = function createWorkspacePanel(ctx) {
		const {
			createButton,
			createSection,
			createSectionHeading,
			createSettingsRow,
			dom,
			status,
			t
		} = ctx;
		const config = ctx.config || {};
		const workspace = config.workspace && typeof config.workspace === 'object' ? config.workspace : {};
		const api = window.WPAdminOS.services && window.WPAdminOS.services.api ? window.WPAdminOS.services.api : null;
		const dialogs = window.WPAdminOS.shellDialogs || null;
		const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-workspace-panel');
		const section = createSection('', 'aos-settings-list aos-settings-workspace-list');

		panel.dataset.aosSettingsPanel = 'workspace';

		function reloadShell() {
			window.location.href = config.shellUrl || window.location.href;
		}

		function skipWindowRestoreOnce() {
			if (
				config.storageKey
				&& window.WPAdminOS.session
				&& typeof window.WPAdminOS.session.createReopenPolicy === 'function'
			) {
				window.WPAdminOS.session.createReopenPolicy(config.storageKey).skipWindowRestoreOnce();
			}
		}

		function clearAllUserSessionCaches() {
			const userId = Number.parseInt(config.userId, 10);
			if (!userId) {
				return;
			}

			try {
				const prefix = `wpAdminOS:${userId}:`;
				const storage = window.localStorage;
				const keys = [];

				for (let index = 0; index < storage.length; index += 1) {
					keys.push(storage.key(index));
				}

				keys.forEach((key) => {
					if (key && key.indexOf(prefix) === 0 && key.endsWith(':session')) {
						storage.removeItem(key);
					}
				});
			} catch (error) {}
		}

		function getSessionStore() {
			return config.storageKey
				&& window.WPAdminOS.session
				&& typeof window.WPAdminOS.session.createSessionStore === 'function'
				? window.WPAdminOS.session.createSessionStore(config.storageKey)
				: null;
		}

		function confirmReset(action) {
			const options = {
				cancelLabel: t('workspace.cancelLabel', 'Cancel'),
				confirmLabel: action.confirmLabel,
				message: action.message,
				title: action.title
			};

			if (dialogs && typeof dialogs.confirm === 'function') {
				return dialogs.confirm(options);
			}

			return Promise.resolve(window.confirm(action.title));
		}

		function resetCurrentLayout() {
			const action = {
				confirmLabel: t('workspace.resetCurrentConfirmLabel', 'Reset'),
				message: t('workspace.resetCurrentMessage', 'This resets the saved windows, widgets, desktop icons, and launcher order for the current theme.'),
				title: t('workspace.resetCurrentTitle', 'Reset Current Theme Layout?')
			};

			confirmReset(action).then((confirmed) => {
				if (!confirmed) {
					return;
				}

				status.textContent = t('workspace.resettingLabel', 'Resetting...');
				skipWindowRestoreOnce();

				const store = getSessionStore();
				const reset = store && typeof store.clear === 'function'
					? store.clear()
					: Promise.resolve(false);

				reset.finally(reloadShell);
			});
		}

		function resetAllLayouts() {
			const action = {
				confirmLabel: t('workspace.resetAllConfirmLabel', 'Reset All'),
				message: t('workspace.resetAllMessage', 'This resets saved workspace layouts for every WP adminOS theme for this WordPress account.'),
				title: t('workspace.resetAllTitle', 'Reset Layouts for All Themes?')
			};

			confirmReset(action).then((confirmed) => {
				if (!confirmed) {
					return;
				}

				if (!api || typeof api.post !== 'function' || !workspace.resetAction) {
					status.textContent = t('workspace.resetError', 'Workspace layout could not be reset.');
					return;
				}

				status.textContent = t('workspace.resettingLabel', 'Resetting...');
				skipWindowRestoreOnce();
				api.post(workspace.resetAction, {
					scope: 'all',
					theme_id: workspace.themeId || (config.theme && config.theme.id) || ''
				})
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: t('workspace.resetError', 'Workspace layout could not be reset.');
							return;
						}

						clearAllUserSessionCaches();
						reloadShell();
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('workspace.resetError', 'Workspace layout could not be reset.');
					});
			});
		}

		const currentButton = createButton(t('workspace.resetCurrentButton', 'Reset Current Theme Layout'), 'aos-settings-button');
		const allButton = createButton(t('workspace.resetAllButton', 'Reset Layouts for All Themes'), 'aos-settings-button aos-settings-danger-button');

		currentButton.addEventListener('click', resetCurrentLayout);
		allButton.addEventListener('click', resetAllLayouts);

		section.appendChild(createSettingsRow(
			t('workspace.resetCurrentLabel', 'Current theme layout'),
			currentButton,
			t('workspace.resetCurrentDescription', 'Reset windows, widgets, desktop icons, and launcher order for the active theme.'),
			'aos-settings-row-fluid-label'
		));
		section.appendChild(createSettingsRow(
			t('workspace.resetAllLabel', 'All theme layouts'),
			allButton,
			t('workspace.resetAllDescription', 'Clear saved workspace layouts across every theme for this WordPress account.'),
			'aos-settings-row-fluid-label'
		));

		panel.appendChild(createSectionHeading(t('workspace.title', 'Workspace')));
		panel.appendChild(section);

		return panel;
	};
})();
