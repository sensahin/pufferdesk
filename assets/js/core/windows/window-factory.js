(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.windows = window.AdminOSMode.windows || {};

	window.AdminOSMode.windows.createWindowFactory = function createWindowFactory(callbacks = {}) {
		function createWindowControl(action, label, modifier) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `aos-window-control aos-window-control-${modifier}`;
			button.dataset[action] = '';
			button.setAttribute('aria-label', label);
			button.title = label;

			return button;
		}

		function createTitlebar(appId) {
			const titlebar = document.createElement('div');
			titlebar.className = 'aos-window-titlebar';
			titlebar.dataset.aosDragHandle = '';

			const controls = document.createElement('div');
			controls.className = 'aos-window-controls';
			controls.appendChild(createWindowControl('aosClose', 'Close', 'close'));
			controls.appendChild(createWindowControl('aosMinimize', 'Minimize', 'minimize'));
			controls.appendChild(createWindowControl('aosMaximize', 'Maximize', 'maximize'));

			controls.querySelector('[data-aos-close]').addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onClose === 'function') {
					callbacks.onClose(win, appId);
				}
			});

			controls.querySelector('[data-aos-minimize]').addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onMinimize === 'function') {
					callbacks.onMinimize(win, appId);
				}
			});

			controls.querySelector('[data-aos-maximize]').addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onMaximize === 'function') {
					callbacks.onMaximize(win, appId);
				}
			});

			titlebar.appendChild(controls);

			return titlebar;
		}

		function createWindowElement(options, withIframeParam) {
			const win = document.createElement('section');
			win.className = 'aos-window aos-app-window';
			win.dataset.aosAppWindow = options.appId || '';
			win.setAttribute('aria-label', `${options.title} window`);
			win.style.width = options.width || '860px';
			win.style.height = options.height || '620px';
			win.style.left = options.left || '180px';
			win.style.top = options.top || '42px';
			win.style.transform = 'none';

			win.appendChild(createTitlebar(options.appId));

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
