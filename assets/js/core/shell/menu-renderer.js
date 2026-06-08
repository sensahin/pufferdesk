(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.shell = window.WPAdminOS.shell || {};

	window.WPAdminOS.shell.createMenuItemRenderer = function createMenuItemRenderer(commands) {
		const dom = window.WPAdminOS.dom;

		function isIconDescriptor(icon) {
			return icon && typeof icon === 'object';
		}

		function hasIcon(item) {
			return Boolean(item && (typeof item.icon === 'string' ? item.icon : isIconDescriptor(item.icon)));
		}

		function hasSubmenu(item) {
			return Boolean(item && Array.isArray(item.items) && item.items.length);
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

		function createMenuItemIcon(item) {
			if (!hasIcon(item)) {
				return null;
			}

			const icon = document.createElement('span');
			icon.className = 'aos-menu-item-icon';
			icon.appendChild(dom.createIcon(item.icon));

			return icon;
		}

		function appendMenuItemContent(button, item, submenu = false) {
			const icon = createMenuItemIcon(item);
			if (icon) {
				button.classList.add('has-icon');
				button.appendChild(icon);
			}

			const label = document.createElement('span');
			label.className = 'aos-menu-item-label';
			label.textContent = item.label;
			button.appendChild(label);

			const shortcut = document.createElement('span');
			shortcut.className = 'aos-menu-item-shortcut';
			shortcut.textContent = submenu ? '›' : getShortcutLabel(item.shortcut);
			button.appendChild(shortcut);
		}

		function createSubmenu(item, detail = {}, onExecute = null) {
			const wrapper = document.createElement('span');
			const button = document.createElement('button');
			const subPopover = document.createElement('span');
			let closeTimer = null;

			wrapper.className = 'aos-menu-submenu';
			wrapper.dataset.aosMenuSubmenu = item.id || item.label;
			button.type = 'button';
			button.className = 'aos-menu-item aos-menu-submenu-trigger';
			button.dataset.aosMenuItem = item.id || item.label;
			button.setAttribute('role', 'menuitem');
			button.setAttribute('aria-haspopup', 'menu');
			button.setAttribute('aria-expanded', 'false');
			appendMenuItemContent(button, item, true);

			subPopover.className = 'aos-menu-submenu-popover';
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
					const firstEnabled = subPopover.querySelector('.aos-menu-item:not(:disabled)');
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
				separator.className = 'aos-menu-separator';
				separator.setAttribute('role', 'separator');
				return separator;
			}

			if (hasSubmenu(item) && !item.disabled) {
				return createSubmenu(item, detail, onExecute);
			}

			const disabled = getItemDisabled(item, detail);
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'aos-menu-item';
			button.dataset.aosMenuItem = item.id || item.command || item.label;
			button.setAttribute('role', 'menuitem');
			button.disabled = disabled;

			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}

			appendMenuItemContent(button, item);

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
