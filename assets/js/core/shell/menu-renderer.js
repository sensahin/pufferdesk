(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.createMenuItemRenderer = function createMenuItemRenderer(commands) {
		const dom = window.AdminOSMode.dom;

		function isIconDescriptor(icon) {
			return icon && typeof icon === 'object';
		}

		function hasIcon(item) {
			return Boolean(item && (typeof item.icon === 'string' ? item.icon : isIconDescriptor(item.icon)));
		}

		function getItemDisabled(item, detail) {
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

		function createItem(item, detail = {}, onExecute = null) {
			if (item.type === 'separator') {
				const separator = document.createElement('span');
				separator.className = 'aos-menu-separator';
				separator.setAttribute('role', 'separator');
				return separator;
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
			shortcut.textContent = getShortcutLabel(item.shortcut);
			button.appendChild(shortcut);

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
