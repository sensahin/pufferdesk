(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowFactory = function createWindowFactory(callbacks = {}) {
		const defaultWindowChrome = {
			controls: {
				labels: {
					close: 'Close',
					maximize: 'Maximize',
					minimize: 'Minimize'
				},
				order: ['close', 'minimize', 'maximize'],
				placement: 'left',
				style: 'traffic'
			},
			title: {
				alignment: 'left',
				show_icon: true
			}
		};
		const controlDefinitions = {
			close: {
				action: 'pdkClose',
				modifier: 'close'
			},
			minimize: {
				action: 'pdkMinimize',
				modifier: 'minimize'
			},
			maximize: {
				action: 'pdkMaximize',
				modifier: 'maximize'
			}
		};

		function getRuntimeWindowChrome() {
			const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
				? window.PufferDesk.config.get()
				: {};

			if (config.windowChrome && typeof config.windowChrome === 'object') {
				return config.windowChrome;
			}

			return config.theme && config.theme.window_chrome && typeof config.theme.window_chrome === 'object'
				? config.theme.window_chrome
				: {};
		}

		function normalizeWindowChrome(chrome = {}) {
			const controls = chrome.controls && typeof chrome.controls === 'object' ? chrome.controls : {};
			const title = chrome.title && typeof chrome.title === 'object' ? chrome.title : {};
			const order = Array.isArray(controls.order)
				? controls.order.filter((control) => Object.prototype.hasOwnProperty.call(controlDefinitions, control))
				: defaultWindowChrome.controls.order;

			return {
				controls: {
					labels: Object.assign({}, defaultWindowChrome.controls.labels, controls.labels && typeof controls.labels === 'object' ? controls.labels : {}),
					order: order.length ? order : defaultWindowChrome.controls.order,
					placement: ['left', 'right'].includes(controls.placement) ? controls.placement : defaultWindowChrome.controls.placement,
					style: ['traffic', 'caption', 'toolbar', 'hidden'].includes(controls.style) ? controls.style : defaultWindowChrome.controls.style
				},
				title: {
					alignment: ['left', 'center', 'right'].includes(title.alignment) ? title.alignment : defaultWindowChrome.title.alignment,
					show_icon: Object.prototype.hasOwnProperty.call(title, 'show_icon') ? Boolean(title.show_icon) : defaultWindowChrome.title.show_icon
				}
			};
		}

		function createWindowControl(control, label, disabled = false) {
			const definition = controlDefinitions[control] || controlDefinitions.close;
			const button = document.createElement('button');
			const labelElement = document.createElement('span');

			button.type = 'button';
			button.className = `pdk-window-control pdk-window-control-${definition.modifier}`;
			button.dataset[definition.action] = '';
			button.setAttribute('aria-label', label);
			button.disabled = disabled;
			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}
			labelElement.className = 'pdk-window-control-label';
			labelElement.textContent = label;
			button.appendChild(labelElement);

			return button;
		}

		function bindWindowControl(button, control, titlebar, appId) {
			button.addEventListener('click', () => {
				const win = titlebar.closest('.pdk-window');
				if (control === 'close' && typeof callbacks.onClose === 'function') {
					callbacks.onClose(win, appId);
				}
				if (control === 'minimize' && typeof callbacks.onMinimize === 'function') {
					callbacks.onMinimize(win, appId);
				}
				if (control === 'maximize' && typeof callbacks.onMaximize === 'function') {
					callbacks.onMaximize(win, appId);
				}
			});
		}

		function createTitlebarLabel(options = {}, chrome) {
			if (!options.titlebarLabel) {
				return null;
			}

			const label = document.createElement('span');
			label.className = 'pdk-window-titlebar-label';
			if (chrome.title.show_icon && options.titlebarIcon && window.PufferDesk.dom && typeof window.PufferDesk.dom.createIcon === 'function') {
				const icon = document.createElement('span');
				icon.className = 'pdk-window-titlebar-label-icon';
				icon.appendChild(window.PufferDesk.dom.createIcon(options.titlebarIcon));
				label.appendChild(icon);
			}

			const text = document.createElement('span');
			text.className = 'pdk-window-titlebar-label-text';
			text.textContent = options.titlebarLabel;
			label.appendChild(text);

			return label;
		}

		function createTitlebar(appId, options = {}) {
			const chrome = normalizeWindowChrome(options.windowChrome || getRuntimeWindowChrome());
			const disabledControls = Array.isArray(options.disabledControls) ? options.disabledControls : [];
			const titlebar = document.createElement('div');
			titlebar.className = 'pdk-window-titlebar';
			titlebar.dataset.pdkDragHandle = '';
			titlebar.dataset.pdkWindowControlsPlacement = chrome.controls.placement;
			titlebar.dataset.pdkWindowControlsStyle = chrome.controls.style;
			titlebar.dataset.pdkWindowTitleAlignment = chrome.title.alignment;

			const controls = document.createElement('div');
			controls.className = 'pdk-window-controls';
			chrome.controls.order.forEach((control) => {
				const button = createWindowControl(control, chrome.controls.labels[control], disabledControls.includes(control));
				bindWindowControl(button, control, titlebar, appId);
				controls.appendChild(button);
			});

			const label = createTitlebarLabel(options, chrome);
			if (chrome.controls.placement === 'right') {
				if (label) {
					titlebar.appendChild(label);
				}
				titlebar.appendChild(controls);
			} else {
				titlebar.appendChild(controls);
				if (label) {
					titlebar.appendChild(label);
				}
			}

			return titlebar;
		}

		function createWindowElement(options, withIframeParam) {
			const chrome = normalizeWindowChrome(options.windowChrome || getRuntimeWindowChrome());
			const win = document.createElement('section');
			win.className = 'pdk-window pdk-app-window';
			win.dataset.pdkAppWindow = options.appId || '';
			win.dataset.pdkContext = 'window';
			win.dataset.pdkContextId = options.appId || options.windowKind || 'window';
			win.dataset.pdkContextLabel = options.title || '';
			win.dataset.pdkResizeMode = options.resizeMode || 'both';
			if (options.surfaceLayout) {
				win.dataset.pdkSurfaceLayout = options.surfaceLayout;
			}
			win.dataset.pdkWindowKind = options.windowKind || (options.appId ? 'app' : 'window');
			win.dataset.pdkWindowTitle = options.title || '';
			win.dataset.pdkWindowControlsPlacement = chrome.controls.placement;
			win.dataset.pdkWindowControlsStyle = chrome.controls.style;
			win.dataset.pdkWindowTitleAlignment = chrome.title.alignment;
			win.dataset.pdkWindowTitleIcon = chrome.title.show_icon ? '1' : '0';
			if (options.url) {
				win.dataset.pdkWindowUrl = options.url;
			}
			if (options.contextMenu === false) {
				win.dataset.pdkContextMenuDisabled = '1';
			}
			if (options.persist === false) {
				win.dataset.pdkPersist = '0';
			}
			if (options.menu && typeof options.menu === 'object') {
				win.pdkMenu = options.menu;
			}
			win.setAttribute('aria-label', `${options.title} window`);
			win.style.width = options.width || '860px';
			win.style.height = options.height || '620px';
			win.style.left = options.left || '180px';
			win.style.top = options.top || '42px';
			win.style.transform = 'none';

			win.appendChild(createTitlebar(options.appId, Object.assign({}, options, { windowChrome: chrome })));

			const body = document.createElement('div');
			body.className = options.bodyClass || 'pdk-window-body';

			if (options.url) {
				const iframe = document.createElement('iframe');
				iframe.className = 'pdk-app-frame';
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
