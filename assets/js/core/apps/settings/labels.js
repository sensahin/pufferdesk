(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

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
			colorLabel: 'Color',
			iconWidgetStyleLabel: 'Icon & widget style',
			iconWidgetStyleOptions: [
				{ value: 'default', label: 'Default' },
				{ value: 'dark', label: 'Dark' },
				{ value: 'clear', label: 'Clear' },
				{ value: 'tinted', label: 'Tinted' }
			],
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
		apps: {
			description: 'Choose where apps appear and which apps open when PufferDesk starts.',
			emptyLabel: 'No apps are available for this account.',
			fixedPlacementLabel: 'Fixed',
			openAtLoginLabel: 'Open at login',
			title: 'Apps'
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
		notifications: {
			description: 'Choose which WordPress and PufferDesk events appear in Notification Center.',
			headings: {
				behavior: 'Behavior',
				sources: 'Sources'
			},
			historyOptions: [
				{ value: '7', label: '7 days' },
				{ value: '30', label: '30 days' },
				{ value: '90', label: '90 days' }
			],
			rows: {
				enabled: 'Enable notifications',
				historyDays: 'Keep history',
				playSound: 'Play sound',
				quietMode: 'Quiet mode',
				quietModeDescription: 'Keep notifications in Notification Center without showing banners.',
				severity: 'Show',
				showBadges: 'Show notification badges',
				showToasts: 'Show notification banners'
			},
			severityOptions: [
				{ value: 'all', label: 'All notifications' },
				{ value: 'warnings', label: 'Warnings and critical alerts' },
				{ value: 'critical', label: 'Critical alerts only' }
			],
			sourceLabels: {
				apps: 'Apps and plugins',
				comments: 'Comments',
				pufferdesk: 'PufferDesk system',
				site_health: 'Site Health',
				wordpress_updates: 'WordPress updates'
			},
			title: 'Notifications'
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
				{ id: 'notifications', label: 'Notifications', icon: 'dashicons-bell', tone: 'blue' },
				{ id: 'sounds', label: 'Sound', icon: 'dashicons-format-audio', tone: 'green' },
				{ id: 'wallpaper', label: 'Wallpaper', icon: 'dashicons-format-image', tone: 'cyan' },
				{ id: 'widgets', label: 'Widgets', icon: 'dashicons-screenoptions', tone: 'green' },
				{ id: 'apps', label: 'Apps', icon: 'dashicons-grid-view', tone: 'purple' },
				{ id: 'workspace', label: 'Workspace', icon: 'dashicons-layout', tone: 'orange' },
				{ id: 'system', label: 'System', icon: 'dashicons-admin-tools', tone: 'red' }
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
			loginItemsSaveError: 'Login items could not be saved.',
			loginItemsSaved: 'Login items saved.',
			mediaUnavailable: 'Media Library is not available for this user.',
			menuBarSaveError: 'Menu Bar could not be saved.',
			notificationsSaveError: 'Notifications could not be saved.',
			notificationsSaved: 'Notifications saved.',
			photoRemoveError: 'Photo could not be removed.',
			photoRemoved: 'Photo removed.',
			removing: 'Removing...',
			saving: 'Saving...',
			soundsSaveError: 'Sound could not be saved.',
			soundsSaved: 'Sound saved.',
			themeSaveError: 'Theme could not be saved.',
			themeSaved: 'Theme saved.',
			themeSwitching: 'Switching theme...',
			wallpaperSaveError: 'Wallpaper could not be saved.',
			wallpaperSaved: 'Wallpaper saved.'
		},
		sounds: {
			description: 'Control system sound effects used by PufferDesk.',
			headings: {
				behavior: 'Behavior',
				output: 'Output'
			},
			ranges: {
				high: 'High',
				low: 'Low'
			},
			rows: {
				enabled: 'Enable system sounds',
				volume: 'Output volume'
			},
			status: {
				buttonLabel: 'Sound',
				mutedLabel: 'Sound muted',
				settings: 'Sound Settings',
				title: 'Sound',
				volumeValue: 'Volume %d%'
			},
			title: 'Sound'
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
		},
		widgets: {
			description: 'Choose which desktop widgets are visible.',
			emptyLabel: 'No widgets are registered for this account.',
			showOnDesktopLabel: 'Show on desktop',
			title: 'Widgets'
		},
		workspace: {
			cancelLabel: 'Cancel',
			resetAllButton: 'Reset Layouts for All Themes',
			resetAllConfirmLabel: 'Reset All',
			resetAllDescription: 'Clear saved workspace layouts across every theme for this WordPress account.',
			resetAllLabel: 'All theme layouts',
			resetAllMessage: 'This resets saved workspace layouts for every PufferDesk theme for this WordPress account.',
			resetAllTitle: 'Reset Layouts for All Themes?',
			resetCurrentButton: 'Reset Current Theme Layout',
			resetCurrentConfirmLabel: 'Reset',
			resetCurrentDescription: 'Reset windows, widgets, desktop icons, and launcher order for the active theme.',
			resetCurrentLabel: 'Current theme layout',
			resetCurrentMessage: 'This resets the saved windows, widgets, desktop icons, and launcher order for the current theme.',
			resetCurrentTitle: 'Reset Current Theme Layout?',
			resetError: 'Workspace layout could not be reset.',
			resettingLabel: 'Resetting...',
			title: 'Workspace'
		},
		system: {
			classicDescription: 'Leave the shell and open the standard WordPress admin.',
			classicLabel: 'Switch to Classic Admin...',
			eraseDescription: 'Reset PufferDesk preferences, wallpaper, apps, windows, widgets, and layout for this account.',
			eraseLabel: 'Erase All Content and Settings...',
			restartDescription: 'Reload PufferDesk and start a fresh shell session.',
			restartLabel: 'Restart PufferDesk...',
			title: 'System'
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
		if (window.PufferDesk.config && typeof window.PufferDesk.config.formatTemplate === 'function') {
			return window.PufferDesk.config.formatTemplate(template, values);
		}

		return String(template || '');
	}

	function getOptions(source, path) {
		const options = getPath(source, path, []);

		return Array.isArray(options) ? options.slice() : [];
	}

	window.PufferDesk.apps.settings.createLabels = function createLabels(settingsConfig = {}) {
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
