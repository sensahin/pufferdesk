(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createCommandRegistry = function createCommandRegistry(shell, context = {}) {
		const dom = window.AdminOSMode.dom;
		const launcher = context.launcher || null;
		const manager = context.manager || null;
		const widgetManager = context.widgetManager || null;
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
			command.run(getPayload(item), detail);
			return true;
		}

		function setActiveDetail(detail = {}) {
			activeDetail = detail && typeof detail === 'object' ? detail : { kind: 'desktop' };
		}

		function getAppTargetFromDetail(detail = {}) {
			const appId = detail && detail.appId ? detail.appId : '';
			return appId.startsWith('about-') ? appId.slice(6) : appId;
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
