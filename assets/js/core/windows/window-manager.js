(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.windows = window.AdminOSMode.windows || {};

	window.AdminOSMode.windows.createWindowManager = function createWindowManager(shell, options = {}) {
		const dom = window.AdminOSMode.dom;
		const desktop = shell.querySelector('.aos-desktop');
		const sessionStore = window.AdminOSMode.session.createSessionStore(options.storageKey || '');
		let zIndex = 30;
		let windowOffset = 0;
		let restoreInProgress = false;
		let saveTimer = null;
		const resizeObserver = typeof window.ResizeObserver === 'function'
			? new window.ResizeObserver(() => scheduleSave())
			: null;
		const factory = window.AdminOSMode.windows.createWindowFactory({
			onMinimize(win) {
				if (!win) {
					return;
				}
				win.classList.add('is-hidden');
				scheduleSave();
			},

			onMaximize(win) {
				if (!win) {
					return;
				}
				win.classList.toggle('is-maximized');
				focusWindow(win);
				scheduleSave();
			},

			onClose(win, appId) {
				if (!win) {
					return;
				}
				win.remove();
				if (appId) {
					setDockRunning(appId, false);
				}
				scheduleSave();
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

		function focusWindow(win) {
			if (!win) {
				return;
			}

			zIndex += 1;
			win.style.zIndex = String(zIndex);
			win.classList.remove('is-hidden');
			scheduleSave();
		}

		function setDockRunning(appId, running) {
			const selector = `[data-aos-open-app="${dom.escapeAttribute(appId)}"].aos-dock-item`;
			const items = shell.querySelectorAll(selector);
			items.forEach((item) => item.classList.toggle('is-running', running));
		}

		function makeDraggable(win) {
			const handle = win.querySelector('[data-aos-drag-handle]');

			if (!handle || !desktop) {
				return;
			}

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
					const maxLeft = Math.max(0, desktop.clientWidth - win.offsetWidth);
					const maxTop = Math.max(0, desktop.clientHeight - 64);

					win.style.left = `${Math.min(Math.max(0, nextLeft), maxLeft)}px`;
					win.style.top = `${Math.min(Math.max(0, nextTop), maxTop)}px`;
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

			win.classList.toggle('is-maximized', Boolean(state.maximized));
			win.classList.toggle('is-hidden', Boolean(state.hidden));
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
			const left = Math.min(180 + windowOffset, desktop.clientWidth - 420);
			const top = Math.min(42 + windowOffset, desktop.clientHeight - 360);
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
			shell.querySelectorAll('.aos-window').forEach(bindWindowFrame);

			shell.querySelectorAll('[data-aos-minimize]').forEach((button) => {
				if (button.dataset.aosActionBound === '1') {
					return;
				}
				button.dataset.aosActionBound = '1';
				button.addEventListener('click', () => {
					button.closest('.aos-window').classList.add('is-hidden');
					scheduleSave();
				});
			});

			shell.querySelectorAll('[data-aos-maximize]').forEach((button) => {
				if (button.dataset.aosActionBound === '1') {
					return;
				}
				button.dataset.aosActionBound = '1';
				button.addEventListener('click', () => {
					const win = button.closest('.aos-window');
					win.classList.toggle('is-maximized');
					focusWindow(win);
					scheduleSave();
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
		}

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
