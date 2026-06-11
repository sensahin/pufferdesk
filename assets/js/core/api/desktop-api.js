(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.api = window.PufferDesk.api || {};

	function isElement(value) {
		return Boolean(value && value.nodeType === 1);
	}

	function escapeAttribute(value) {
		if (window.PufferDesk.dom && typeof window.PufferDesk.dom.escapeAttribute === 'function') {
			return window.PufferDesk.dom.escapeAttribute(value);
		}

		if (window.CSS && typeof window.CSS.escape === 'function') {
			return window.CSS.escape(String(value));
		}

		return String(value).replace(/["\\]/g, '\\$&');
	}

	function createDesktopApi(context = {}) {
		const shell = context.shell || null;
		const windowManager = context.windowManager || null;
		const appLauncher = context.appLauncher || null;
		const commandRegistry = context.commandRegistry || null;
		const events = context.events || window.PufferDesk.events || null;
		const nativeApps = context.nativeApps || window.PufferDesk.apps || {};
		const notificationStore = context.notificationStore || window.PufferDesk.notificationStore || null;
		const soundManager = context.soundManager || window.PufferDesk.sound || null;
		const eventNames = events && events.names ? events.names : {};

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function') {
				events.emit(name, Object.assign({
					api
				}, detail));
			}
		}

		function resolveWindow(windowRef) {
			if (isElement(windowRef)) {
				return windowRef;
			}

			const windowId = String(windowRef || '').trim();
			if (!windowId || !shell) {
				return null;
			}

			return shell.querySelector(`.pdk-window[data-pdk-window-id="${escapeAttribute(windowId)}"]:not(.is-closed)`);
		}

		function runWindowAction(action, windowRef) {
			const win = resolveWindow(windowRef);

			if (!win || !windowManager || typeof windowManager[action] !== 'function') {
				return false;
			}

			windowManager[action](win);
			emit(eventNames.DESKTOP_WINDOW_ACTION_PREFIX ? `${eventNames.DESKTOP_WINDOW_ACTION_PREFIX}${action}` : '', {
				windowElement: win,
				windowId: win.dataset ? win.dataset.pdkWindowId || '' : ''
			});

			return true;
		}

		const api = {
			apps: {
				getWindowOptions(appId) {
					return appLauncher && typeof appLauncher.getWindowOptions === 'function'
						? appLauncher.getWindowOptions(appId)
						: null;
				},
				open(appId, options = {}) {
					if (!appLauncher || typeof appLauncher.openApp !== 'function') {
						return null;
					}

					const win = appLauncher.openApp(appId, options);
					emit(eventNames.DESKTOP_APP_OPEN, {
						appId,
						windowElement: win || null
					});

					return win;
				},
				openSettingsPanel(panelId) {
					return appLauncher && typeof appLauncher.openSettingsPanel === 'function'
						? appLauncher.openSettingsPanel(panelId)
						: false;
				},
				openUrl(url, title = '', icon = '') {
					return appLauncher && typeof appLauncher.openUrl === 'function'
						? appLauncher.openUrl(url, title, icon)
						: null;
				}
			},
			commands: {
				canExecute(item, detail = {}) {
					return commandRegistry && typeof commandRegistry.canExecute === 'function'
						? commandRegistry.canExecute(item, detail)
						: false;
				},
				execute(item, detail = {}) {
					return commandRegistry && typeof commandRegistry.execute === 'function'
						? commandRegistry.execute(item, detail)
						: false;
				},
				register(command, definition) {
					return commandRegistry && typeof commandRegistry.register === 'function'
						? commandRegistry.register(command, definition)
						: false;
				}
			},
			events: {
				emit(name, detail = {}, options = {}) {
					return events && typeof events.emit === 'function' ? events.emit(name, detail, options) : null;
				},
				off(name, handler, options = {}) {
					if (events && typeof events.off === 'function') {
						events.off(name, handler, options);
					}
				},
				on(name, handler, options = {}) {
					return events && typeof events.on === 'function' ? events.on(name, handler, options) : () => {};
				},
				once(name, handler, options = {}) {
					return events && typeof events.once === 'function' ? events.once(name, handler, options) : () => {};
				}
			},
			nativeApps: {
				getWindowOptions(nativeId, nativeContext = {}) {
					return nativeApps && typeof nativeApps.getNativeAppWindowOptions === 'function'
						? nativeApps.getNativeAppWindowOptions(nativeId, nativeContext)
						: null;
				},
				hasRenderer(nativeId) {
					return nativeApps && typeof nativeApps.hasNativeAppRenderer === 'function'
						? nativeApps.hasNativeAppRenderer(nativeId)
						: false;
				},
				registerRenderer(nativeId, renderer) {
					return nativeApps && typeof nativeApps.registerNativeAppRenderer === 'function'
						? nativeApps.registerNativeAppRenderer(nativeId, renderer)
						: false;
				}
			},
			notifications: {
				dismiss(idOrIds) {
					return notificationStore && typeof notificationStore.dismiss === 'function'
						? notificationStore.dismiss(idOrIds)
						: Promise.resolve(null);
				},
				getItems() {
					return notificationStore && typeof notificationStore.getItems === 'function'
						? notificationStore.getItems()
						: [];
				},
				getUnreadCount() {
					return notificationStore && typeof notificationStore.getUnreadCount === 'function'
						? notificationStore.getUnreadCount()
						: 0;
				},
				markRead(idOrIds) {
					return notificationStore && typeof notificationStore.markRead === 'function'
						? notificationStore.markRead(idOrIds)
						: Promise.resolve(null);
				},
				notify(notification = {}) {
					return notificationStore && typeof notificationStore.notify === 'function'
						? notificationStore.notify(notification)
						: null;
				},
				refresh() {
					return notificationStore && typeof notificationStore.refresh === 'function'
						? notificationStore.refresh()
						: Promise.resolve(null);
				}
			},
			sounds: {
				canPlay(eventName) {
					return soundManager && typeof soundManager.canPlay === 'function'
						? soundManager.canPlay(eventName)
						: false;
				},
				getPreferences() {
					return soundManager && typeof soundManager.getPreferences === 'function'
						? soundManager.getPreferences()
						: {};
				},
				getEventId(key, fallback = '') {
					return soundManager && typeof soundManager.getEventId === 'function'
						? soundManager.getEventId(key, fallback)
						: fallback;
				},
				play(eventName, options = {}) {
					return soundManager && typeof soundManager.play === 'function'
						? soundManager.play(eventName, options)
						: false;
				},
				playNotification(notification = {}, preferences = null) {
					const resolvedPreferences = preferences || (
						notificationStore && typeof notificationStore.getPreferences === 'function'
							? notificationStore.getPreferences()
							: {}
					);

					return soundManager && typeof soundManager.playNotification === 'function'
						? soundManager.playNotification(notification, resolvedPreferences)
						: false;
				},
				unlock() {
					if (soundManager && typeof soundManager.unlock === 'function') {
						soundManager.unlock();
						return true;
					}

					return false;
				},
				setPreferences(preferences = {}, options = {}) {
					if (soundManager && typeof soundManager.setPreferences === 'function') {
						soundManager.setPreferences(preferences, options);
						return true;
					}

					return false;
				}
			},
			windows: {
				close(windowRef) {
					return runWindowAction('closeWindow', windowRef);
				},
				create(options = {}) {
					if (!windowManager || typeof windowManager.createWindow !== 'function') {
						return null;
					}

					const win = windowManager.createWindow(options);
					emit(eventNames.DESKTOP_WINDOW_CREATE, {
						options,
						windowElement: win || null
					});

					return win;
				},
				focus(windowRef) {
					return runWindowAction('focusWindow', windowRef);
				},
				getActive() {
					return windowManager && typeof windowManager.getActiveWindow === 'function'
						? windowManager.getActiveWindow()
						: null;
				},
				getById(windowId) {
					return resolveWindow(windowId);
				},
				hideOthers(windowRef) {
					return runWindowAction('hideOtherWindows', windowRef);
				},
				maximize(windowRef) {
					const win = resolveWindow(windowRef);
					if (!win) {
						return false;
					}
					if (win.classList.contains('is-maximized')) {
						return true;
					}

					return runWindowAction('toggleMaximizeWindow', win);
				},
				minimize(windowRef) {
					return runWindowAction('minimizeWindow', windowRef);
				},
				move(windowRef, position = {}) {
					const win = resolveWindow(windowRef);
					if (!win || !position || typeof position !== 'object') {
						return false;
					}

					if (windowManager && typeof windowManager.moveWindow === 'function') {
						windowManager.moveWindow(win, position);
					} else {
						if (Number.isFinite(position.left)) {
							win.style.left = `${Math.round(position.left)}px`;
						}
						if (Number.isFinite(position.top)) {
							win.style.top = `${Math.round(position.top)}px`;
						}
						if (windowManager && typeof windowManager.focusWindow === 'function') {
							windowManager.focusWindow(win);
						}
						if (windowManager && typeof windowManager.saveSession === 'function') {
							windowManager.saveSession();
						}
					}
					emit(eventNames.DESKTOP_WINDOW_MOVE, {
						position,
						windowElement: win,
						windowId: win.dataset ? win.dataset.pdkWindowId || '' : ''
					});

					return true;
				},
				showAll() {
					if (!windowManager || typeof windowManager.showAllWindows !== 'function') {
						return false;
					}

					windowManager.showAllWindows();
					emit(eventNames.DESKTOP_WINDOW_SHOW_ALL);

					return true;
				},
				toggleMaximize(windowRef) {
					return runWindowAction('toggleMaximizeWindow', windowRef);
				}
			}
		};

		emit(eventNames.DESKTOP_API_READY);

		return Object.freeze(api);
	}

	window.PufferDesk.api.createDesktopApi = createDesktopApi;
})();
