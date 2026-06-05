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
		const config = context.config && typeof context.config === 'object' ? context.config : {};
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

		function getRestartConfig() {
			return config.system && config.system.restart && typeof config.system.restart === 'object'
				? config.system.restart
				: {};
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

		async function confirmRestart(restartConfig) {
			const title = restartConfig.confirmTitle || 'Restart Admin OS?';
			const message = restartConfig.confirmMessage || 'Open windows will reload, but your saved layout will be preserved.';
			const confirmLabel = restartConfig.confirmLabel || 'Restart';
			const cancelLabel = restartConfig.cancelLabel || 'Cancel';

			if (dialogs && typeof dialogs.confirm === 'function') {
				return dialogs.confirm({
					cancelLabel,
					confirmLabel,
					message,
					title
				});
			}

			return window.confirm(`${title}\n\n${message}`);
		}

		async function restartShell() {
			const restartConfig = getRestartConfig();
			const confirmed = await confirmRestart(restartConfig);

			if (!confirmed) {
				return;
			}

			saveManagers();

			if (dialogs && typeof dialogs.showBlockingOverlay === 'function') {
				dialogs.showBlockingOverlay(restartConfig.overlayMessage || 'Restarting Admin OS...');
			}

			window.setTimeout(() => {
				const shellUrl = getShellUrl();

				if (shellUrl && !isCurrentShellUrl(shellUrl)) {
					window.location.href = shellUrl.href;
					return;
				}

				window.location.reload();
			}, 180);
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

		register('open-system-about', {
			isEnabled() {
				return Boolean(launcher && typeof launcher.openSystemAbout === 'function');
			},
			run() {
				launcher.openSystemAbout();
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

		register('session.reset-layout', {
			isEnabled() {
				return Boolean(config.storageKey && window.AdminOSMode.session && window.AdminOSMode.session.createSessionStore);
			},
			run() {
				window.AdminOSMode.session.createSessionStore(config.storageKey).clear();
				window.location.href = config.shellUrl || window.location.href;
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
