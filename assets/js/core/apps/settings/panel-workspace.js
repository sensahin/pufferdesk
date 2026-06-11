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
		const storageKeys = window.PufferDesk.session && window.PufferDesk.session.storageKeys
			? window.PufferDesk.session.storageKeys
			: {};
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-workspace-panel');
		const section = createSection('', 'pdk-settings-list pdk-settings-workspace-list');

		panel.dataset.pdkSettingsPanel = 'workspace';

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
				const storage = window.localStorage;
				const keys = [];

				for (let index = 0; index < storage.length; index += 1) {
					keys.push(storage.key(index));
				}

				keys.forEach((key) => {
					if (typeof storageKeys.isWorkspaceSessionKey === 'function' && storageKeys.isWorkspaceSessionKey(key, userId)) {
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

		function clearClipboard() {
			if (window.PufferDesk.clipboard && typeof window.PufferDesk.clipboard.clear === 'function') {
				window.PufferDesk.clipboard.clear();
			}
		}

		function confirmReset(action) {
			const options = {
				cancelLabel: t('workspace.cancelLabel'),
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
				confirmLabel: t('workspace.resetCurrentConfirmLabel'),
				message: t('workspace.resetCurrentMessage'),
				title: t('workspace.resetCurrentTitle')
			};

			confirmReset(action).then((confirmed) => {
				if (!confirmed) {
					return;
				}

				status.textContent = t('workspace.resettingLabel');
				clearClipboard();
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
				confirmLabel: t('workspace.resetAllConfirmLabel'),
				message: t('workspace.resetAllMessage'),
				title: t('workspace.resetAllTitle')
			};

			confirmReset(action).then((confirmed) => {
				if (!confirmed) {
					return;
				}

				if (!api || typeof api.post !== 'function' || !workspace.resetAction) {
					status.textContent = t('workspace.resetError');
					return;
				}

				status.textContent = t('workspace.resettingLabel');
				clearClipboard();
				skipWindowRestoreOnce();
				api.post(workspace.resetAction, {
					scope: 'all',
					theme_id: workspace.themeId || (config.theme && config.theme.id) || ''
				})
					.then((result) => {
						if (!result || !result.success) {
							status.textContent = result && result.data && result.data.message
								? result.data.message
								: t('workspace.resetError');
							return;
						}

						clearAllUserSessionCaches();
						reloadShell();
					})
					.catch((error) => {
						status.textContent = error && error.message ? error.message : t('workspace.resetError');
					});
			});
		}

		const currentButton = createButton(t('workspace.resetCurrentButton'), 'pdk-settings-button');
		const allButton = createButton(t('workspace.resetAllButton'), 'pdk-settings-button pdk-settings-danger-button');

		currentButton.addEventListener('click', resetCurrentLayout);
		allButton.addEventListener('click', resetAllLayouts);

		section.appendChild(createSettingsRow(
			t('workspace.resetCurrentLabel'),
			currentButton,
			t('workspace.resetCurrentDescription'),
			'pdk-settings-row-fluid-label'
		));
		section.appendChild(createSettingsRow(
			t('workspace.resetAllLabel'),
			allButton,
			t('workspace.resetAllDescription'),
			'pdk-settings-row-fluid-label'
		));

		panel.appendChild(createSectionHeading(t('workspace.title')));
		panel.appendChild(section);

		return panel;
	};
})();
