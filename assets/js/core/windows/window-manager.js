(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.windows = window.WPAdminOS.windows || {};

	window.WPAdminOS.windows.createWindowManager = function createWindowManager(shell, options = {}) {
		const dom = window.WPAdminOS.dom;
		const desktop = shell.querySelector('.aos-desktop');
		const dock = shell.querySelector('.aos-dock');
		const menuBar = shell.querySelector('.aos-menu-bar');
		const sessionStore = window.WPAdminOS.session.createSessionStore(options.storageKey || '');
		let zIndex = 30;
		let windowOffset = 0;
		let windowId = 0;
		let activeWindow = null;
		let fullscreenState = shell.dataset.aosFullscreenWindow === '1';
		let restoreInProgress = false;
		let preserveStoredWindowsUntilChange = Boolean(options.preserveStoredWindowsUntilChange);
		let sessionSaveDisabled = false;
		let saveTimer = null;
		let showDesktopActive = false;
		let showDesktopWindows = new Set();
		const animationTimers = new WeakMap();
		const resizeDirections = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
		const resizeObserver = typeof window.ResizeObserver === 'function'
			? new window.ResizeObserver(() => scheduleSave())
			: null;
		const factory = window.WPAdminOS.windows.createWindowFactory({
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
				next.searchParams.set('wp_adminos_iframe', '1');
				return next.toString();
			} catch (error) {
				const joiner = url.indexOf('?') === -1 ? '?' : '&';
				return `${url}${joiner}wp_adminos_iframe=1`;
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

			if (shell.dataset.aosMenuBarHidden === '1') {
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

			exitShowDesktop(false);
			zIndex += 1;
			win.style.zIndex = String(zIndex);
			revealWindow(win);
			constrainWindow(win);
			setActiveWindow(win);
			scheduleSave();
		}

		function minimizeWindow(win) {
			if (!win || win.classList.contains('is-hidden') || win.classList.contains('is-minimizing')) {
				return;
			}

			cancelWindowAnimation(win);
			win.classList.remove('is-opening', 'is-restoring', 'is-show-desktop-hidden');
			if (!shouldMinimizeIntoAppIcon()) {
				createMinimizedDockItem(win);
			}

			const target = getWindowAnimationTarget(win);
			setWindowAnimationTarget(win, target);
			win.dataset.aosMinimizeAnimation = getMinimizeAnimation();
			win.classList.add('is-minimizing');

			if (activeWindow === win) {
				setActiveWindow(getTopVisibleWindow());
			}

			finishWindowAnimation(win, 'is-minimizing', () => {
				win.classList.remove('is-minimizing');
				win.classList.add('is-hidden');
				win.removeAttribute('data-aos-minimize-animation');
				clearWindowAnimationTarget(win);
				scheduleSave();
			});
		}

		function hideOtherWindows(referenceWindow) {
			if (!referenceWindow) {
				return;
			}

			shell.querySelectorAll('.aos-window').forEach((win) => {
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
			shell.querySelectorAll('.aos-window.is-hidden:not(.is-closed)').forEach((win) => {
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
			return Boolean(shell.querySelector('.aos-window.is-hidden:not(.is-closed)'));
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

			cancelWindowAnimation(win);
			removeMinimizedDockItem(win);
			showDesktopWindows.delete(win);
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

			const folderId = win.dataset.aosFolderWindow || win.dataset.aosFolderInfoWindow || '';
			const id = folderId || win.dataset.aosAppWindow || getWindowId(win);

			return {
				appId: win.dataset.aosAppWindow || '',
				folderId,
				id,
				kind: win.dataset.aosWindowKind || (win.dataset.aosAppWindow ? 'app' : 'window'),
				menu: win.aosMenu || null,
				title: win.dataset.aosWindowTitle || win.getAttribute('aria-label') || '',
				toolbarDisplay: win.dataset.aosFolderToolbarDisplay || '',
				url: win.dataset.aosWindowUrl || '',
				windowElement: win,
				windowId: getWindowId(win)
			};
		}

		function dispatchActiveWindowChange() {
			shell.dispatchEvent(new window.CustomEvent('wpAdminOS:active-window-change', {
				detail: getActiveWindowDetail(activeWindow)
			}));
		}

		function syncFullscreenState(force = false) {
			const fullscreen = Boolean(activeWindow && isVisibleWindow(activeWindow) && activeWindow.classList.contains('is-maximized'));

			if (!force && fullscreen === fullscreenState) {
				return;
			}

			fullscreenState = fullscreen;
			shell.dataset.aosFullscreenWindow = fullscreen ? '1' : '0';
			shell.dispatchEvent(new window.CustomEvent('wpAdminOS:fullscreen-window-change', {
				detail: {
					fullscreen
				}
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
			syncFullscreenState();
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
			return Array.from(shell.querySelectorAll('.aos-window'))
				.filter(isVisibleWindow)
				.sort((first, second) => getWindowZIndex(second) - getWindowZIndex(first))[0] || null;
		}

		function setDockRunning(appId, running) {
			const selector = `[data-aos-open-app="${dom.escapeAttribute(appId)}"].aos-dock-item`;
			const items = shell.querySelectorAll(selector);
			items.forEach((item) => item.classList.toggle('is-running', running));
		}

		function getWindowId(win) {
			if (!win.dataset.aosWindowId) {
				windowId += 1;
				win.dataset.aosWindowId = `window-${windowId}`;
			}

			return win.dataset.aosWindowId;
		}

		function shouldAnimateOpeningApps() {
			return shell.dataset.aosDockAnimateApps !== '0';
		}

		function getMinimizeAnimation() {
			return shell.dataset.aosMinimizeAnimation === 'scale' ? 'scale' : 'genie';
		}

		function shouldMinimizeIntoAppIcon() {
			return shell.dataset.aosMinimizeIntoAppIcon === '1';
		}

		function getWallpaperClickMode() {
			return shell.dataset.aosWallpaperClick || 'always';
		}

		function shouldWallpaperClickShowDesktop() {
			const mode = getWallpaperClickMode();

			if (mode === 'never') {
				return false;
			}

			return true;
		}

		function getDockAppButton(win) {
			const appId = win && win.dataset.aosAppWindow;

			if (!appId) {
				return null;
			}

			return shell.querySelector(`[data-aos-open-app="${dom.escapeAttribute(appId)}"].aos-dock-item`);
		}

		function getAppWindow(appId) {
			return appId
				? desktop.querySelector(`[data-aos-app-window="${dom.escapeAttribute(appId)}"]:not(.is-closed)`)
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

		function getMinimizedDockItem(win) {
			const id = win && win.dataset.aosWindowId;

			return id ? shell.querySelector(`[data-aos-restore-window-id="${dom.escapeAttribute(id)}"]`) : null;
		}

		function getWindowAnimationTarget(win) {
			const target = shouldMinimizeIntoAppIcon() ? getDockAppButton(win) : getMinimizedDockItem(win);

			if (!target) {
				return null;
			}

			const winRect = win.getBoundingClientRect();
			const targetRect = target.getBoundingClientRect();

			return {
				x: Math.round(targetRect.left + targetRect.width / 2 - (winRect.left + winRect.width / 2)),
				y: Math.round(targetRect.top + targetRect.height / 2 - (winRect.top + winRect.height / 2))
			};
		}

		function setWindowAnimationTarget(win, target) {
			const fallbackY = Math.max(96, Math.round(desktop.getBoundingClientRect().bottom - win.getBoundingClientRect().bottom + 64));
			const x = target ? target.x : 0;
			const y = target ? target.y : fallbackY;

			win.style.setProperty('--aos-window-animation-x', `${x}px`);
			win.style.setProperty('--aos-window-animation-y', `${y}px`);
		}

		function clearWindowAnimationTarget(win) {
			win.style.removeProperty('--aos-window-animation-x');
			win.style.removeProperty('--aos-window-animation-y');
		}

		function cancelWindowAnimation(win) {
			const entry = animationTimers.get(win);

			if (entry) {
				window.clearTimeout(entry.timer);
				win.removeEventListener('animationend', entry.finish);
				animationTimers.delete(win);
			}
		}

		function finishWindowAnimation(win, className, callback, duration = 280) {
			cancelWindowAnimation(win);

			let finished = false;
			const finish = (event) => {
				if (event && event.target !== win) {
					return;
				}
				if (finished) {
					return;
				}

				finished = true;
				cancelWindowAnimation(win);
				if (typeof callback === 'function') {
					callback();
				} else {
					win.classList.remove(className);
					clearWindowAnimationTarget(win);
				}
			};
			const timer = window.setTimeout(finish, duration);

			animationTimers.set(win, {
				finish,
				timer
			});
			win.addEventListener('animationend', finish);
		}

		function playWindowAnimation(win, className, target, duration = 280) {
			cancelWindowAnimation(win);
			setWindowAnimationTarget(win, target);
			win.dataset.aosMinimizeAnimation = getMinimizeAnimation();
			win.classList.remove('is-opening', 'is-restoring');
			win.classList.add(className);

			finishWindowAnimation(win, className, () => {
				win.classList.remove(className);
				win.removeAttribute('data-aos-minimize-animation');
				clearWindowAnimationTarget(win);
			}, duration);
		}

		function revealWindow(win, options = {}) {
			const wasHidden = win.classList.contains('is-hidden') || win.classList.contains('is-minimizing');
			const target = getWindowAnimationTarget(win);

			cancelWindowAnimation(win);
			win.classList.remove('is-hidden', 'is-closed', 'is-minimizing', 'is-show-desktop-hidden');
			win.removeAttribute('data-aos-minimize-animation');
			removeMinimizedDockItem(win);
			constrainWindow(win);

			if (wasHidden && options.animate !== false && shouldAnimateOpeningApps()) {
				playWindowAnimation(win, 'is-restoring', target);
			}
		}

		function getDockFixedEndItem() {
			return dock ? dock.querySelector('.aos-dock-item[data-aos-dock-fixed="end"]') : null;
		}

		function getMinimizedDockContainer() {
			if (!dock) {
				return null;
			}

			const fixedEndItem = getDockFixedEndItem();
			let container = dock.querySelector('.aos-dock-minimized-windows');
			if (!container) {
				container = document.createElement('span');
				container.className = 'aos-dock-minimized-windows';
				dock.insertBefore(container, fixedEndItem || null);
			} else if (fixedEndItem && container.nextElementSibling !== fixedEndItem) {
				dock.insertBefore(container, fixedEndItem);
			}

			return container;
		}

		function createMinimizedDockItem(win) {
			const container = getMinimizedDockContainer();
			const id = getWindowId(win);

			if (!container || getMinimizedDockItem(win)) {
				return getMinimizedDockItem(win);
			}

			const button = document.createElement('button');
			const title = win.dataset.aosWindowTitle || win.getAttribute('aria-label') || 'Window';
			const dockAppButton = getDockAppButton(win);
			const icon = dockAppButton ? dockAppButton.querySelector('.aos-icon-image, .dashicons') : null;

			button.type = 'button';
			button.className = 'aos-dock-window-item';
			button.dataset.aosContext = 'window';
			button.dataset.aosContextId = id;
			button.dataset.aosContextLabel = title;
			button.dataset.aosRestoreWindowId = id;
			button.dataset.aosDockTooltip = title;
			if (win.dataset.aosAppWindow) {
				button.dataset.aosAppWindow = win.dataset.aosAppWindow;
			}
			button.setAttribute('aria-label', `Restore ${title}`);
			if (icon) {
				button.appendChild(icon.cloneNode(true));
			} else {
				button.appendChild(dom.createDashicon('dashicons-admin-generic'));
			}
			const tooltip = dom.createElement('span', 'aos-dock-tooltip', title);
			tooltip.setAttribute('aria-hidden', 'true');
			button.appendChild(tooltip);
			button.addEventListener('click', () => focusWindow(win));
			container.appendChild(button);

			return button;
		}

		function removeMinimizedDockItem(win) {
			const item = getMinimizedDockItem(win);

			if (item) {
				item.remove();
			}

			const container = dock && dock.querySelector('.aos-dock-minimized-windows');
			if (container && !container.children.length) {
				container.remove();
			}
		}

		function syncMinimizedDockItems() {
			if (shouldMinimizeIntoAppIcon()) {
				shell.querySelectorAll('.aos-dock-window-item').forEach((item) => item.remove());
				const container = dock && dock.querySelector('.aos-dock-minimized-windows');
				if (container && !container.children.length) {
					container.remove();
				}
				return;
			}

			shell.querySelectorAll('.aos-window.is-hidden:not(.is-closed)').forEach((win) => {
				createMinimizedDockItem(win);
			});
		}

		function enterShowDesktop() {
			const visibleWindows = Array.from(shell.querySelectorAll('.aos-window')).filter(isVisibleWindow);

			if (!visibleWindows.length) {
				setActiveWindow(null);
				return;
			}

			showDesktopActive = true;
			showDesktopWindows = new Set(visibleWindows);
			shell.dataset.aosShowingDesktop = '1';
			visibleWindows.forEach((win) => {
				win.classList.add('is-show-desktop-hidden');
			});
			setActiveWindow(null);
		}

		function exitShowDesktop(focusTop = true) {
			if (!showDesktopActive) {
				return;
			}

			showDesktopWindows.forEach((win) => {
				win.classList.remove('is-show-desktop-hidden');
			});
			showDesktopWindows = new Set();
			showDesktopActive = false;
			shell.dataset.aosShowingDesktop = '0';

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

		function isDragExcludedTarget(target) {
			return Boolean(
				target
				&& typeof target.closest === 'function'
				&& target.closest('button, input, select, textarea, a, [contenteditable="true"], [data-aos-no-drag]')
			);
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

				handle.addEventListener('dblclick', (event) => {
					if (isDragExcludedTarget(event.target)) {
						return;
					}

					const action = shell.dataset.aosTitlebarDoubleClick || 'zoom';
					if (action === 'minimize') {
						minimizeWindow(win);
					} else if (action === 'zoom') {
						toggleMaximizeWindow(win);
					}
				});

				handle.addEventListener('pointerdown', (event) => {
					if (isDragExcludedTarget(event.target) || win.classList.contains('is-maximized')) {
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

		function getResizeDirections(win) {
			const mode = win.dataset.aosResizeMode || 'both';

			if (mode === 'none') {
				return [];
			}
			if (mode === 'vertical') {
				return ['n', 's'];
			}
			if (mode === 'horizontal') {
				return ['e', 'w'];
			}

			return resizeDirections;
		}

		function ensureResizeHandles(win) {
			if (win.dataset.aosResizeHandlesBound === '1') {
				return;
			}

			win.dataset.aosResizeHandlesBound = '1';

			getResizeDirections(win).forEach((direction) => {
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
			if (
				!desktop
				|| win.classList.contains('is-maximized')
				|| win.classList.contains('is-resizing')
				|| !getResizeDirections(win).includes(direction)
			) {
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

			desktop.querySelectorAll('.aos-window').forEach((win) => {
				if (win.dataset.aosPersist === '0') {
					return;
				}

				if (win.dataset.aosWindowKind === 'folder') {
					const folderId = win.dataset.aosFolderWindow;
					const tabState = typeof win.aosSerializeFolderTabs === 'function'
						? win.aosSerializeFolderTabs()
						: null;
					if (folderId) {
						const folderWindow = {
							kind: 'folder',
							folderId,
							state: readWindowState(win)
						};

						if (tabState && Array.isArray(tabState.tabs) && tabState.tabs.length) {
							folderWindow.activeTabId = tabState.activeTabId || '';
							folderWindow.tabs = tabState.tabs;
						}

						windows.push(folderWindow);
					}
					return;
				}

				const appId = win.dataset.aosAppWindow;
				if (appId) {
					windows.push({
						kind: 'app',
						appId,
						state: readWindowState(win)
					});
				}
			});

			return windows;
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
			if (!options.storageKey || restoreInProgress || sessionSaveDisabled) {
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

		function getCenteredPosition(windowOptions = {}) {
			const width = readNumber(windowOptions.width) ?? 360;
			const height = readNumber(windowOptions.height) ?? 260;
			const bounds = {
				maxLeft: Math.max(0, desktop.clientWidth - width),
				maxTop: Math.max(getWindowSafeTop(), desktop.clientHeight - height),
				minLeft: 0,
				minTop: getWindowSafeTop()
			};
			const left = clamp(Math.round((desktop.clientWidth - width) / 2), bounds.minLeft, bounds.maxLeft);
			const top = clamp(Math.round((desktop.clientHeight - height) / 2), bounds.minTop, bounds.maxTop);

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
			getWindowId(win);
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

			const position = windowOptions.centered ? getCenteredPosition(windowOptions) : getDefaultPosition();
			const win = factory.createWindowElement(Object.assign({}, windowOptions, position), withIframeParam);
			desktop.appendChild(win);

			if (windowOptions.state) {
				applyWindowState(win, windowOptions.state);
			}

			bindWindowFrame(win);

			if (!windowOptions.skipFocus) {
				focusWindow(win);
				if (!restoreInProgress && shouldAnimateOpeningApps() && !(windowOptions.state && windowOptions.state.hidden)) {
					playWindowAnimation(win, 'is-opening', getWindowAnimationTarget(win), 220);
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

		shell.addEventListener('wpAdminOS:desktop-dock-change', () => {
			syncMinimizedDockItems();
			if (!shouldWallpaperClickShowDesktop()) {
				exitShowDesktop(true);
			}
		});

		shell.addEventListener('wpAdminOS:menu-bar-layout-change', () => {
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
				window.clearTimeout(saveTimer);
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
			makeDraggable,
			minimizeWindow,
			restoreSession,
			saveSession,
			setDockRunning,
			showAllWindows,
			toggleMaximizeWindow,
			withIframeParam
		};
	};

	window.WPAdminOS.createWindowManager = window.WPAdminOS.windows.createWindowManager;
})();
