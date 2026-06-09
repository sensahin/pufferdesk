(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createWorkspacePanel = function createWorkspacePanel(ctx) {
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
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const dialogs = window.PufferDesk.shellDialogs || null;
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-workspace-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-workspace-list');

		panel.dataset.aosSettingsPanel = 'workspace';

		function reloadShell() {
			window.location.href = config.shellUrl || window.location.href;
		}

		function skipWindowRestoreOnce() {
			if (
				config.storageKey
				&& window.PufferDesk.session
				&& typeof window.PufferDesk.session.createReopenPolicy === 'function'
			) {
				window.PufferDesk.session.createReopenPolicy(config.storageKey).skipWindowRestoreOnce();
			}
		}

		function clearAllUserSessionCaches() {
			const userId = Number.parseInt(config.userId, 10);
			if (!userId) {
				return;
			}

			try {
				const prefix = `pufferDesk:${userId}:`;
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
				&& window.PufferDesk.session
				&& typeof window.PufferDesk.session.createSessionStore === 'function'
				? window.PufferDesk.session.createSessionStore(config.storageKey)
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
				message: t('workspace.resetAllMessage', 'This resets saved workspace layouts for every PufferDesk theme for this WordPress account.'),
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

		const currentButton = createButton(t('workspace.resetCurrentButton', 'Reset Current Theme Layout'), 'pdk-settings-button');
		const allButton = createButton(t('workspace.resetAllButton', 'Reset Layouts for All Themes'), 'pdk-settings-button pdk-settings-danger-button');

		currentButton.addEventListener('click', resetCurrentLayout);
		allButton.addEventListener('click', resetAllLayouts);

		section.appendChild(createSettingsRow(
			t('workspace.resetCurrentLabel', 'Current theme layout'),
			currentButton,
			t('workspace.resetCurrentDescription', 'Reset windows, widgets, desktop icons, and launcher order for the active theme.'),
			'pdk-settings-row-fluid-label'
		));
		section.appendChild(createSettingsRow(
			t('workspace.resetAllLabel', 'All theme layouts'),
			allButton,
			t('workspace.resetAllDescription', 'Clear saved workspace layouts across every theme for this WordPress account.'),
			'pdk-settings-row-fluid-label'
		));

		panel.appendChild(createSectionHeading(t('workspace.title', 'Workspace')));
		panel.appendChild(section);

		return panel;
	};
})();
