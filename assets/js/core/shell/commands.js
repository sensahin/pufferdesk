(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createCommandRegistry = function createCommandRegistry(shell, context = {}) {
		const dom = window.AdminOSMode.dom;
		const launcher = context.launcher || null;
		const manager = context.manager || null;
		const widgetManager = context.widgetManager || null;
		const dialogs = context.dialogs || null;
		const reopenPolicy = context.reopenPolicy || null;
		const config = context.config && typeof context.config === 'object' ? context.config : {};
		const api = window.AdminOSMode.services && window.AdminOSMode.services.api ? window.AdminOSMode.services.api : null;
		const commands = new Map();
		let activeDetail = { kind: 'desktop' };

		function getTargetWindow(detail = activeDetail) {
			if (detail && detail.windowElement && detail.windowElement.classList && detail.windowElement.classList.contains('aos-window')) {
				return detail.windowElement;
			}

			if (manager && typeof manager.getActiveWindow === 'function') {
				const activeWindow = manager.getActiveWindow();
				if (activeWindow) {
					return activeWindow;
				}
			}

			if (detail && detail.appId) {
				return shell.querySelector(`[data-aos-app-window="${dom.escapeAttribute(detail.appId)}"]`);
			}

			return null;
		}

		function getTargetWidget(detail = activeDetail) {
			if (detail && detail.widgetElement && detail.widgetElement.dataset && detail.widgetElement.dataset.aosWidget) {
				return detail.widgetElement;
			}

			if (detail && detail.widgetId && widgetManager && typeof widgetManager.getWidget === 'function') {
				return widgetManager.getWidget(detail.widgetId);
			}

			return null;
		}

		function getPayload(item = {}) {
			return Object.assign({}, item.payload && typeof item.payload === 'object' ? item.payload : {}, {
				icon: item.icon || '',
				panel: item.panel || '',
				target: item.target || '',
				title: item.title || item.label || '',
				url: item.url || ''
			});
		}

		function register(id, command) {
			if (!id || !command || typeof command.run !== 'function') {
				return;
			}

			commands.set(id, command);
		}

		function canExecute(item, detail = activeDetail) {
			if (!item || item.disabled || !item.command) {
				return false;
			}

			const command = commands.get(item.command);
			if (!command) {
				return false;
			}

			if (typeof command.isEnabled === 'function') {
				return Boolean(command.isEnabled(getPayload(item), detail));
			}

			return true;
		}

		function execute(item, detail = activeDetail) {
			if (!canExecute(item, detail)) {
				return false;
			}

			const command = commands.get(item.command);
			const result = command.run(getPayload(item), detail);
			if (result && typeof result.catch === 'function') {
				result.catch((error) => {
					if (window.console && typeof window.console.error === 'function') {
						window.console.error('Admin OS command failed.', error);
					}
				});
			}
			return true;
		}

		function setActiveDetail(detail = {}) {
			activeDetail = detail && typeof detail === 'object' ? detail : { kind: 'desktop' };
		}

		function getAppTargetFromDetail(detail = {}) {
			const appId = detail && detail.appId ? detail.appId : '';
			return appId.startsWith('about-') ? appId.slice(6) : appId;
		}

		function getSystemActions() {
			return config.system && config.system.actions && typeof config.system.actions === 'object'
				? config.system.actions
				: {};
		}

		function getActionDefaults(actionKey) {
			const defaults = {
				logout: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Log Out',
					countdownSeconds: 60,
					icon: 'power',
					message: 'If you do nothing, you will be logged out automatically in {seconds} seconds.',
					overlayMessage: 'Logging out...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when logging back in',
					title: 'Are you sure you want to log out?'
				},
				eraseContentSettings: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Erase',
					message: 'This will reset Admin OS settings, wallpaper, dock, windows, and layout for this WordPress account. WordPress site content will not be affected.',
					overlayMessage: 'Erasing Admin OS settings...',
					title: 'Erase All Content and Settings?'
				},
				restart: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Restart',
					countdownSeconds: 60,
					icon: 'power',
					message: 'If you do nothing, Admin OS will restart automatically in {seconds} seconds.',
					overlayMessage: 'Restarting Admin OS...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows after restarting',
					title: 'Are you sure you want to restart Admin OS?'
				},
				switchClassic: {
					cancelLabel: 'Cancel',
					confirmLabel: 'Switch',
					countdownSeconds: 60,
					icon: 'dashicons-admin-site-alt3',
					message: 'If you do nothing, Classic Admin will open automatically in {seconds} seconds.',
					overlayMessage: 'Switching to Classic Admin...',
					reopenWindowsDefault: false,
					reopenWindowsLabel: 'Reopen windows when returning to Admin OS',
					title: 'Are you sure you want to switch to Classic Admin?'
				}
			};

			return defaults[actionKey] || {};
		}

		function getActionConfig(actionKey) {
			const actions = getSystemActions();
			return Object.assign({}, getActionDefaults(actionKey), actions[actionKey] && typeof actions[actionKey] === 'object' ? actions[actionKey] : {});
		}

		function getShellUrl() {
			if (!config.shellUrl) {
				return null;
			}

			try {
				return new URL(config.shellUrl, window.location.href);
			} catch (error) {
				return null;
			}
		}

		function isCurrentShellUrl(shellUrl) {
			if (!shellUrl) {
				return true;
			}

			try {
				return new URL(window.location.href).href === shellUrl.href;
			} catch (error) {
				return false;
			}
		}

		function saveManagers() {
			if (manager && typeof manager.saveSession === 'function') {
				manager.saveSession();
			}

			if (widgetManager && typeof widgetManager.saveSession === 'function') {
				widgetManager.saveSession();
			}
		}

		function disableSessionPersistence() {
			if (manager && typeof manager.disableSessionSave === 'function') {
				manager.disableSessionSave();
			}

			if (widgetManager && typeof widgetManager.disableSessionSave === 'function') {
				widgetManager.disableSessionSave();
			}
		}

		function skipWindowRestoreOnce() {
			if (reopenPolicy && typeof reopenPolicy.skipWindowRestoreOnce === 'function') {
				reopenPolicy.skipWindowRestoreOnce();
			}
		}

		function getLocalStorage() {
			try {
				return window.localStorage;
			} catch (error) {
				return null;
			}
		}

		function clearSessionStore() {
			disableSessionPersistence();

			if (config.storageKey && window.AdminOSMode.session && window.AdminOSMode.session.createSessionStore) {
				window.AdminOSMode.session.createSessionStore(config.storageKey).clear();
				return true;
			}

			return false;
		}

		function clearAllUserSessionStores() {
			disableSessionPersistence();

			const storage = getLocalStorage();
			const userId = Number.parseInt(config.userId, 10);
			let removed = false;

			if (storage && userId > 0) {
				const prefix = `adminOSMode:${userId}:`;
				const keys = [];

				for (let index = 0; index < storage.length; index += 1) {
					const key = storage.key(index);

					if (key && key.startsWith(prefix) && key.endsWith(':session')) {
						keys.push(key);
					}
				}

				keys.forEach((key) => {
					storage.removeItem(key);
					removed = true;
				});
			}

			return clearSessionStore() || removed;
		}

		function reloadShell() {
			const shellUrl = getShellUrl();

			if (shellUrl && !isCurrentShellUrl(shellUrl)) {
				window.location.href = shellUrl.href;
				return;
			}

			window.location.reload();
		}

		async function confirmAction(actionConfig) {
			if (dialogs && typeof dialogs.confirmTimedAction === 'function') {
				return dialogs.confirmTimedAction(actionConfig);
			}

			const confirmed = window.confirm(`${actionConfig.title}\n\n${String(actionConfig.message || '').replace('{seconds}', actionConfig.countdownSeconds || 60)}`);
			return {
				confirmed,
				reason: confirmed ? 'confirm' : 'cancel',
				reopenWindows: true
			};
		}

		async function runTimedAction(actionKey, actionRunner) {
			const actionConfig = getActionConfig(actionKey);
			const result = await confirmAction(actionConfig);

			if (!result.confirmed) {
				return;
			}

			if (result.reopenWindows === false) {
				skipWindowRestoreOnce();
			}

			saveManagers();

			if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
				dialogs.showBlockingOverlay(actionConfig.overlayMessage || '');
			}

			window.setTimeout(actionRunner, 180);
		}

		function restartShell() {
			return runTimedAction('restart', reloadShell);
		}

		function switchToClassicAdmin(payload) {
			return runTimedAction('switchClassic', () => {
				window.location.href = payload.url || payload.target || config.classicUrl;
			});
		}

		function logOut(payload) {
			return runTimedAction('logout', () => {
				window.location.href = payload.url || payload.target;
			});
		}

		async function eraseContentAndSettings() {
			const actionConfig = getActionConfig('eraseContentSettings');
			const confirmed = dialogs && typeof dialogs.confirm === 'function'
				? await dialogs.confirm(actionConfig)
				: window.confirm(`${actionConfig.title}\n\n${actionConfig.message}`);
			let overlay = null;

			if (!confirmed) {
				return;
			}

			if (!api || typeof api.post !== 'function') {
				throw new Error('Settings service unavailable.');
			}

			if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
				overlay = dialogs.showBlockingOverlay(actionConfig.overlayMessage || '');
			}

			try {
				const result = await api.post('admin_os_mode_reset', {
					profile: 'erase_content_settings'
				});

				if (!result || !result.success) {
					const message = result && result.data && result.data.message
						? result.data.message
						: 'Admin OS settings could not be reset.';
					throw new Error(message);
				}

				skipWindowRestoreOnce();
				if (result.data && result.data.client && result.data.client.clearAllUserSessions) {
					clearAllUserSessionStores();
				} else {
					clearSessionStore();
				}

				window.setTimeout(reloadShell, 180);
			} catch (error) {
				if (overlay && typeof overlay.close === 'function') {
					overlay.close();
				}

				throw error;
			}
		}

		register('noop', {
			run() {}
		});

		register('open-app', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openApp === 'function' && payload.target);
			},
			run(payload) {
				launcher.openApp(payload.target);
			}
		});

		register('open-folder', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openFolder === 'function' && payload.target);
			},
			run(payload) {
				launcher.openFolder(payload.target);
			}
		});

		register('open-about', {
			isEnabled(payload, detail) {
				return Boolean(launcher && typeof launcher.openAbout === 'function' && (payload.target || getAppTargetFromDetail(detail)));
			},
			run(payload, detail) {
				launcher.openAbout(payload.target || getAppTargetFromDetail(detail));
			}
		});

		register('open-site-about', {
			isEnabled() {
				return Boolean(launcher && typeof launcher.openSiteAbout === 'function');
			},
			run() {
				launcher.openSiteAbout();
			}
		});

		register('settings.open-panel', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openSettingsPanel === 'function' && payload.panel);
			},
			run(payload) {
				launcher.openSettingsPanel(payload.panel);
			}
		});

		register('open-url', {
			isEnabled(payload) {
				return Boolean(launcher && typeof launcher.openUrl === 'function' && (payload.url || payload.target));
			},
			run(payload) {
				launcher.openUrl(payload.url || payload.target, payload.title, payload.icon);
			}
		});

		register('navigate-url', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				window.location.href = payload.url || payload.target;
			}
		});

		register('open-external-url', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				window.open(payload.url || payload.target, '_blank', 'noopener');
			}
		});

		register('shell.restart', {
			isEnabled() {
				return Boolean(config.shellUrl || window.location.href);
			},
			run() {
				return restartShell();
			}
		});

		register('shell.switch-classic', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target || config.classicUrl);
			},
			run(payload) {
				return switchToClassicAdmin(payload);
			}
		});

		register('user.logout', {
			isEnabled(payload) {
				return Boolean(payload.url || payload.target);
			},
			run(payload) {
				return logOut(payload);
			}
		});

		register('session.reset-layout', {
			isEnabled() {
				return Boolean(config.storageKey && window.AdminOSMode.session && window.AdminOSMode.session.createSessionStore);
			},
			run() {
				skipWindowRestoreOnce();
				clearSessionStore();
				reloadShell();
			}
		});

		register('system.erase-content-settings', {
			isEnabled() {
				return Boolean(api && typeof api.post === 'function');
			},
			run() {
				return eraseContentAndSettings();
			}
		});

		register('widget.hide', {
			isEnabled(payload, detail) {
				return Boolean(widgetManager && typeof widgetManager.hideWidget === 'function' && getTargetWidget(detail));
			},
			run(payload, detail) {
				widgetManager.hideWidget(getTargetWidget(detail));
			}
		});

		register('window.focus', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.focusWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.focusWindow(getTargetWindow(detail));
			}
		});

		register('window.close', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.closeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				const win = getTargetWindow(detail);
				manager.closeWindow(win, win ? win.dataset.aosAppWindow : '');
			}
		});

		register('window.minimize', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.minimizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.minimizeWindow(getTargetWindow(detail));
			}
		});

		register('window.hide', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.minimizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.minimizeWindow(getTargetWindow(detail));
			}
		});

		register('window.hide-others', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.hideOtherWindows === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.hideOtherWindows(getTargetWindow(detail));
			}
		});

		register('window.show-all', {
			isEnabled() {
				return Boolean(manager && typeof manager.showAllWindows === 'function' && typeof manager.hasHiddenWindows === 'function' && manager.hasHiddenWindows());
			},
			run() {
				manager.showAllWindows();
			}
		});

		register('window.toggle-maximize', {
			isEnabled(payload, detail) {
				return Boolean(manager && typeof manager.toggleMaximizeWindow === 'function' && getTargetWindow(detail));
			},
			run(payload, detail) {
				manager.toggleMaximizeWindow(getTargetWindow(detail));
			}
		});

		return {
			canExecute,
			execute,
			register,
			setActiveDetail
		};
	};
})();
