(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowManager = function createWindowManager(shell, options = {}) {
		const dom = window.PufferDesk.dom;
		const createDebouncedTask = window.PufferDesk.services.createDebouncedTask;
		const desktop = shell.querySelector('.pdk-desktop');
		const dock = shell.querySelector('.pdk-dock');
		const menuBar = shell.querySelector('.pdk-menu-bar');
		const sessionStore = window.PufferDesk.session.createSessionStore(options.storageKey || '');
		const eventBus = window.PufferDesk.events && typeof window.PufferDesk.events.emit === 'function'
			? window.PufferDesk.events
			: null;
		let zIndex = 30;
		let windowId = 0;
		let activeWindow = null;
		let fullscreenState = shell.dataset.pdkFullscreenWindow === '1';
		let restoreInProgress = false;
		let preserveStoredWindowsUntilChange = Boolean(options.preserveStoredWindowsUntilChange);
		let sessionSaveDisabled = false;
		let showDesktopActive = false;
		let showDesktopWindows = new Set();
		const sessionSaveTask = createDebouncedTask(() => saveSession(), {
			shouldRun: () => Boolean(options.storageKey && !restoreInProgress && !sessionSaveDisabled),
			wait: 160
		});
		const resizeObserver = typeof window.ResizeObserver === 'function'
			? new window.ResizeObserver(() => scheduleSave())
			: null;
		const layout = window.PufferDesk.windows.createWindowLayout(shell, {
			desktop,
			dock,
			isVisibleWindow,
			menuBar
		});
		const windowState = window.PufferDesk.windows.createWindowState(shell, {
			desktop,
			emitWindowStateChanged,
			layout,
			setZIndexFloor
		});
		const windowDock = window.PufferDesk.windows.createWindowDock(shell, {
			constrainWindow,
			desktop,
			dock,
			emitWindowStateChanged,
			focusWindow,
			getActiveWindow: () => activeWindow,
			getTopVisibleWindow,
			getWindowId,
			isVisibleWindow,
			scheduleSave,
			setActiveWindow
		});
		const interactions = window.PufferDesk.windows.createWindowInteractions(shell, {
			desktop,
			emitWindowStateChanged,
			focusWindow,
			layout,
			scheduleSave,
			toggleMaximizeWindow
		});
		const factory = window.PufferDesk.windows.createWindowFactory({
			onMinimize(win) {
				minimizeWindow(win);
			},

			onMaximize(win) {
				toggleMaximizeWindow(win);
			},

			onClose(win, appId) {
				closeWindow(win, appId);
			}
		});

		function getWindowEventDetail(win, detail = {}) {
			const state = win ? readWindowState(win) : null;
			const folderId = win && win.dataset ? win.dataset.pdkFolderWindow || win.dataset.pdkFolderInfoWindow || '' : '';

			return Object.assign({
				active: Boolean(win && activeWindow === win),
				appId: win && win.dataset ? win.dataset.pdkAppWindow || '' : '',
				folderId,
				hidden: Boolean(win && win.classList.contains('is-hidden')),
				kind: win && win.dataset ? win.dataset.pdkWindowKind || (win.dataset.pdkAppWindow ? 'app' : 'window') : '',
				maximized: Boolean(win && win.classList.contains('is-maximized')),
				restoring: restoreInProgress,
				state,
				title: win && win.dataset ? win.dataset.pdkWindowTitle || win.getAttribute('aria-label') || '' : '',
				url: win && win.dataset ? win.dataset.pdkWindowUrl || '' : '',
				windowElement: win || null,
				windowId: win ? getWindowId(win) : ''
			}, detail);
		}

		function emitWindowEvent(name, win, detail = {}) {
			if (!eventBus || !name) {
				return null;
			}

			return eventBus.emit(name, getWindowEventDetail(win, detail));
		}

		function emitWindowStateChanged(win, change, detail = {}) {
			return emitWindowEvent('window:stateChanged', win, Object.assign({
				change
			}, detail));
		}

		function withIframeParam(url) {
			try {
				const next = new URL(url, window.location.origin);
				next.searchParams.set('pufferdesk_iframe', '1');
				return next.toString();
			} catch (error) {
				const joiner = url.indexOf('?') === -1 ? '?' : '&';
				return `${url}${joiner}pufferdesk_iframe=1`;
			}
		}

		function setZIndexFloor(value) {
			zIndex = Math.max(zIndex, value);
		}

		function syncWindowSafeArea() {
			return layout.syncWindowSafeArea();
		}

		function constrainWindow(win) {
			layout.constrainWindow(win);
		}

		function constrainVisibleWindows() {
			layout.constrainVisibleWindows();
		}

		function readWindowState(win) {
			return windowState.readWindowState(win);
		}

		function applyWindowState(win, state, stateOptions = {}) {
			windowState.applyWindowState(win, state, stateOptions);
		}

		function serializeWindows() {
			return windowState.serializeWindows();
		}

		function minimizeWindow(win) {
			windowDock.minimizeWindow(win);
		}

		function revealWindow(win, revealOptions = {}) {
			windowDock.revealWindow(win, revealOptions);
		}

		function setDockRunning(appId, running) {
			windowDock.setDockRunning(appId, running);
		}

		function syncMinimizedDockItems() {
			windowDock.syncMinimizedDockItems();
		}

		function focusWindow(win) {
			if (!win) {
				return;
			}

			exitShowDesktop(false);
			zIndex += 1;
			win.style.zIndex = String(zIndex);
			revealWindow(win);
			constrainWindow(win);
			setActiveWindow(win);
			emitWindowStateChanged(win, 'focused');
			scheduleSave();
		}

		function moveWindow(win, position = {}, moveOptions = {}) {
			if (!win || !position || typeof position !== 'object') {
				return false;
			}

			const startState = readWindowState(win);
			win.style.transform = 'none';

			if (Number.isFinite(position.left)) {
				win.style.left = `${Math.round(position.left)}px`;
			}
			if (Number.isFinite(position.top)) {
				win.style.top = `${Math.round(position.top)}px`;
			}

			if (moveOptions.focus !== false) {
				focusWindow(win);
			} else {
				constrainWindow(win);
			}

			const nextState = readWindowState(win);
			const changed = startState.left !== nextState.left || startState.top !== nextState.top;

			if (changed && moveOptions.emit !== false) {
				emitWindowStateChanged(win, 'moved');
			}
			scheduleSave();

			return changed;
		}

		function hideOtherWindows(referenceWindow) {
			if (!referenceWindow) {
				return;
			}

			shell.querySelectorAll('.pdk-window').forEach((win) => {
				if (win !== referenceWindow && isVisibleWindow(win)) {
					minimizeWindow(win);
				}
			});

			if (isVisibleWindow(referenceWindow)) {
				focusWindow(referenceWindow);
			} else {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function showAllWindows() {
			shell.querySelectorAll('.pdk-window.is-hidden:not(.is-closed)').forEach((win) => {
				revealWindow(win);
			});

			if (isVisibleWindow(activeWindow)) {
				focusWindow(activeWindow);
			} else {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function hasHiddenWindows() {
			return Boolean(shell.querySelector('.pdk-window.is-hidden:not(.is-closed)'));
		}

		function toggleMaximizeWindow(win) {
			if (!win) {
				return;
			}

			syncWindowSafeArea();
			win.classList.toggle('is-maximized');
			constrainWindow(win);
			focusWindow(win);
			emitWindowStateChanged(win, win.classList.contains('is-maximized') ? 'maximized' : 'restored');
			scheduleSave();
		}

		function closeWindow(win, appId) {
			if (!win) {
				return;
			}

			windowDock.cancelWindowAnimation(win);
			windowDock.removeMinimizedDockItem(win);
			showDesktopWindows.delete(win);
			const closedState = Object.assign({}, readWindowState(win), {
				closed: true
			});

			emitWindowEvent('window:closed', win, {
				appId: appId || win.dataset.pdkAppWindow || '',
				state: closedState
			});
			emitWindowStateChanged(win, 'closed', {
				state: closedState
			});
			win.remove();
			if (appId) {
				setDockRunning(appId, false);
			}
			if (activeWindow === win) {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function getActiveWindowDetail(win) {
			if (!win) {
				return {
					kind: 'desktop'
				};
			}

			const folderId = win.dataset.pdkFolderWindow || win.dataset.pdkFolderInfoWindow || '';
			const id = folderId || win.dataset.pdkAppWindow || getWindowId(win);

			return {
				appId: win.dataset.pdkAppWindow || '',
				folderId,
				id,
				kind: win.dataset.pdkWindowKind || (win.dataset.pdkAppWindow ? 'app' : 'window'),
				menu: win.pdkMenu || null,
				title: win.dataset.pdkWindowTitle || win.getAttribute('aria-label') || '',
				toolbarDisplay: win.dataset.pdkFolderToolbarDisplay || '',
				url: win.dataset.pdkWindowUrl || '',
				windowElement: win,
				windowId: getWindowId(win)
			};
		}

		function dispatchActiveWindowChange() {
			shell.dispatchEvent(new window.CustomEvent('pufferDesk:active-window-change', {
				detail: getActiveWindowDetail(activeWindow)
			}));
		}

		function syncFullscreenState(force = false) {
			const fullscreen = Boolean(activeWindow && isVisibleWindow(activeWindow) && activeWindow.classList.contains('is-maximized'));

			if (!force && fullscreen === fullscreenState) {
				return;
			}

			fullscreenState = fullscreen;
			shell.dataset.pdkFullscreenWindow = fullscreen ? '1' : '0';
			shell.dispatchEvent(new window.CustomEvent('pufferDesk:fullscreen-window-change', {
				detail: {
					fullscreen
				}
			}));
		}

		function setActiveWindow(win) {
			const previousWindow = activeWindow;
			activeWindow = win || null;
			shell.querySelectorAll('.pdk-window.is-active').forEach((item) => {
				item.classList.remove('is-active');
			});
			if (activeWindow) {
				activeWindow.classList.add('is-active');
			}
			dispatchActiveWindowChange();
			syncFullscreenState();
			if (activeWindow && activeWindow !== previousWindow) {
				emitWindowEvent('window:focused', activeWindow, {
					previousWindowElement: previousWindow || null,
					previousWindowId: previousWindow ? getWindowId(previousWindow) : ''
				});
			}
		}

		function isVisibleWindow(win) {
			return win
				&& !win.classList.contains('is-hidden')
				&& !win.classList.contains('is-closed')
				&& !win.classList.contains('is-minimizing')
				&& !win.classList.contains('is-show-desktop-hidden');
		}

		function getWindowZIndex(win) {
			const parsed = Number.parseFloat(win.style.zIndex);
			return Number.isFinite(parsed) ? parsed : 0;
		}

		function getTopVisibleWindow() {
			return Array.from(shell.querySelectorAll('.pdk-window'))
				.filter(isVisibleWindow)
				.sort((first, second) => getWindowZIndex(second) - getWindowZIndex(first))[0] || null;
		}

		function getWindowId(win) {
			if (!win.dataset.pdkWindowId) {
				windowId += 1;
				win.dataset.pdkWindowId = `window-${windowId}`;
			}

			return win.dataset.pdkWindowId;
		}

		function getWallpaperClickMode() {
			return shell.dataset.pdkWallpaperClick || 'always';
		}

		function shouldWallpaperClickShowDesktop() {
			const mode = getWallpaperClickMode();

			if (mode === 'never') {
				return false;
			}

			return true;
		}

		function getAppWindow(appId) {
			return appId
				? desktop.querySelector(`[data-pdk-app-window="${dom.escapeAttribute(appId)}"]:not(.is-closed)`)
				: null;
		}

		function getAppWindowState(appId) {
			const win = getAppWindow(appId);

			return {
				hidden: Boolean(win && (win.classList.contains('is-hidden') || win.classList.contains('is-minimizing') || win.classList.contains('is-show-desktop-hidden'))),
				open: Boolean(win),
				visible: Boolean(isVisibleWindow(win)),
				windowElement: win
			};
		}

		function enterShowDesktop() {
			const visibleWindows = Array.from(shell.querySelectorAll('.pdk-window')).filter(isVisibleWindow);

			if (!visibleWindows.length) {
				setActiveWindow(null);
				return;
			}

			showDesktopActive = true;
			showDesktopWindows = new Set(visibleWindows);
			shell.dataset.pdkShowingDesktop = '1';
			visibleWindows.forEach((win) => {
				win.classList.add('is-show-desktop-hidden');
				emitWindowStateChanged(win, 'showDesktopHidden');
			});
			setActiveWindow(null);
		}

		function exitShowDesktop(focusTop = true) {
			if (!showDesktopActive) {
				return;
			}

			showDesktopWindows.forEach((win) => {
				win.classList.remove('is-show-desktop-hidden');
				emitWindowStateChanged(win, 'showDesktopRestored');
			});
			showDesktopWindows = new Set();
			showDesktopActive = false;
			shell.dataset.pdkShowingDesktop = '0';

			if (focusTop) {
				setActiveWindow(getTopVisibleWindow());
			}
		}

		function toggleShowDesktop() {
			if (showDesktopActive) {
				exitShowDesktop(true);
				return;
			}

			enterShowDesktop();
		}

		function observeWindow(win) {
			if (resizeObserver) {
				resizeObserver.observe(win);
			}
		}

		function saveSession() {
			if (!options.storageKey || restoreInProgress || sessionSaveDisabled) {
				return;
			}

			const windows = serializeWindows();
			if (preserveStoredWindowsUntilChange && !windows.length) {
				return;
			}

			preserveStoredWindowsUntilChange = false;
			sessionStore.saveSection('windows', windows);
		}

		function scheduleSave() {
			sessionSaveTask.schedule();
		}

		function bindWindowFrame(win) {
			if (win.dataset.pdkWindowBound === '1') {
				return;
			}

			win.dataset.pdkWindowBound = '1';
			getWindowId(win);
			interactions.makeDraggable(win);
			interactions.ensureResizeHandles(win);
			observeWindow(win);
			win.addEventListener('pointerdown', () => focusWindow(win));
		}

		function createWindow(windowOptions) {
			const existing = windowOptions.appId
				? desktop.querySelector(`[data-pdk-app-window="${dom.escapeAttribute(windowOptions.appId)}"]`)
				: null;

			if (existing) {
				if (windowOptions.state) {
					applyWindowState(existing, windowOptions.state);
				}
				if (!windowOptions.skipFocus) {
					focusWindow(existing);
				}
				return existing;
			}

			const position = windowOptions.centered ? layout.getCenteredPosition(windowOptions) : layout.getDefaultPosition();
			const win = factory.createWindowElement(Object.assign({}, windowOptions, position), withIframeParam);
			desktop.appendChild(win);

			if (windowOptions.state) {
				applyWindowState(win, windowOptions.state, {
					emit: false
				});
			}

			bindWindowFrame(win);
			emitWindowEvent('window:created', win, {
				options: windowOptions
			});
			emitWindowStateChanged(win, 'created');

			if (!windowOptions.skipFocus) {
				focusWindow(win);
				if (!restoreInProgress && windowDock.shouldAnimateOpeningApps() && !(windowOptions.state && windowOptions.state.hidden)) {
					windowDock.playWindowAnimation(win, 'is-opening', windowDock.getWindowAnimationTarget(win), 220);
				}
			}

			if (windowOptions.appId) {
				setDockRunning(windowOptions.appId, true);
			}
			syncMinimizedDockItems();

			preserveStoredWindowsUntilChange = false;
			scheduleSave();

			return win;
		}

		function bindExistingWindows() {
			syncWindowSafeArea();
			shell.querySelectorAll('.pdk-window').forEach((win) => {
				bindWindowFrame(win);
				constrainWindow(win);
			});

			shell.querySelectorAll('[data-pdk-close]').forEach((button) => {
				if (button.dataset.pdkActionBound === '1') {
					return;
				}
				button.dataset.pdkActionBound = '1';
				button.addEventListener('click', () => {
					closeWindow(button.closest('.pdk-window'), null);
				});
			});

			shell.querySelectorAll('[data-pdk-minimize]').forEach((button) => {
				if (button.dataset.pdkActionBound === '1') {
					return;
				}
				button.dataset.pdkActionBound = '1';
				button.addEventListener('click', () => {
					minimizeWindow(button.closest('.pdk-window'));
				});
			});

			shell.querySelectorAll('[data-pdk-maximize]').forEach((button) => {
				if (button.dataset.pdkActionBound === '1') {
					return;
				}
				button.dataset.pdkActionBound = '1';
				button.addEventListener('click', () => {
					toggleMaximizeWindow(button.closest('.pdk-window'));
				});
			});
		}

		function getAppRestoreOptions(resolver, appId) {
			if (typeof resolver === 'function') {
				return resolver(appId);
			}

			if (resolver && typeof resolver.getAppOptions === 'function') {
				return resolver.getAppOptions(appId);
			}

			return null;
		}

		function restoreSession(resolver) {
			const windows = sessionStore.getSection('windows', []);
			if (!Array.isArray(windows)) {
				return;
			}

			restoreInProgress = true;

			windows.forEach((item) => {
				if (!item || typeof item !== 'object') {
					return;
				}

				if (item.kind === 'folder') {
					if (item.folderId && resolver && typeof resolver.openFolder === 'function') {
						resolver.openFolder(item.folderId, {
							activeTabId: item.activeTabId || '',
							recordRecent: false,
							skipFocus: true,
							state: item.state,
							tabs: Array.isArray(item.tabs) ? item.tabs : null,
							touch: false
						});
					}
					return;
				}

				if (item.kind !== 'app' || !item.appId) {
					return;
				}

				const appOptions = getAppRestoreOptions(resolver, item.appId);
				if (!appOptions) {
					return;
				}

				createWindow(Object.assign({}, appOptions, {
					state: item.state,
					skipFocus: true
				}));
			});

			restoreInProgress = false;
			setActiveWindow(getTopVisibleWindow());
			syncMinimizedDockItems();
		}

		if (desktop) {
			desktop.addEventListener('click', (event) => {
				if (event.target === desktop) {
					if (shouldWallpaperClickShowDesktop()) {
						toggleShowDesktop();
					} else {
						setActiveWindow(null);
					}
				}
			});
		}

		shell.addEventListener('pufferDesk:desktop-dock-change', () => {
			syncMinimizedDockItems();
			constrainVisibleWindows();
			if (!shouldWallpaperClickShowDesktop()) {
				exitShowDesktop(true);
			}
		});

		shell.addEventListener('pufferDesk:menu-bar-layout-change', () => {
			constrainVisibleWindows();
		});

		window.addEventListener('resize', () => {
			constrainVisibleWindows();
			scheduleSave();
		});
		window.addEventListener('beforeunload', saveSession);

		return {
			applyWindowState,
			bindExistingWindows,
			closeWindow,
			createWindow,
			disableSessionSave() {
				sessionSaveDisabled = true;
				sessionSaveTask.cancel();
			},
			focusWindow,
			getActiveWindow() {
				return activeWindow;
			},
			getAppWindowState,
			hasHiddenWindows,
			hideOtherWindows,
			isPreservingStoredWindows() {
				return preserveStoredWindowsUntilChange;
			},
			makeDraggable: interactions.makeDraggable,
			minimizeWindow,
			moveWindow,
			restoreSession,
			saveSession,
			setDockRunning,
			showAllWindows,
			toggleMaximizeWindow,
			withIframeParam
		};
	};

	window.PufferDesk.createWindowManager = window.PufferDesk.windows.createWindowManager;
})();
