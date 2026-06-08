(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	const defaults = {
		appearance: {
			accentOptions: [
				{ value: 'multicolor', label: 'Multicolor' },
				{ value: 'blue', label: 'Blue' },
				{ value: 'purple', label: 'Purple' },
				{ value: 'pink', label: 'Pink' },
				{ value: 'red', label: 'Red' },
				{ value: 'orange', label: 'Orange' },
				{ value: 'yellow', label: 'Yellow' },
				{ value: 'green', label: 'Green' },
				{ value: 'graphite', label: 'Graphite' }
			],
			appearanceLabel: 'Appearance',
			applyThemeLabel: 'Apply Theme',
			colorLabel: 'Color',
			iconWidgetStyleLabel: 'Icon & widget style',
			iconWidgetStyleOptions: [
				{ value: 'default', label: 'Default' },
				{ value: 'dark', label: 'Dark' },
				{ value: 'clear', label: 'Clear' },
				{ value: 'tinted', label: 'Tinted' }
			],
			installedThemeHeading: 'Installed Theme',
			materialDescription: 'Choose your preferred Liquid Glass look.',
			materialLabel: 'Liquid Glass',
			materialOptions: [
				{ value: 'clear', label: 'Clear' },
				{ value: 'tinted', label: 'Tinted' }
			],
			modeOptions: [
				{ value: 'auto', label: 'Auto' },
				{ value: 'light', label: 'Light' },
				{ value: 'dark', label: 'Dark' }
			],
			themeFallbackLabel: 'Theme',
			themeHeading: 'Theme',
			themeLabel: 'Theme',
			title: 'Appearance'
		},
		desktopDock: {
			appLocationOptions: [
				{ value: 'dock', label: 'Dock' },
				{ value: 'desktop', label: 'Desktop' },
				{ value: 'both', label: 'Dock & Desktop' },
				{ value: 'hidden', label: 'Hidden' }
			],
			headings: {
				apps: 'Apps',
				desktop: 'Desktop',
				dock: 'Dock',
				widgets: 'Widgets'
			},
			ranges: {
				large: 'Large',
				off: 'Off',
				small: 'Small'
			},
			rows: {
				animateOpeningApps: 'Animate opening applications',
				autoHideDock: 'Automatically hide and show the Dock',
				dimWidgets: 'Dim widgets on desktop',
				dockMagnification: 'Magnification',
				dockPosition: 'Dock position on screen',
				dockSize: 'Size',
				minimizeAnimation: 'Minimized window animation',
				minimizeIntoAppIcon: 'Minimize windows into application icon',
				showOpenIndicators: 'Show indicators for open applications',
				showWidgetsDesktop: 'Show widgets on desktop',
				wallpaperClick: 'Click wallpaper to show desktop',
				wallpaperClickDescription: 'Click wallpaper to move windows out of the way, revealing your desktop items and widgets.'
			},
			selectOptions: {
				dim_widgets: [
					{ value: 'automatic', label: 'Automatically' },
					{ value: 'always', label: 'Always' },
					{ value: 'never', label: 'Never' }
				],
				dock_position: [
					{ value: 'left', label: 'Left' },
					{ value: 'bottom', label: 'Bottom' },
					{ value: 'right', label: 'Right' }
				],
				minimize_animation: [
					{ value: 'genie', label: 'Genie Effect' },
					{ value: 'scale', label: 'Scale Effect' }
				],
				wallpaper_click: [
					{ value: 'always', label: 'Always' },
					{ value: 'never', label: 'Never' }
				]
			}
		},
		generalPanel: {
			aboutTitle: 'About',
			addressLabel: 'Address',
			description: 'Manage site information, updates, language, privacy, and WordPress tools.',
			diagnosticsDescription: 'WordPress diagnostics and environment report',
			diagnosticsHeading: 'Diagnostics',
			diagnosticsTitle: 'Site Health',
			displaysHeading: 'Displays',
			fallbackWindowTitle: 'WordPress',
			moreInfoLabel: 'More Info...',
			moreInfoTitle: 'Site Health Info',
			nameLabel: 'Name',
			siteFallbackTitle: 'WordPress Site',
			title: 'General',
			wordpressHeading: 'WordPress'
		},
		history: {
			back: 'Back',
			forward: 'Forward'
		},
		menuBar: {
			rows: {
				autoHide: 'Automatically hide and show the menu bar',
				recentCount: 'Recent documents, applications, and servers',
				showBackground: 'Show menu bar background'
			},
			selectOptions: {
				auto_hide: [
					{ value: 'always', label: 'Always' },
					{ value: 'desktop', label: 'On Desktop Only' },
					{ value: 'fullscreen', label: 'In Full Screen Only' },
					{ value: 'never', label: 'Never' }
				],
				recent_count: [
					{ value: '0', label: 'None' },
					{ value: '5', label: '5' },
					{ value: '10', label: '10' },
					{ value: '15', label: '15' },
					{ value: '20', label: '20' },
					{ value: '30', label: '30' },
					{ value: '50', label: '50' }
				]
			}
		},
		profile: {
			defaultName: 'Admin',
			defaultRole: 'WordPress User',
			editLabel: 'Edit',
			editProfileLabel: 'Edit profile',
			personalInfoDescription: 'Name, contact, website, and bio',
			personalInfoLabel: 'Personal Information',
			profileTitle: 'WordPress Profile',
			rolePermissionsDescription: 'Current access level',
			rolePermissionsLabel: 'Role & Permissions',
			sectionLabel: 'WordPress Account',
			signOutLabel: 'Sign Out...'
		},
		sidebar: {
			items: [
				{ id: 'general', label: 'General', icon: 'dashicons-admin-generic', tone: 'gray' },
				{ id: 'appearance', label: 'Appearance', icon: 'dashicons-admin-appearance', tone: 'blue' },
				{ id: 'desktop-dock', label: 'Desktop & Dock', icon: 'dashicons-desktop', tone: 'indigo' },
				{ id: 'menu-bar', label: 'Menu Bar', icon: 'dashicons-menu-alt3', tone: 'gray' },
				{ id: 'wallpaper', label: 'Wallpaper', icon: 'dashicons-format-image', tone: 'cyan' },
				{ id: 'widgets', label: 'Widgets', icon: 'dashicons-screenoptions', tone: 'green', disabled: true },
				{ id: 'apps', label: 'Apps', icon: 'dashicons-grid-view', tone: 'purple', disabled: true },
				{ id: 'workspace', label: 'Workspace', icon: 'dashicons-layout', tone: 'orange', disabled: true },
				{ id: 'system', label: 'System', icon: 'dashicons-admin-tools', tone: 'red', disabled: true }
			],
			navLabel: 'Settings sections',
			searchLabel: 'Search settings',
			searchPlaceholder: 'Search'
		},
		status: {
			appLocationsSaveError: 'App locations could not be saved.',
			appLocationsSaved: 'App locations saved.',
			appearanceSaveError: 'Appearance could not be saved.',
			appearanceSaved: 'Appearance saved.',
			desktopDockSaveError: 'Desktop & Dock could not be saved.',
			invalidImage: 'Choose a valid image.',
			mediaUnavailable: 'Media Library is not available for this user.',
			menuBarSaveError: 'Menu Bar could not be saved.',
			photoRemoveError: 'Photo could not be removed.',
			photoRemoved: 'Photo removed.',
			removing: 'Removing...',
			saving: 'Saving...',
			themeSaveError: 'Theme could not be saved.',
			themeSaved: 'Theme saved.',
			wallpaperSaveError: 'Wallpaper could not be saved.',
			wallpaperSaved: 'Wallpaper saved.'
		},
		wallpaper: {
			addPhotoLabel: 'Add Photo...',
			chooseWallpaperTitle: 'Choose Wallpaper',
			colorsHeading: 'Colors',
			customWallpaperLabel: 'Custom Wallpaper',
			removePhotoLabel: 'Remove photo',
			selectedPhotoLabel: 'Selected Photo',
			showAllLabel: 'Show All (%d)',
			showLessLabel: 'Show Less',
			useAsWallpaperLabel: 'Use as Wallpaper',
			wallpapersHeading: 'Wallpapers',
			yourPhotosHeading: 'Your Photos'
		}
	};

	function isPlainObject(value) {
		return value && typeof value === 'object' && !Array.isArray(value);
	}

	function mergeDeep(base, override) {
		const merged = Array.isArray(base) ? base.slice() : Object.assign({}, base || {});

		if (!isPlainObject(override)) {
			return merged;
		}

		Object.keys(override).forEach((key) => {
			const value = override[key];
			if (Array.isArray(value)) {
				merged[key] = value.slice();
			} else if (isPlainObject(value)) {
				merged[key] = mergeDeep(isPlainObject(merged[key]) ? merged[key] : {}, value);
			} else if (value !== undefined && value !== null) {
				merged[key] = value;
			}
		});

		return merged;
	}

	function getPath(source, path, fallback) {
		if (!path) {
			return source;
		}

		const value = String(path).split('.').reduce((current, key) => (
			current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
		), source);

		return value === undefined || value === null ? fallback : value;
	}

	function format(template, values = []) {
		let index = 0;

		return String(template || '').replace(/%d|%s/g, () => String(values[index++] ?? ''));
	}

	function getOptions(source, path) {
		const options = getPath(source, path, []);

		return Array.isArray(options) ? options.slice() : [];
	}

	window.WPAdminOS.apps.settings.createLabels = function createLabels(settingsConfig = {}) {
		const runtimeLabels = settingsConfig.labels && isPlainObject(settingsConfig.labels)
			? settingsConfig.labels
			: {};
		const labels = mergeDeep(defaults, runtimeLabels);

		return {
			all: labels,
			format(template, values) {
				return format(template, values);
			},
			get(path, fallback = '') {
				return getPath(labels, path, fallback);
			},
			getOptions(path) {
				return getOptions(labels, path);
			}
		};
	};
})();
