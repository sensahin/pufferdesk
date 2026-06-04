(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.windows = window.AdminOSMode.windows || {};

	window.AdminOSMode.windows.createWindowManager = function createWindowManager(shell, options = {}) {
		const dom = window.AdminOSMode.dom;
		const desktop = shell.querySelector('.aos-desktop');
		const menuBar = shell.querySelector('.aos-menu-bar');
		const sessionStore = window.AdminOSMode.session.createSessionStore(options.storageKey || '');
		let zIndex = 30;
		let windowOffset = 0;
		let activeWindow = null;
		let restoreInProgress = false;
		let saveTimer = null;
		const resizeDirections = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
		const resizeObserver = typeof window.ResizeObserver === 'function'
			? new window.ResizeObserver(() => scheduleSave())
			: null;
		const factory = window.AdminOSMode.windows.createWindowFactory({
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

		function withIframeParam(url) {
			try {
				const next = new URL(url, window.location.origin);
				next.searchParams.set('admin_os_iframe', '1');
				return next.toString();
			} catch (error) {
				const joiner = url.indexOf('?') === -1 ? '?' : '&';
				return `${url}${joiner}admin_os_iframe=1`;
			}
		}

		function clamp(value, min, max) {
			return Math.min(Math.max(min, value), Math.max(min, max));
		}

		function getCssPixelValue(name, fallback) {
			const parsed = Number.parseFloat(window.getComputedStyle(shell).getPropertyValue(name));
			return Number.isFinite(parsed) ? parsed : fallback;
		}

		function getMenuBarHeight() {
			if (!menuBar) {
				return 0;
			}

			return Math.ceil(menuBar.getBoundingClientRect().height);
		}

		function getWindowSafeEdge() {
			return getCssPixelValue('--aos-window-safe-edge', 10);
		}

		function getWindowSafeTop() {
			return getMenuBarHeight() + getWindowSafeEdge();
		}

		function syncWindowSafeArea() {
			const edge = getWindowSafeEdge();
			const top = getWindowSafeTop();

			shell.style.setProperty('--aos-window-maximized-edge', `${edge}px`);
			shell.style.setProperty('--aos-window-maximized-top', `${top}px`);
			shell.style.setProperty('--aos-window-maximized-height', `calc(100% - ${top + edge}px)`);

			return {
				edge,
				top
			};
		}

		function getWindowBounds(win) {
			const safeArea = syncWindowSafeArea();
			const maxLeft = Math.max(0, desktop.clientWidth - win.offsetWidth);
			const maxTop = Math.max(safeArea.top, desktop.clientHeight - 64);

			return {
				maxLeft,
				maxTop,
				minLeft: 0,
				minTop: safeArea.top
			};
		}

		function constrainWindow(win) {
			if (!win || !desktop || !isVisibleWindow(win)) {
				return;
			}

			syncWindowSafeArea();
			if (win.classList.contains('is-maximized')) {
				return;
			}

			const desktopRect = desktop.getBoundingClientRect();
			const rect = win.getBoundingClientRect();
			const bounds = getWindowBounds(win);
			const currentLeft = readNumber(win.style.left) ?? Math.round(rect.left - desktopRect.left);
			const currentTop = readNumber(win.style.top) ?? Math.round(rect.top - desktopRect.top);

			win.style.transform = 'none';
			win.style.left = `${clamp(currentLeft, bounds.minLeft, bounds.maxLeft)}px`;
			win.style.top = `${clamp(currentTop, bounds.minTop, bounds.maxTop)}px`;
		}

		function constrainVisibleWindows() {
			syncWindowSafeArea();
			shell.querySelectorAll('.aos-window').forEach((win) => constrainWindow(win));
		}

		function focusWindow(win) {
			if (!win) {
				return;
			}

			zIndex += 1;
			win.style.zIndex = String(zIndex);
			win.classList.remove('is-hidden');
			win.classList.remove('is-closed');
			constrainWindow(win);
			setActiveWindow(win);
			scheduleSave();
		}

		function minimizeWindow(win) {
			if (!win) {
				return;
			}

			win.classList.add('is-hidden');
			if (activeWindow === win) {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function toggleMaximizeWindow(win) {
			if (!win) {
				return;
			}

			syncWindowSafeArea();
			win.classList.toggle('is-maximized');
			constrainWindow(win);
			focusWindow(win);
			scheduleSave();
		}

		function closeWindow(win, appId) {
			if (!win) {
				return;
			}

			if (win.dataset.aosWindow === 'welcome') {
				win.classList.add('is-closed');
				win.classList.remove('is-hidden');
				if (activeWindow === win) {
					setActiveWindow(getTopVisibleWindow());
				}
				scheduleSave();
				return;
			}

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

			if (win.dataset.aosWindow === 'welcome') {
				return {
					kind: 'workspace',
					title: win.getAttribute('aria-label') || ''
				};
			}

			return {
				appId: win.dataset.aosAppWindow || '',
				kind: win.dataset.aosWindowKind || (win.dataset.aosAppWindow ? 'app' : 'window'),
				menu: win.aosMenu || null,
				title: win.dataset.aosWindowTitle || win.getAttribute('aria-label') || ''
			};
		}

		function dispatchActiveWindowChange() {
			shell.dispatchEvent(new window.CustomEvent('adminOSMode:active-window-change', {
				detail: getActiveWindowDetail(activeWindow)
			}));
		}

		function setActiveWindow(win) {
			activeWindow = win || null;
			shell.querySelectorAll('.aos-window.is-active').forEach((item) => {
				item.classList.remove('is-active');
			});
			if (activeWindow) {
				activeWindow.classList.add('is-active');
			}
			dispatchActiveWindowChange();
		}

		function isVisibleWindow(win) {
			return win && !win.classList.contains('is-hidden') && !win.classList.contains('is-closed');
		}

		function getWindowZIndex(win) {
			const parsed = Number.parseFloat(win.style.zIndex);
			return Number.isFinite(parsed) ? parsed : 0;
		}

		function getTopVisibleWindow() {
			return Array.from(shell.querySelectorAll('.aos-window'))
				.filter(isVisibleWindow)
				.sort((first, second) => getWindowZIndex(second) - getWindowZIndex(first))[0] || null;
		}

		function setDockRunning(appId, running) {
			const selector = `[data-aos-open-app="${dom.escapeAttribute(appId)}"].aos-dock-item`;
			const items = shell.querySelectorAll(selector);
			items.forEach((item) => item.classList.toggle('is-running', running));
		}

		function makeDraggable(win) {
			const handles = Array.from(win.querySelectorAll('[data-aos-drag-handle]'));

			if (!handles.length || !desktop) {
				return;
			}

			handles.forEach((handle) => {
				if (handle.dataset.aosDragBound === '1') {
					return;
				}

				handle.dataset.aosDragBound = '1';

				handle.addEventListener('pointerdown', (event) => {
					if (event.target.closest('button') || win.classList.contains('is-maximized')) {
						return;
					}

					event.preventDefault();
					focusWindow(win);

					const desktopRect = desktop.getBoundingClientRect();
					const rect = win.getBoundingClientRect();
					const startX = event.clientX;
					const startY = event.clientY;
					const startLeft = rect.left - desktopRect.left;
					const startTop = rect.top - desktopRect.top;

					win.style.transform = 'none';
					win.style.left = `${startLeft}px`;
					win.style.top = `${startTop}px`;
					handle.setPointerCapture(event.pointerId);

					const move = (moveEvent) => {
						const nextLeft = startLeft + moveEvent.clientX - startX;
						const nextTop = startTop + moveEvent.clientY - startY;
						const bounds = getWindowBounds(win);

						win.style.left = `${clamp(nextLeft, bounds.minLeft, bounds.maxLeft)}px`;
						win.style.top = `${clamp(nextTop, bounds.minTop, bounds.maxTop)}px`;
					};

					const up = () => {
						handle.removeEventListener('pointermove', move);
						handle.removeEventListener('pointerup', up);
						handle.removeEventListener('pointercancel', up);
						scheduleSave();
					};

					handle.addEventListener('pointermove', move);
					handle.addEventListener('pointerup', up);
					handle.addEventListener('pointercancel', up);
				});
			});
		}

		function getResizeMinSize(win) {
			const styles = window.getComputedStyle(win);

			return {
				width: readNumber(styles.minWidth) ?? 320,
				height: readNumber(styles.minHeight) ?? 260
			};
		}

		function ensureResizeHandles(win) {
			if (win.dataset.aosResizeHandlesBound === '1') {
				return;
			}

			win.dataset.aosResizeHandlesBound = '1';

			resizeDirections.forEach((direction) => {
				const handle = document.createElement('span');
				handle.className = `aos-window-resize-handle aos-window-resize-handle-${direction}`;
				handle.dataset.aosResizeHandle = direction;
				handle.setAttribute('aria-hidden', 'true');

				handle.addEventListener('pointerdown', (event) => {
					startResize(win, handle, direction, event);
				});
				handle.addEventListener('mousedown', (event) => {
					startResize(win, handle, direction, event);
				});

				win.appendChild(handle);
			});
		}

		function startResize(win, handle, direction, event) {
			if (!desktop || win.classList.contains('is-maximized') || win.classList.contains('is-resizing')) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			focusWindow(win);

			const desktopRect = desktop.getBoundingClientRect();
			const rect = win.getBoundingClientRect();
			const minSize = getResizeMinSize(win);
			const startX = event.clientX;
			const startY = event.clientY;
			const startLeft = Math.round(rect.left - desktopRect.left);
			const startTop = Math.round(rect.top - desktopRect.top);
			const startWidth = Math.round(rect.width);
			const startHeight = Math.round(rect.height);

			win.classList.add('is-resizing');
			win.style.transform = 'none';
			win.style.left = `${startLeft}px`;
			win.style.top = `${startTop}px`;
			win.style.width = `${startWidth}px`;
			win.style.height = `${startHeight}px`;

			const pointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;

			if (pointerId !== null && typeof handle.setPointerCapture === 'function') {
				try {
					handle.setPointerCapture(pointerId);
				} catch {
					// Window-level listeners below keep resizing reliable if capture is unavailable.
				}
			}

			const move = (moveEvent) => {
				const safeArea = syncWindowSafeArea();
				const deltaX = moveEvent.clientX - startX;
				const deltaY = moveEvent.clientY - startY;
				let nextLeft = startLeft;
				let nextTop = startTop;
				let nextWidth = startWidth;
				let nextHeight = startHeight;

				if (direction.includes('e')) {
					nextWidth = clamp(startWidth + deltaX, minSize.width, desktop.clientWidth - startLeft);
				}

				if (direction.includes('s')) {
					nextHeight = clamp(startHeight + deltaY, minSize.height, desktop.clientHeight - startTop);
				}

				if (direction.includes('w')) {
					nextLeft = clamp(startLeft + deltaX, 0, startLeft + startWidth - minSize.width);
					nextWidth = startWidth + startLeft - nextLeft;
				}

				if (direction.includes('n')) {
					nextTop = clamp(startTop + deltaY, safeArea.top, startTop + startHeight - minSize.height);
					nextHeight = startHeight + startTop - nextTop;
				}

				win.style.left = `${Math.round(nextLeft)}px`;
				win.style.top = `${Math.round(nextTop)}px`;
				win.style.width = `${Math.round(nextWidth)}px`;
				win.style.height = `${Math.round(nextHeight)}px`;
			};

			const up = (upEvent) => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('mousemove', move);
				window.removeEventListener('pointerup', up);
				window.removeEventListener('mouseup', up);
				window.removeEventListener('pointercancel', up);
				win.classList.remove('is-resizing');

				const releasePointerId = Number.isFinite(upEvent.pointerId) ? upEvent.pointerId : pointerId;

				if (
					releasePointerId !== null
					&& typeof handle.hasPointerCapture === 'function'
					&& typeof handle.releasePointerCapture === 'function'
					&& handle.hasPointerCapture(releasePointerId)
				) {
					handle.releasePointerCapture(releasePointerId);
				}

				scheduleSave();
			};

			window.addEventListener('pointermove', move);
			window.addEventListener('mousemove', move);
			window.addEventListener('pointerup', up);
			window.addEventListener('mouseup', up);
			window.addEventListener('pointercancel', up);
		}

		function observeWindow(win) {
			if (resizeObserver) {
				resizeObserver.observe(win);
			}
		}

		function readNumber(value) {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : null;
		}

		function getRelativeRect(win) {
			const desktopRect = desktop.getBoundingClientRect();
			const rect = win.getBoundingClientRect();

			return {
				left: Math.round(rect.left - desktopRect.left),
				top: Math.round(rect.top - desktopRect.top),
				width: Math.round(rect.width),
				height: Math.round(rect.height)
			};
		}

		function readWindowState(win) {
			const rect = getRelativeRect(win);

			return {
				left: readNumber(win.style.left) ?? rect.left,
				top: readNumber(win.style.top) ?? rect.top,
				width: readNumber(win.style.width) ?? rect.width,
				height: readNumber(win.style.height) ?? rect.height,
				zIndex: readNumber(win.style.zIndex) ?? 20,
				hidden: win.classList.contains('is-hidden'),
				closed: win.classList.contains('is-closed'),
				maximized: win.classList.contains('is-maximized')
			};
		}

		function applyWindowState(win, state) {
			if (!state || typeof state !== 'object') {
				return;
			}

			win.style.transform = 'none';
			if (Number.isFinite(state.left)) {
				win.style.left = `${Math.max(0, state.left)}px`;
			}
			if (Number.isFinite(state.top)) {
				win.style.top = `${Math.max(0, state.top)}px`;
			}
			if (Number.isFinite(state.width)) {
				win.style.width = `${Math.max(320, state.width)}px`;
			}
			if (Number.isFinite(state.height)) {
				win.style.height = `${Math.max(260, state.height)}px`;
			}
			if (Number.isFinite(state.zIndex)) {
				win.style.zIndex = String(state.zIndex);
				zIndex = Math.max(zIndex, state.zIndex);
			}

			syncWindowSafeArea();
			win.classList.toggle('is-maximized', Boolean(state.maximized));
			win.classList.toggle('is-hidden', Boolean(state.hidden));
			win.classList.toggle('is-closed', Boolean(state.closed));
			constrainWindow(win);
		}

		function serializeWindows() {
			const windows = [];
			const welcome = shell.querySelector('[data-aos-window="welcome"]');

			if (welcome) {
				windows.push({
					kind: 'welcome',
					state: readWindowState(welcome)
				});
			}

			desktop.querySelectorAll('[data-aos-app-window]').forEach((win) => {
				const appId = win.dataset.aosAppWindow;
				if (!appId) {
					return;
				}

				windows.push({
					kind: 'app',
					appId,
					state: readWindowState(win)
				});
			});

			return windows;
		}

		function saveSession() {
			if (!options.storageKey || restoreInProgress) {
				return;
			}

			sessionStore.saveSection('windows', serializeWindows());
		}

		function scheduleSave() {
			if (!options.storageKey || restoreInProgress) {
				return;
			}

			window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(saveSession, 160);
		}

		function getDefaultPosition() {
			const bounds = {
				maxLeft: Math.max(0, desktop.clientWidth - 420),
				maxTop: Math.max(getWindowSafeTop(), desktop.clientHeight - 360),
				minLeft: 0,
				minTop: getWindowSafeTop()
			};
			const left = clamp(180 + windowOffset, bounds.minLeft, bounds.maxLeft);
			const top = clamp(bounds.minTop + windowOffset, bounds.minTop, bounds.maxTop);
			windowOffset = (windowOffset + 28) % 140;

			return {
				left: `${left}px`,
				top: `${top}px`
			};
		}

		function bindWindowFrame(win) {
			if (win.dataset.aosWindowBound === '1') {
				return;
			}

			win.dataset.aosWindowBound = '1';
			makeDraggable(win);
			ensureResizeHandles(win);
			observeWindow(win);
			win.addEventListener('pointerdown', () => focusWindow(win));
		}

		function createWindow(windowOptions) {
			const existing = windowOptions.appId
				? desktop.querySelector(`[data-aos-app-window="${dom.escapeAttribute(windowOptions.appId)}"]`)
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

			const position = getDefaultPosition();
			const win = factory.createWindowElement(Object.assign({}, windowOptions, position), withIframeParam);
			desktop.appendChild(win);

			if (windowOptions.state) {
				applyWindowState(win, windowOptions.state);
			}

			bindWindowFrame(win);

			if (!windowOptions.skipFocus) {
				focusWindow(win);
			}

			if (windowOptions.appId) {
				setDockRunning(windowOptions.appId, true);
			}

			scheduleSave();

			return win;
		}

		function bindExistingWindows() {
			syncWindowSafeArea();
			shell.querySelectorAll('.aos-window').forEach((win) => {
				bindWindowFrame(win);
				constrainWindow(win);
			});

			shell.querySelectorAll('[data-aos-close]').forEach((button) => {
				if (button.dataset.aosActionBound === '1') {
					return;
				}
				button.dataset.aosActionBound = '1';
				button.addEventListener('click', () => {
					closeWindow(button.closest('.aos-window'), null);
				});
			});

			shell.querySelectorAll('[data-aos-minimize]').forEach((button) => {
				if (button.dataset.aosActionBound === '1') {
					return;
				}
				button.dataset.aosActionBound = '1';
				button.addEventListener('click', () => {
					minimizeWindow(button.closest('.aos-window'));
				});
			});

			shell.querySelectorAll('[data-aos-maximize]').forEach((button) => {
				if (button.dataset.aosActionBound === '1') {
					return;
				}
				button.dataset.aosActionBound = '1';
				button.addEventListener('click', () => {
					toggleMaximizeWindow(button.closest('.aos-window'));
				});
			});
		}

		function restoreSession(appResolver) {
			const windows = sessionStore.getSection('windows', []);
			if (!Array.isArray(windows)) {
				return;
			}

			restoreInProgress = true;

			windows.forEach((item) => {
				if (!item || typeof item !== 'object') {
					return;
				}

				if (item.kind === 'welcome') {
					const welcome = shell.querySelector('[data-aos-window="welcome"]');
					if (welcome) {
						applyWindowState(welcome, item.state);
					}
					return;
				}

				if (item.kind !== 'app' || !item.appId || typeof appResolver !== 'function') {
					return;
				}

				const appOptions = appResolver(item.appId);
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
		}

		if (desktop) {
			desktop.addEventListener('pointerdown', (event) => {
				if (event.target === desktop) {
					setActiveWindow(null);
				}
			});
		}

		window.addEventListener('resize', () => {
			constrainVisibleWindows();
			scheduleSave();
		});
		window.addEventListener('beforeunload', saveSession);

		return {
			bindExistingWindows,
			createWindow,
			focusWindow,
			makeDraggable,
			restoreSession,
			saveSession,
			setDockRunning,
			withIframeParam
		};
	};

	window.AdminOSMode.createWindowManager = window.AdminOSMode.windows.createWindowManager;
})();
