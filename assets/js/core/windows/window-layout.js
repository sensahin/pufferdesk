(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowLayout = function createWindowLayout(shell, options = {}) {
		const geometry = window.PufferDesk.geometry;
		const clamp = geometry.clamp;
		const readNumber = geometry.readNumber;
		const desktop = options.desktop || shell.querySelector('.pdk-desktop');
		const dock = options.dock || shell.querySelector('.pdk-dock');
		const menuBar = options.menuBar || shell.querySelector('.pdk-menu-bar');
		const isVisibleWindow = typeof options.isVisibleWindow === 'function'
			? options.isVisibleWindow
			: (win) => Boolean(win && !win.classList.contains('is-hidden') && !win.classList.contains('is-closed'));
		let windowOffset = 0;

		function getCssPixelValue(name, fallback) {
			return geometry.readCssPixel(shell, name, fallback);
		}

		function getMenuBarHeight() {
			if (!menuBar) {
				return 0;
			}

			if (shell.dataset.pdkMenuBarHidden === '1') {
				return 0;
			}

			return Math.ceil(menuBar.getBoundingClientRect().height);
		}

		function getWindowSafeEdge() {
			return getCssPixelValue('--pdk-window-safe-edge', 10);
		}

		function getWindowSafeTop() {
			return getMenuBarHeight() + getWindowSafeEdge();
		}

		function getWindowSafeBottom() {
			const edge = getWindowSafeEdge();

			if (!dock || shell.dataset.pdkDockAutoHide === '1') {
				return edge;
			}

			if (shell.dataset.pdkShellLauncher === 'taskbar') {
				return Math.max(edge, Math.ceil(dock.getBoundingClientRect().height));
			}

			return edge;
		}

		function syncWindowSafeArea() {
			const edge = getWindowSafeEdge();
			const top = getWindowSafeTop();
			const bottom = getWindowSafeBottom();

			shell.style.setProperty('--pdk-window-maximized-edge', `${edge}px`);
			shell.style.setProperty('--pdk-window-maximized-top', `${top}px`);
			shell.style.setProperty('--pdk-window-maximized-height', `calc(100% - ${top + bottom}px)`);

			return {
				bottom,
				edge,
				top
			};
		}

		function getWindowBounds(win) {
			const safeArea = syncWindowSafeArea();
			const maxLeft = Math.max(0, desktop.clientWidth - win.offsetWidth);
			const maxTop = Math.max(safeArea.top, desktop.clientHeight - safeArea.bottom - 64);

			return {
				maxLeft,
				maxTop,
				minLeft: 0,
				minTop: safeArea.top
			};
		}

		function getResizeMinSize(win) {
			const styles = window.getComputedStyle(win);

			return {
				width: readNumber(styles.minWidth) ?? 320,
				height: readNumber(styles.minHeight) ?? 260
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
			const nextLeft = clamp(currentLeft, bounds.minLeft, bounds.maxLeft);
			const nextTop = clamp(currentTop, bounds.minTop, bounds.maxTop);
			const maxHeight = Math.max(0, desktop.clientHeight - syncWindowSafeArea().bottom - nextTop);

			win.style.transform = 'none';
			win.style.left = `${nextLeft}px`;
			win.style.top = `${nextTop}px`;

			if (maxHeight > 0 && win.offsetHeight > maxHeight) {
				const minSize = getResizeMinSize(win);
				const height = Math.max(Math.min(minSize.height, maxHeight), Math.min(win.offsetHeight, maxHeight));
				win.style.height = `${Math.round(height)}px`;
			}
		}

		function constrainVisibleWindows() {
			if (!desktop) {
				return;
			}

			syncWindowSafeArea();
			shell.querySelectorAll('.pdk-window').forEach((win) => constrainWindow(win));
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

		function getDefaultPosition() {
			const safeArea = syncWindowSafeArea();
			const bounds = {
				maxLeft: Math.max(0, desktop.clientWidth - 420),
				maxTop: Math.max(safeArea.top, desktop.clientHeight - safeArea.bottom - 360),
				minLeft: 0,
				minTop: safeArea.top
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
			const safeArea = syncWindowSafeArea();
			const width = readNumber(windowOptions.width) ?? 360;
			const height = readNumber(windowOptions.height) ?? 260;
			const workHeight = Math.max(0, desktop.clientHeight - safeArea.top - safeArea.bottom);
			const bounds = {
				maxLeft: Math.max(0, desktop.clientWidth - width),
				maxTop: Math.max(safeArea.top, desktop.clientHeight - safeArea.bottom - height),
				minLeft: 0,
				minTop: safeArea.top
			};
			const left = clamp(Math.round((desktop.clientWidth - width) / 2), bounds.minLeft, bounds.maxLeft);
			const top = clamp(safeArea.top + Math.round((workHeight - height) / 2), bounds.minTop, bounds.maxTop);

			return {
				left: `${left}px`,
				top: `${top}px`
			};
		}

		return {
			constrainVisibleWindows,
			constrainWindow,
			getCenteredPosition,
			getDefaultPosition,
			getRelativeRect,
			getResizeMinSize,
			getWindowBounds,
			syncWindowSafeArea
		};
	};
})();
