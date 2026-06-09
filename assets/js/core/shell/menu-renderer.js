(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.createMenuItemRenderer = function createMenuItemRenderer(commands) {
		const dom = window.PufferDesk.dom;

		function isIconDescriptor(icon) {
			return icon && typeof icon === 'object';
		}

		function hasIcon(item) {
			return Boolean(item && (typeof item.icon === 'string' ? item.icon : isIconDescriptor(item.icon)));
		}

		function hasSubmenu(item) {
			return Boolean(item && Array.isArray(item.items) && item.items.length);
		}

		function shouldRenderIcon(detail) {
			return !(detail && detail.type === 'dock-app');
		}

		function getItemDisabled(item, detail) {
			if (hasSubmenu(item)) {
				return Boolean(item.disabled);
			}

			return Boolean(item.disabled || (item.command && !commands.canExecute(item, detail)));
		}

		function getShortcutLabel(shortcut) {
			if (typeof shortcut === 'string') {
				return shortcut;
			}

			if (shortcut && typeof shortcut === 'object' && typeof shortcut.label === 'string') {
				return shortcut.label;
			}

			return '';
		}

		function createMenuItemIcon(item, detail = {}) {
			if (!shouldRenderIcon(detail) || !hasIcon(item)) {
				return null;
			}

			const icon = document.createElement('span');
			icon.className = 'pdk-menu-item-icon';
			icon.appendChild(dom.createIcon(item.icon));

			return icon;
		}

		function appendMenuItemContent(button, item, submenu = false, detail = {}) {
			const icon = createMenuItemIcon(item, detail);
			if (icon) {
				button.classList.add('has-icon');
				button.appendChild(icon);
			}

			const label = document.createElement('span');
			label.className = 'pdk-menu-item-label';
			label.textContent = item.label;
			button.appendChild(label);

			const shortcut = document.createElement('span');
			shortcut.className = 'pdk-menu-item-shortcut';
			shortcut.textContent = submenu ? '›' : getShortcutLabel(item.shortcut);
			button.appendChild(shortcut);
		}

		function createActionStrip(item, detail = {}, onExecute = null) {
			const strip = document.createElement('div');
			const stripItems = Array.isArray(item.items) ? item.items : [];

			strip.className = 'pdk-menu-action-strip';
			strip.dataset.aosMenuItem = item.id || 'action-strip';
			strip.setAttribute('role', 'group');
			if (item.label) {
				strip.setAttribute('aria-label', item.label);
			}

			stripItems.forEach((stripItem) => {
				const disabled = getItemDisabled(stripItem, detail);
				const button = document.createElement('button');
				const label = document.createElement('span');

				button.type = 'button';
				button.className = 'pdk-menu-action-strip-button';
				button.dataset.aosMenuItem = stripItem.id || stripItem.command || stripItem.label;
				button.setAttribute('role', 'menuitem');
				button.disabled = disabled;
				button.setAttribute('aria-label', stripItem.label);
				if (disabled) {
					button.setAttribute('aria-disabled', 'true');
				}

				if (shouldRenderIcon(detail) && hasIcon(stripItem)) {
					const icon = document.createElement('span');
					icon.className = 'pdk-menu-action-strip-icon';
					icon.appendChild(dom.createIcon(stripItem.icon));
					button.appendChild(icon);
				}

				label.className = 'pdk-menu-action-strip-label';
				label.textContent = stripItem.label;
				button.appendChild(label);

				if (stripItem.command && !disabled) {
					button.addEventListener('click', () => {
						commands.execute(stripItem, detail);
						if (typeof onExecute === 'function') {
							onExecute(stripItem, detail);
						}
					});
				}

				strip.appendChild(button);
			});

			return strip;
		}

		function createSubmenu(item, detail = {}, onExecute = null) {
			const wrapper = document.createElement('span');
			const button = document.createElement('button');
			const subPopover = document.createElement('span');
			let closeTimer = null;

			wrapper.className = 'pdk-menu-submenu';
			wrapper.dataset.aosMenuSubmenu = item.id || item.label;
			button.type = 'button';
			button.className = 'pdk-menu-item pdk-menu-submenu-trigger';
			button.dataset.aosMenuItem = item.id || item.label;
			button.setAttribute('role', 'menuitem');
			button.setAttribute('aria-haspopup', 'menu');
			button.setAttribute('aria-expanded', 'false');
			appendMenuItemContent(button, item, true, detail);

			subPopover.className = 'pdk-menu-submenu-popover';
			subPopover.setAttribute('role', 'menu');
			subPopover.setAttribute('aria-label', item.label);
			subPopover.replaceChildren(...item.items.map((child) => createItem(child, detail, onExecute)));

			const open = () => {
				window.clearTimeout(closeTimer);
				wrapper.classList.add('is-open');
				button.setAttribute('aria-expanded', 'true');
			};
			const close = () => {
				window.clearTimeout(closeTimer);
				closeTimer = window.setTimeout(() => {
					wrapper.classList.remove('is-open');
					button.setAttribute('aria-expanded', 'false');
				}, 80);
			};

			wrapper.addEventListener('pointerenter', open);
			wrapper.addEventListener('pointerleave', close);
			wrapper.addEventListener('focusin', open);
			wrapper.addEventListener('focusout', (event) => {
				if (!wrapper.contains(event.relatedTarget)) {
					close();
				}
			});
			button.addEventListener('click', (event) => {
				event.stopPropagation();
				if (wrapper.classList.contains('is-open')) {
					wrapper.classList.remove('is-open');
					button.setAttribute('aria-expanded', 'false');
				} else {
					open();
				}
			});
			button.addEventListener('keydown', (event) => {
				if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open();
					const firstEnabled = subPopover.querySelector('.pdk-menu-item:not(:disabled)');
					if (firstEnabled) {
						firstEnabled.focus();
					}
				} else if (event.key === 'Escape' || event.key === 'ArrowLeft') {
					event.preventDefault();
					wrapper.classList.remove('is-open');
					button.setAttribute('aria-expanded', 'false');
					button.focus();
				}
			});

			wrapper.append(button, subPopover);

			return wrapper;
		}

		function createItem(item, detail = {}, onExecute = null) {
			if (item.type === 'separator') {
				const separator = document.createElement('span');
				separator.className = 'pdk-menu-separator';
				separator.setAttribute('role', 'separator');
				return separator;
			}

			if (item.type === 'action-strip') {
				return createActionStrip(item, detail, onExecute);
			}

			if (hasSubmenu(item) && !item.disabled) {
				return createSubmenu(item, detail, onExecute);
			}

			const disabled = getItemDisabled(item, detail);
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'pdk-menu-item';
			button.dataset.aosMenuItem = item.id || item.command || item.label;
			button.setAttribute('role', 'menuitem');
			button.disabled = disabled;

			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}

			appendMenuItemContent(button, item, false, detail);

			if (item.command && !disabled) {
				button.addEventListener('click', () => {
					commands.execute(item, detail);
					if (typeof onExecute === 'function') {
						onExecute(item, detail);
					}
				});
			}

			return button;
		}

		return {
			createItem,
			getItemDisabled
		};
	};
})();
