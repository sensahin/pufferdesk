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

Admin OS Mode wraps existing WordPress admin screens in a desktop-style shell. The current foundation focuses on one primary, release-safe Admin OS workspace: a top menu bar, desktop folders, a dock, app search, draggable windows, desktop widgets, and iframe-based admin apps.

== Current foundation features ==

- Top admin-bar switch between OS Mode and Classic Admin.
- Per-user mode preference.
- Dashboard entry redirects to OS Mode by default.
- Emergency one-request classic override: `/wp-admin/index.php?admin_os_classic=1`.
- Admin OS shell with menu bar, desktop folders, desktop widgets, dock, search, draggable windows, and iframe-based admin apps.
- Embedded admin apps hide the regular WordPress sidebar/top chrome so they behave more like OS windows.

== Notes ==

Admin OS Mode intentionally wraps existing WordPress admin screens instead of replacing them. That keeps plugin compatibility high and makes Classic Admin a reliable fallback.

The bundled Admin OS family uses original plugin CSS and release-safe media. Visual polish may use familiar desktop conventions, but the product identity, assets, and naming must remain Admin OS. Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled font files in this plugin. When third-party media is used, keep source and license details in `THIRD-PARTY-ASSETS.txt`.

The foundation separates shell behavior from OS appearance:

- `includes/` owns routing, preferences, app/widget/theme registries, widget layout attributes, assets, dashboard data, and rendering.
- `templates/` owns shell markup through semantic folders:
  - `templates/shell/` for global shell surfaces such as menu bar, desktop, and dock.
  - `templates/windows/` for reusable window chrome.
  - `templates/apps/` for native app content.
  - `templates/desktop/` for desktop icons and folder surfaces.
  - `templates/widgets/` for desktop widget surfaces.
  - `templates/controls/` reserved for reusable settings controls.
- `assets/css/core/` owns semantic core styles:
  - `admin-chrome.css` for WordPress admin chrome suppression.
  - `shell.css` for global shell variables, menu bar, and shared primitives.
  - `desktop.css` for desktop surfaces and desktop icons.
  - `widgets.css` for desktop widget layout and shared widget chrome.
  - `windows.css` for reusable window chrome.
  - `dock.css` for dock behavior and states.
  - `apps.css` for built-in app surfaces such as Welcome, folders, and OS Settings.
  - `responsive.css` for core viewport adaptations.
- `assets/js/core/` owns reusable shell behavior through purpose-specific modules:
  - `boot.js` wires the shell together.
  - `config.js` exposes the WordPress-provided runtime payload.
  - `dom.js` owns shared DOM helpers.
  - `services/` owns browser storage and AJAX clients.
  - `session/` owns per-user, per-theme workspace session sections.
  - `windows/` owns window creation, drag/focus behavior, and window state serialization.
  - `widgets/` owns widget binding, drag behavior, live updates, and widget layout persistence.
  - `apps/` owns app launching and native app content such as OS Settings.
  - `shell/` owns global shell controls such as search and clock behavior.
- `assets/css/themes/` owns theme-specific visual language.
- `assets/media/` reserves release-safe media locations:
  - `assets/media/themes/{family}/{version}/wallpapers/`
  - `assets/media/themes/{family}/{version}/icons/`
  - `assets/media/themes/{family}/{version}/cursors/`
  - `assets/media/shared/icons/`

Apps and folders use structured icon descriptors internally. Legacy Dashicon strings still work, but the normalized shape supports both current and future media-backed icons:

```php
'icon' => array(
	'type'  => 'dashicon',
	'value' => 'dashicons-admin-post',
);

'icon' => array(
	'type' => 'image',
	'src'  => 'themes/adminos/default/icons/posts.svg',
);

'icon' => array(
	'type'     => 'theme',
	'name'     => 'posts.svg',
	'fallback' => 'dashicons-admin-post',
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

Template resolution supports theme-specific overrides. The renderer checks paths in this order:

1. `templates/themes/{theme_id}/{template}`
2. `templates/themes/{family}/{template}`
3. `templates/{template}`

For example, a Windows family can override `templates/themes/windows/windows/titlebar.php` without replacing the whole shell.

Themes support family/version inheritance. A concrete theme can declare a parent theme and receives its stylesheet stack before its own styles are loaded:

```php
'adminos' => array(
	'id'            => 'adminos',
	'family'        => 'adminos',
	'version'       => 'default',
	'parent'        => 'adminos-base',
	'stylesheet'    => 'adminos/default.css',
	'version_label' => 'Default',
	'media'         => array(
		'wallpaper'   => 'themes/adminos/default/wallpapers/aurora-flow.jpg',
		'icon_pack'   => 'themes/adminos/default/icons',
		'cursor_pack' => 'themes/adminos/default/cursors',
	),
);
```

Theme media fields are normalized to local `assets/media/` descriptors with `path` and `url` values, then exposed in the runtime theme config. Keep OS media original or licensed for redistribution.

When a theme declares a wallpaper, the shell sets `--aos-wallpaper-image` from `theme.media.wallpaper.url`. If no wallpaper is declared, the desktop keeps the theme CSS fallback background. Theme icon descriptors resolve against `theme.media.icon_pack.url` and keep Dashicons as fallback when the icon file is missing.

Future phases can add optional alternate theme packs such as Redmond-style, classic desktop, Linux desktop, and other skins by registering a theme and adding a stylesheet, plus native custom app windows for posts, media, analytics, and WooCommerce. The bundled default should remain the Admin OS identity rather than depending on another platform owner’s brand assets.

Session layout is persisted in browser storage per user and per selected theme. Core stores layout in named sections, currently `windows` and `widgets`, so future desktop icons, spaces, or theme-specific surfaces can join without replacing the whole session payload. Windows track welcome/app windows, position, size, maximized/minimized state, and restore open app windows when the shell loads. Widgets track widget position, size, and hidden state.

Widgets are registered through `Admin_OS_Mode_Widget_Registry` and can be extended with the `admin_os_mode_widgets` filter. A widget declares an id, label, icon, capability, kind/native type, semantic template, default position, default size, and refresh interval. Default positions can use `left` or `right`, plus `top` or `bottom`, so widgets can anchor to either desktop edge before JavaScript persists their exact dragged position. The current foundation includes a native Clock widget; future weather, analytics, system monitor, or note widgets can use the same registry, templates, CSS layer, and session section.

== Changelog ==

= 0.1.0 =

- Initial local foundation.
