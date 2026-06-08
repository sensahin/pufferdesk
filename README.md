=== WP adminOS ===
Contributors: senols
Tags: desktop, admin, ui, productivity, ai
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WP adminOS turns the WordPress dashboard entry point into a desktop-style admin workspace.

== Description ==

WP adminOS wraps existing WordPress admin screens in a desktop-style shell. The current foundation focuses on one primary, release-safe WP adminOS experience: a top menu bar, generated and user-created desktop folders, a dock, app search, draggable windows, desktop widgets, and iframe-based admin apps.

== Current foundation features ==

- Top admin-bar switch between WP adminOS and Classic Admin.
- Per-user mode preference.
- Dashboard entry redirects to WP adminOS by default.
- Emergency one-request classic override: `/wp-admin/index.php?wp_adminos_classic=1`.
- WP adminOS shell with system menu, site title menu, app menu bar, right-click context menus, generated and user-created desktop folders, desktop widgets, dock, search, draggable windows, and iframe-based admin apps.
- Embedded admin apps hide the regular WordPress sidebar/top chrome so they behave more like OS windows.

== Notes ==

WP adminOS intentionally wraps existing WordPress admin screens instead of replacing them. That keeps plugin compatibility high and makes Classic Admin a reliable fallback.

The bundled WP adminOS family uses original plugin CSS and release-safe media. Visual polish may use familiar desktop conventions, but the product identity, assets, and naming must remain WP adminOS. Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled font files in this plugin. When third-party media is used, keep source and license details in `THIRD-PARTY-ASSETS.txt`.

The foundation separates shell behavior from OS appearance:

- `includes/` owns routing, preferences, app/widget/theme registries, widget layout attributes, assets, and rendering.
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
  - `context-menu.css` for right-click menu positioning on top of shared menu primitives.
  - `desktop.css` for desktop surfaces and desktop icons.
  - `widgets.css` for desktop widget layout and shared widget chrome.
  - `windows.css` for reusable window chrome.
  - `dock.css` for dock behavior and states.
  - `apps.css` for built-in app surfaces such as folders and System Settings.
  - `responsive.css` for core viewport adaptations.
- `assets/js/core/` owns reusable shell behavior through purpose-specific modules:
  - `boot.js` wires the shell together.
  - `config.js` exposes the WordPress-provided runtime payload.
  - `dom.js` owns shared DOM helpers.
  - `services/` owns browser storage and AJAX clients.
  - `session/` owns per-user, per-theme workspace session sections, with WordPress user meta as durable state and browser storage as cache/fallback.
  - `windows/` owns window creation, drag/focus behavior, and window state serialization.
  - `widgets/` owns widget binding, drag behavior, live updates, and widget layout persistence.
  - `desktop/` owns desktop icon layout plus user-created folder rendering and membership behavior.
  - `apps/` owns app launching, native app renderer registration, and native app content such as System Settings.
  - `apps/settings/` owns System Settings label normalization, shared panel UI helpers, and panel factory modules.
  - `shell/` owns global shell controls such as search, clock behavior, menu commands, top menus, and context menus.
- `assets/css/themes/` owns theme-specific visual language.
- `assets/media/` reserves release-safe media locations:
  - `assets/media/themes/{family}/{version}/wallpapers/`
  - `assets/media/themes/{family}/{version}/icons/`
  - `assets/media/themes/{family}/{version}/cursors/`
  - `assets/media/shared/icons/`

Apps and folders use structured icon descriptors internally. Dashicon strings still work as shorthand, but the normalized shape supports both current and future media-backed icons:

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

Apps are registered through `WP_AdminOS_App_Registry` or the `wp_adminos_apps` filter. Iframe apps provide a `url`; native apps provide `kind => native` and a stable `native` renderer ID. JavaScript native app windows are registered with `window.WPAdminOS.apps.registerNativeAppRenderer( nativeId, renderer )`, and the renderer returns reusable window options such as `content`, `bodyClass`, `width`, `height`, and `resizeMode`. The app launcher stays generic and does not special-case individual native apps.

System Settings uses PHP-provided `settings.labels` runtime data for user-facing panel labels, option lists, and status messages. The browser-side `assets/js/core/apps/settings/labels.js` module merges that translated runtime data with local fallbacks before the panel factories render.

== Build and release assets ==

Readable source assets stay in `assets/css/core/`, `assets/css/themes/`, and `assets/js/core/`.
Release assets are generated into `assets/dist/`:

- `assets/dist/css/wp-adminos-core.min.css`
- `assets/dist/css/themes/{family}/{version}.min.css`
- `assets/dist/js/wp-adminos.min.js`
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

Theme shell chrome is data-driven. A theme can declare its shell model and runtime labels without changing core behavior:

