(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowState = function createWindowState(shell, options = {}) {
		const geometry = window.PufferDesk.geometry;
		const readNumber = geometry.readNumber;
		const desktop = options.desktop || shell.querySelector('.pdk-desktop');
		const layout = options.layout;
		const emitWindowStateChanged = typeof options.emitWindowStateChanged === 'function'
			? options.emitWindowStateChanged
			: () => null;
		const setZIndexFloor = typeof options.setZIndexFloor === 'function'
			? options.setZIndexFloor
			: () => null;

		function readWindowState(win) {
			const rect = layout.getRelativeRect(win);

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

		function applyWindowState(win, state, stateOptions = {}) {
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
				setZIndexFloor(state.zIndex);
			}

			layout.syncWindowSafeArea();
			win.classList.toggle('is-maximized', Boolean(state.maximized));
			win.classList.toggle('is-hidden', Boolean(state.hidden));
			win.classList.toggle('is-closed', Boolean(state.closed));
			layout.constrainWindow(win);
			if (stateOptions.emit !== false) {
				emitWindowStateChanged(win, 'stateApplied');
			}
		}

		function serializeWindows() {
			const windows = [];

			if (!desktop) {
				return windows;
			}

			desktop.querySelectorAll('.pdk-window').forEach((win) => {
				if (win.dataset.pdkPersist === '0') {
					return;
				}

				if (win.dataset.pdkWindowKind === 'folder') {
					const folderId = win.dataset.pdkFolderWindow;
					const tabState = typeof win.pdkSerializeFolderTabs === 'function'
						? win.pdkSerializeFolderTabs()
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

				const appId = win.dataset.pdkAppWindow;
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

		return {
			applyWindowState,
			readWindowState,
			serializeWindows
		};
	};
})();
