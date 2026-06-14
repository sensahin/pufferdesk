(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowDock = function createWindowDock(shell, options = {}) {
		const dom = window.PufferDesk.dom;
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const tooltips = window.PufferDesk.tooltips || null;
		const desktop = options.desktop || shell.querySelector('.pdk-desktop');
		const dock = options.dock || shell.querySelector('.pdk-dock');
		const animationTimers = new WeakMap();
		const noop = () => null;
		const getWindowId = typeof options.getWindowId === 'function' ? options.getWindowId : () => '';
		const getActiveWindow = typeof options.getActiveWindow === 'function' ? options.getActiveWindow : noop;
		const setActiveWindow = typeof options.setActiveWindow === 'function' ? options.setActiveWindow : noop;
		const getTopVisibleWindow = typeof options.getTopVisibleWindow === 'function' ? options.getTopVisibleWindow : noop;
		const isVisibleWindow = typeof options.isVisibleWindow === 'function' ? options.isVisibleWindow : () => false;
		const focusWindow = typeof options.focusWindow === 'function' ? options.focusWindow : noop;
		const constrainWindow = typeof options.constrainWindow === 'function' ? options.constrainWindow : noop;
		const emitWindowStateChanged = typeof options.emitWindowStateChanged === 'function'
			? options.emitWindowStateChanged
			: noop;
		const scheduleSave = typeof options.scheduleSave === 'function' ? options.scheduleSave : noop;

		function getMenuLabel(key, fallback = '') {
			const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
				? window.PufferDesk.config.get()
				: {};
			const menu = config.menu && typeof config.menu === 'object' ? config.menu : {};
			const labels = menu.labels && typeof menu.labels === 'object' ? menu.labels : {};
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback || key;
		}

		function formatMenuLabel(key, fallback, values = []) {
			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatLabel === 'function') {
				return window.PufferDesk.config.formatLabel(key, fallback || key, values);
			}

			let index = 0;
			return String(getMenuLabel(key, fallback)).replace(/%d|%s/g, () => String(values[index++] ?? ''));
		}

		function setDockRunning(appId, running) {
			const selector = `[data-pdk-open-app="${dom.escapeAttribute(appId)}"].pdk-dock-item`;
			const items = shell.querySelectorAll(selector);
			items.forEach((item) => item.classList.toggle('is-running', running));
		}

		function refreshDockFit() {
			if (window.PufferDesk.desktopDock && typeof window.PufferDesk.desktopDock.refreshFit === 'function') {
				window.PufferDesk.desktopDock.refreshFit(shell);
			}
		}

		function shouldAnimateOpeningApps() {
			return shell.dataset.pdkDockAnimateApps !== '0';
		}

		function getMinimizeAnimation() {
			return shell.dataset.pdkMinimizeAnimation === 'scale' ? 'scale' : 'genie';
		}

		function getWindowAnimationFallbackDuration(className) {
			if (className === 'is-opening') {
				return 220;
			}

			return getMinimizeAnimation() === 'scale' ? 300 : 500;
		}

		function shouldMinimizeIntoAppIcon() {
			return shell.dataset.pdkMinimizeIntoAppIcon === '1';
		}

		function getDockAppButton(win) {
			const appId = win && win.dataset.pdkAppWindow;

			if (!appId) {
				return null;
			}

			return shell.querySelector(`[data-pdk-open-app="${dom.escapeAttribute(appId)}"].pdk-dock-item`);
		}

		function getMinimizedDockItem(win) {
			const id = win && win.dataset.pdkWindowId;

			return id ? shell.querySelector(`[data-pdk-restore-window-id="${dom.escapeAttribute(id)}"]`) : null;
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

			win.style.setProperty('--pdk-window-animation-x', `${x}px`);
			win.style.setProperty('--pdk-window-animation-y', `${y}px`);
		}

		function clearWindowAnimationTarget(win) {
			win.style.removeProperty('--pdk-window-animation-x');
			win.style.removeProperty('--pdk-window-animation-y');
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

		function playWindowAnimation(win, className, target, duration = null) {
			const fallbackDuration = Number.isFinite(duration) ? duration : getWindowAnimationFallbackDuration(className);

			cancelWindowAnimation(win);
			setWindowAnimationTarget(win, target);
			win.dataset.pdkMinimizeAnimation = getMinimizeAnimation();
			win.classList.remove('is-opening', 'is-restoring');
			win.classList.add(className);

			finishWindowAnimation(win, className, () => {
				win.classList.remove(className);
				win.removeAttribute('data-pdk-minimize-animation');
				clearWindowAnimationTarget(win);
			}, fallbackDuration);
		}

		function revealWindow(win, revealOptions = {}) {
			const wasHidden = win.classList.contains('is-hidden') || win.classList.contains('is-minimizing');
			const target = getWindowAnimationTarget(win);

			cancelWindowAnimation(win);
			win.classList.remove('is-hidden', 'is-closed', 'is-minimizing', 'is-opening', 'is-restoring', 'is-show-desktop-hidden');
			win.removeAttribute('data-pdk-minimize-animation');
			clearWindowAnimationTarget(win);
			removeMinimizedDockItem(win);
			constrainWindow(win);
			if (wasHidden && revealOptions.emitState !== false) {
				emitWindowStateChanged(win, 'restored');
			}

			if (wasHidden && revealOptions.animate !== false && shouldAnimateOpeningApps()) {
				playWindowAnimation(win, 'is-restoring', target);
			}
		}

		function getDockFixedEndItem() {
			return dock ? dock.querySelector('.pdk-dock-item[data-pdk-dock-fixed="end"]') : null;
		}

		function getMinimizedDockContainer() {
			if (!dock) {
				return null;
			}

			const fixedEndItem = getDockFixedEndItem();
			const endAnchor = dock.querySelector('[data-pdk-launcher-end-anchor]');
			let container = dock.querySelector('.pdk-dock-minimized-windows');
			const anchor = fixedEndItem || endAnchor || null;
			if (!container) {
				container = document.createElement('span');
				container.className = 'pdk-dock-minimized-windows';
				dock.insertBefore(container, anchor);
			} else if (anchor && container.nextElementSibling !== anchor) {
				dock.insertBefore(container, anchor);
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
			const title = win.dataset.pdkWindowTitle || win.getAttribute('aria-label') || getMenuLabel('window');
			const dockAppButton = getDockAppButton(win);
			const icon = dockAppButton ? dockAppButton.querySelector('.pdk-icon-image, .dashicons') : null;

			button.type = 'button';
			button.className = 'pdk-dock-window-item pdk-tooltip-trigger';
			button.dataset.pdkContext = contextTargets.WINDOW;
			button.dataset.pdkContextId = id;
			button.dataset.pdkContextLabel = title;
			button.dataset.pdkRestoreWindowId = id;
			if (win.dataset.pdkAppWindow) {
				button.dataset.pdkAppWindow = win.dataset.pdkAppWindow;
			}
			button.setAttribute('aria-label', formatMenuLabel('window_restore_format', '', [title]));
			if (icon) {
				button.appendChild(icon.cloneNode(true));
			} else {
				button.appendChild(dom.createDashicon());
			}
			if (tooltips && typeof tooltips.attach === 'function') {
				tooltips.attach(button, title, { surface: 'dock' });
			}
			button.addEventListener('click', () => focusWindow(win));
			container.appendChild(button);
			refreshDockFit();

			return button;
		}

		function removeMinimizedDockItem(win) {
			const item = getMinimizedDockItem(win);
			let changed = false;

			if (item) {
				item.remove();
				changed = true;
			}

			const container = dock && dock.querySelector('.pdk-dock-minimized-windows');
			if (container && !container.children.length) {
				container.remove();
				changed = true;
			}
			if (changed) {
				refreshDockFit();
			}
		}

		function syncMinimizedDockItems() {
			if (shouldMinimizeIntoAppIcon()) {
				shell.querySelectorAll('.pdk-dock-window-item').forEach((item) => item.remove());
				const container = dock && dock.querySelector('.pdk-dock-minimized-windows');
				if (container && !container.children.length) {
					container.remove();
				}
				refreshDockFit();
				return;
			}

			shell.querySelectorAll('.pdk-window.is-hidden:not(.is-closed)').forEach((win) => {
				createMinimizedDockItem(win);
			});
			refreshDockFit();
		}

		function minimizeWindow(win) {
			if (!win || win.dataset.pdkMinimizable === '0' || win.classList.contains('is-hidden') || win.classList.contains('is-minimizing')) {
				return;
			}

			cancelWindowAnimation(win);
			win.classList.remove('is-opening', 'is-restoring', 'is-show-desktop-hidden');
			if (!shouldMinimizeIntoAppIcon()) {
				createMinimizedDockItem(win);
			}

			const target = getWindowAnimationTarget(win);
			setWindowAnimationTarget(win, target);
			win.dataset.pdkMinimizeAnimation = getMinimizeAnimation();
			win.classList.add('is-minimizing');

			if (getActiveWindow() === win) {
				setActiveWindow(getTopVisibleWindow());
			}

			finishWindowAnimation(win, 'is-minimizing', () => {
				win.classList.remove('is-minimizing');
				win.classList.add('is-hidden');
				win.removeAttribute('data-pdk-minimize-animation');
				clearWindowAnimationTarget(win);
				emitWindowStateChanged(win, 'minimized');
				scheduleSave();
			}, getWindowAnimationFallbackDuration('is-minimizing'));
		}

		return {
			cancelWindowAnimation,
			getDockAppButton,
			getWindowAnimationTarget,
			minimizeWindow,
			playWindowAnimation,
			removeMinimizedDockItem,
			revealWindow,
			setDockRunning,
			shouldAnimateOpeningApps,
			syncMinimizedDockItems
		};
	};
})();
