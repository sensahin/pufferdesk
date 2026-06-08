(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.windows = window.WPAdminOS.windows || {};

	window.WPAdminOS.windows.createWindowFactory = function createWindowFactory(callbacks = {}) {
		function createWindowControl(action, label, modifier, disabled = false) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `aos-window-control aos-window-control-${modifier}`;
			button.dataset[action] = '';
			button.setAttribute('aria-label', label);
			button.disabled = disabled;
			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}

			return button;
		}

		function createTitlebar(appId, options = {}) {
			const disabledControls = Array.isArray(options.disabledControls) ? options.disabledControls : [];
			const titlebar = document.createElement('div');
			titlebar.className = 'aos-window-titlebar';
			titlebar.dataset.aosDragHandle = '';

			const controls = document.createElement('div');
			controls.className = 'aos-window-controls';
			const close = createWindowControl('aosClose', 'Close', 'close', disabledControls.includes('close'));
			const minimize = createWindowControl('aosMinimize', 'Minimize', 'minimize', disabledControls.includes('minimize'));
			const maximize = createWindowControl('aosMaximize', 'Maximize', 'maximize', disabledControls.includes('maximize'));

			controls.appendChild(close);
			controls.appendChild(minimize);
			controls.appendChild(maximize);

			close.addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onClose === 'function') {
					callbacks.onClose(win, appId);
				}
			});

			minimize.addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onMinimize === 'function') {
					callbacks.onMinimize(win, appId);
				}
			});

			maximize.addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onMaximize === 'function') {
					callbacks.onMaximize(win, appId);
				}
			});

			titlebar.appendChild(controls);

			if (options.titlebarLabel) {
				const label = document.createElement('span');
				label.className = 'aos-window-titlebar-label';
				if (options.titlebarIcon && window.WPAdminOS.dom && typeof window.WPAdminOS.dom.createIcon === 'function') {
					const icon = document.createElement('span');
					icon.className = 'aos-window-titlebar-label-icon';
					icon.appendChild(window.WPAdminOS.dom.createIcon(options.titlebarIcon));
					label.appendChild(icon);
				}

				const text = document.createElement('span');
				text.className = 'aos-window-titlebar-label-text';
				text.textContent = options.titlebarLabel;
				label.appendChild(text);
				titlebar.appendChild(label);
			}

			return titlebar;
		}

		function createWindowElement(options, withIframeParam) {
			const win = document.createElement('section');
			win.className = 'aos-window aos-app-window';
			win.dataset.aosAppWindow = options.appId || '';
			win.dataset.aosContext = 'window';
			win.dataset.aosContextId = options.appId || options.windowKind || 'window';
			win.dataset.aosContextLabel = options.title || '';
			win.dataset.aosResizeMode = options.resizeMode || 'both';
			win.dataset.aosWindowKind = options.windowKind || (options.appId ? 'app' : 'window');
			win.dataset.aosWindowTitle = options.title || '';
			if (options.url) {
				win.dataset.aosWindowUrl = options.url;
			}
			if (options.contextMenu === false) {
				win.dataset.aosContextMenuDisabled = '1';
			}
			if (options.persist === false) {
				win.dataset.aosPersist = '0';
			}
			if (options.menu && typeof options.menu === 'object') {
				win.aosMenu = options.menu;
			}
			win.setAttribute('aria-label', `${options.title} window`);
			win.style.width = options.width || '860px';
			win.style.height = options.height || '620px';
			win.style.left = options.left || '180px';
			win.style.top = options.top || '42px';
			win.style.transform = 'none';

			win.appendChild(createTitlebar(options.appId, options));

			const body = document.createElement('div');
			body.className = options.bodyClass || 'aos-window-body';

			if (options.url) {
				const iframe = document.createElement('iframe');
				iframe.className = 'aos-app-frame';
				iframe.src = withIframeParam(options.url);
				iframe.title = options.title;
				body.appendChild(iframe);
			} else if (options.content) {
				body.appendChild(options.content);
			}

			win.appendChild(body);

			return win;
		}

		return {
			createTitlebar,
			createWindowElement
		};
	};
})();
