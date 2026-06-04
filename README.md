=== Admin OS Mode ===
Contributors: senolsahin
Tags: admin, dashboard, desktop, workspace
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Admin OS Mode turns the WordPress dashboard entry point into a desktop-style admin workspace.

== Description ==

Admin OS Mode wraps existing WordPress admin screens in a desktop-style shell. The current foundation focuses on a safe Modern OS workspace: a top menu bar, desktop folders, a dock, app search, draggable windows, and iframe-based admin apps.

== Current foundation features ==

- Top admin-bar switch between OS Mode and Classic Admin.
- Per-user mode preference.
- Dashboard entry redirects to OS Mode by default.
- Emergency one-request classic override: `/wp-admin/index.php?admin_os_classic=1`.
- Modern OS shell with menu bar, desktop folders, dock, search, draggable windows, and iframe-based admin apps.
- Embedded admin apps hide the regular WordPress sidebar/top chrome so they behave more like OS windows.

== Notes ==

Admin OS Mode intentionally wraps existing WordPress admin screens instead of replacing them. That keeps plugin compatibility high and makes Classic Admin a reliable fallback.

The foundation separates shell behavior from OS appearance:

- `includes/` owns routing, preferences, app/theme registries, assets, dashboard data, and rendering.
- `templates/` owns shell markup through semantic folders:
  - `templates/shell/` for global shell surfaces such as menu bar, desktop, and dock.
  - `templates/windows/` for reusable window chrome.
  - `templates/apps/` for native app content.
  - `templates/desktop/` for desktop icons and folder surfaces.
  - `templates/controls/` reserved for reusable settings controls.
- `assets/css/core/` owns semantic core styles:
  - `admin-chrome.css` for WordPress admin chrome suppression.
  - `shell.css` for global shell variables, menu bar, and shared primitives.
  - `desktop.css` for desktop surfaces and desktop icons.
  - `windows.css` for reusable window chrome.
  - `dock.css` for dock behavior and states.
  - `apps.css` for built-in app surfaces such as Welcome, folders, and OS Settings.
  - `responsive.css` for core viewport adaptations.
- `assets/js/core/` owns reusable shell behavior through purpose-specific modules:
  - `boot.js` wires the shell together.
  - `config.js` exposes the WordPress-provided runtime payload.
  - `dom.js` owns shared DOM helpers.
  - `services/` owns browser storage and AJAX clients.
  - `windows/` owns window creation, drag/focus behavior, and session persistence.
  - `apps/` owns app launching and native app content such as OS Settings.
  - `shell/` owns global shell controls such as search and clock behavior.
- `assets/css/themes/` owns OS-specific visual language.
- `assets/media/` reserves release-safe media locations:
  - `assets/media/themes/{family}/{version}/wallpapers/`
  - `assets/media/themes/{family}/{version}/icons/`
  - `assets/media/shared/icons/`

Apps and folders use structured icon descriptors internally. Legacy Dashicon strings still work, but the normalized shape supports both current and future media-backed icons:

```php
'icon' => array(
	'type'  => 'dashicon',
	'value' => 'dashicons-admin-post',
);

'icon' => array(
	'type' => 'image',
	'src'  => 'themes/modern/current/icons/posts.svg',
);
```

== Build and release assets ==

Readable source assets stay in `assets/css/core/`, `assets/css/themes/`, and `assets/js/core/`.
Release assets are generated into `assets/dist/`:

- `assets/dist/css/admin-os-mode-core.min.css`
- `assets/dist/css/themes/{family}/{version}.min.css`
- `assets/dist/js/admin-os-mode.min.js`
- `assets/dist/SOURCES.md`

WordPress uses source assets when `SCRIPT_DEBUG` is enabled or when dist files are missing. Otherwise it uses the minified release assets for fewer requests.

```bash
npm install
npm run build
npm run check
npm run package
```

Template resolution supports OS-specific overrides. The renderer checks paths in this order:

1. `templates/themes/{theme_id}/{template}`
2. `templates/themes/{family}/{template}`
3. `templates/{template}`

For example, a Windows family can override `templates/themes/windows/windows/titlebar.php` without replacing the whole shell.

Themes support family/version inheritance. A concrete theme can declare a parent theme and receives its stylesheet stack before its own styles are loaded:

```php
'macos-tahoe' => array(
	'id'            => 'macos-tahoe',
	'family'        => 'macos',
	'version'       => 'tahoe',
	'parent'        => 'macos-base',
	'stylesheet'    => 'macos/tahoe.css',
	'version_label' => 'Tahoe',
);
```

Future phases can add theme packs such as Modern OS, Windows-style, and Win98-style skins by registering a theme and adding a stylesheet, plus native custom app windows for posts, media, analytics, and WooCommerce.

Window/session layout is persisted in browser storage per user and per selected theme. Core tracks welcome/app windows, position, size, maximized/minimized state, and restores open app windows when the shell loads.

== Changelog ==

= 0.1.0 =

- Initial local foundation.