```php
'shell' => array(
	'chrome'      => 'global-menu-dock',
	'top_bar'     => 'menu-bar',
	'launcher'    => 'dock',
	'system_menu' => 'mark',
	'app_menu'    => 'global',
	'status_area' => 'menu-bar',
	'labels'      => array(
		'launcher'             => __( 'Dock', 'wp-adminos' ),
		'desktop_launcher'     => __( 'Desktop & Dock', 'wp-adminos' ),
		'launcher_and_desktop' => __( 'Dock & Desktop', 'wp-adminos' ),
		'keep_in_launcher'     => __( 'Keep in Dock', 'wp-adminos' ),
		'remove_from_launcher' => __( 'Remove from Dock', 'wp-adminos' ),
	),
),
```

Window chrome is also theme metadata. Core still owns window behavior, but themes can choose control placement, control order, visual style hooks, title alignment, and control labels:

```php
'window_chrome' => array(
	'controls' => array(
		'placement' => 'left',
		'order'     => array( 'close', 'minimize', 'maximize' ),
		'style'     => 'traffic',
		'labels'    => array(
			'close'    => __( 'Close', 'wp-adminos' ),
			'minimize' => __( 'Minimize', 'wp-adminos' ),
			'maximize' => __( 'Maximize', 'wp-adminos' ),
		),
	),
	'title'    => array(
		'alignment' => 'left',
		'show_icon' => true,
	),
),
```

Typography is theme metadata and resolves to shell CSS variables before first paint. Use system font stacks or bundled original/licensed font assets only; do not ship third-party platform font files:

```php
'typography' => array(
	'fonts' => array(
		'ui'      => '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
		'display' => '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
		'mono'    => 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
	),
	'scale' => array(
		'caption'        => '12px',
		'menu'           => '13px',
		'body'           => '13px',
		'label'          => '17px',
		'heading'        => '23px',
		'display_title'  => '34px',
		'settings_body'  => '11px',
		'settings_label' => '12.5px',
	),
	'weights' => array(
		'regular'  => '400',
		'medium'   => '500',
		'semibold' => '600',
		'strong'   => '620',
	),
),
```

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
		'wallpapers'  => array(
			'default' => 'aurora-flow',
			'items'   => array(
				array(
					'id'        => 'aurora-flow',
					'label'     => __( 'Aurora', 'wp-adminos' ),
					'css_value' => 'linear-gradient(135deg, #2447c7 0%, #2fb8d2 52%, #8d3cff 100%)',
				),
			),
		),
		'icon_pack'   => 'themes/adminos/default/icons',
		'cursor_pack' => 'themes/adminos/default/cursors',
	),
);
```

Theme media fields are normalized to local `assets/media/` descriptors with `path` and `url` values, then exposed in the runtime theme config. Keep OS media original or licensed for redistribution.

Wallpapers are managed by `WP_AdminOS_Wallpaper_Registry`. It combines theme-declared CSS or image wallpaper collections, bundled original color backgrounds, and user-selected Media Library uploads, then resolves the active choice into `--aos-wallpaper-*` CSS variables for the shell. Bundled gradient wallpapers should use `css_value` instead of image files to keep plugin size small. Image wallpapers remain supported through `path` or `file` fields for original/licensed assets that need texture or detail. The older single `wallpaper` field remains a fallback for one-image themes, but new themes should declare `wallpapers` with stable item IDs. Theme icon descriptors resolve against `theme.media.icon_pack.url` and keep Dashicons as fallback when the icon file is missing.

Future phases can add optional alternate theme packs such as Redmond-style, classic desktop, Linux desktop, and other skins by registering a theme and adding a stylesheet, plus native custom app windows for posts, media, analytics, and WooCommerce. The bundled default should remain the WP adminOS identity rather than depending on another platform owner’s brand assets.

Workspace layout is persisted in WordPress user meta per site, user, and selected theme through `WP_AdminOS_Workspace_State`. Browser `localStorage` remains a fast cache and migration fallback for existing local sessions, while `sessionStorage` is reserved for one-time page-transition behavior such as skipping window restore once. Core stores layout in named sections, currently `windows`, `widgets`, `desktopIcons`, `desktopSort`, and `recentItems`, so future spaces or theme-specific surfaces can join without replacing the whole payload. Windows track app windows, position, size, maximized/minimized state, and restore open app windows when the shell loads. Widgets track widget position, size, and hidden state. User-created desktop folder definitions and membership are persisted separately in WordPress user meta, and their icon positions live in the workspace layout state.

Widgets are registered through `WP_AdminOS_Widget_Registry` and can be extended with the `wp_adminos_widgets` filter. A widget declares an id, label, icon, capability, kind/native type, semantic template, default position, default size, and refresh interval. Default positions can use `left` or `right`, plus `top` or `bottom`, so widgets can anchor to either desktop edge before JavaScript persists their exact dragged position. The current foundation includes a native Clock widget; future weather, analytics, system monitor, or note widgets can use the same registry, templates, CSS layer, and session section.

== Changelog ==

= 0.1.0 =

- Initial local foundation.
