=== PufferDesk - Admin Desktop ===
Contributors: senols
Tags: desktop, admin, ui, productivity, ai
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

PufferDesk turns the WordPress dashboard entry point into a desktop-style admin workspace.

== Description ==

PufferDesk wraps existing WordPress admin screens in a desktop-style shell. The current foundation focuses on one primary, release-safe PufferDesk experience: a top menu bar, generated and user-created desktop folders, a dock-style launcher, app search, draggable windows, desktop widgets, and iframe-based admin apps.

== Current foundation features ==

- Top admin-bar switch between PufferDesk and Classic Admin.
- Per-user mode preference.
- Dashboard entry redirects to PufferDesk by default.
- Emergency one-request classic override: `/wp-admin/index.php?pufferdesk_classic=1`.
- PufferDesk shell with system menu, site title menu, app menu bar, right-click context menus, generated and user-created desktop folders, desktop widgets, theme-driven launcher surfaces, search, draggable windows, and iframe-based admin apps.
- Embedded admin apps hide the regular WordPress sidebar/top chrome so they behave more like OS windows.

== Notes ==

PufferDesk intentionally wraps existing WordPress admin screens instead of replacing them. That keeps plugin compatibility high and makes Classic Admin a reliable fallback.

The bundled PufferDesk family uses original plugin CSS and release-safe media. Visual polish may use familiar desktop conventions, but the product identity, assets, and naming must remain PufferDesk. Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled font files in this plugin. When third-party media is used, keep source and license details in `THIRD-PARTY-ASSETS.txt`.

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
	'src'  => 'themes/pufferdesk/default/icons/posts.svg',
);

'icon' => array(
	'type'     => 'theme',
	'name'     => 'posts.svg',
	'fallback' => 'dashicons-admin-post',
);
```

Apps are registered through `PufferDesk_App_Registry` or the `pufferdesk_apps` filter. Iframe apps provide a `url`; native apps provide `kind => native` and a stable `native` renderer ID. Each app should declare the WordPress capability required for its target screen or action through `cap`; missing, empty, or non-scalar capabilities normalize to `read`, which is intended only for current-user shell features. Top-level WordPress admin menu apps inherit the capability WordPress used to show that menu item, so the dock, desktop, and launcher stay aligned with the native admin menu. Apps can opt out of workspace window restoration with `window_persistence => none`; the default `workspace` behavior restores stable app windows across shell loads. JavaScript native app windows are registered with `window.PufferDesk.apps.registerNativeAppRenderer( nativeId, renderer )`, and the renderer returns reusable window options such as `content`, `bodyClass`, `width`, `height`, and `resizeMode`. Apps may define a `badge` with `text`, optional `count`, `tone`, and `aria_label`; top-level WordPress admin menu count spans are normalized into this same badge shape for dock and desktop app icons. The app launcher stays generic and does not special-case individual native apps.

System Settings uses PHP-provided `settings.labels` runtime data for user-facing panel labels, option lists, and status messages. The browser-side `assets/js/core/apps/settings/labels.js` module merges that translated runtime data with local fallbacks before the panel factories render. Theme-derived `settings.capabilities` and `shellCapabilities` control whether shell-specific panels and rows are visible, so a theme without a menu bar or Dock does not expose irrelevant controls. Apps, Widgets, Workspace, and System panels are live restore/reset surfaces: app placement and login items use the existing app preference endpoints, widgets use the `widgets` workspace section, Workspace resets current-theme or all-theme layout state, and System routes restart, Classic Admin, and full PufferDesk preference reset through shared shell commands.

== Build and release assets ==

Readable source assets stay in `assets/css/core/`, `assets/css/themes/`, and `assets/js/core/`.
Release assets are generated into `assets/dist/`:

- `assets/dist/css/pufferdesk-core.min.css`
- `assets/dist/css/themes/{family}/{version}.min.css`
- `assets/dist/js/pufferdesk-admin-desktop.min.js`
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

Theme shell chrome is data-driven. A theme can declare its shell model and runtime labels without changing core behavior. Core currently consumes these fields to render or omit the menu bar, render no launcher, or render the app launcher as the default Dock or as a taskbar-style surface:

```php
'app_labels' => array(
	'trash' => __( 'Recycle Bin', 'pufferdesk-admin-desktop' ),
),
'menu' => array(
	'labels' => array(
		'trash'             => __( 'Recycle Bin', 'pufferdesk-admin-desktop' ),
		'empty_trash'       => __( 'Empty Recycle Bin', 'pufferdesk-admin-desktop' ),
		'empty_trash_title' => __( 'Empty Recycle Bin?', 'pufferdesk-admin-desktop' ),
	),
),
'shell' => array(
	'chrome'      => 'global-menu-dock',
	'top_bar'     => 'menu-bar',
	'launcher'    => 'dock',
	'system_menu' => 'mark',
	'app_menu'    => 'global',
	'status_area' => 'menu-bar',
	'launcher_separator' => true,
	'fixed_app_locations' => array(
		'trash' => 'dock',
	),
	'labels'      => array(
		'launcher'             => __( 'Dock', 'pufferdesk-admin-desktop' ),
		'desktop_launcher'     => __( 'Desktop & Dock', 'pufferdesk-admin-desktop' ),
		'launcher_and_desktop' => __( 'Dock & Desktop', 'pufferdesk-admin-desktop' ),
		'keep_in_launcher'     => __( 'Keep in Dock', 'pufferdesk-admin-desktop' ),
		'remove_from_launcher' => __( 'Remove from Dock', 'pufferdesk-admin-desktop' ),
	),
),
```

`fixed_app_locations` lets a theme place fixed system apps on the surface that fits its shell model without changing the user's stored app-location preference. For example, Redmond keeps the fixed Trash app on the desktop and disables `launcher_separator` so taskbar items stay in one continuous run.
`app_labels` and `menu.labels` let a theme adapt OS-family vocabulary such as Trash versus Recycle Bin while keeping app IDs and command IDs stable.

Native app surface layout is theme metadata too. Use this when another OS family needs a different Settings or folder structure rather than a reskin of the PufferDesk defaults:

```php
'surfaces' => array(
	'settings' => 'pufferdesk-settings', // Or windows-settings.
	'folder'   => 'finder',           // Or file-explorer.
),
```

Window chrome is also theme metadata. Core still owns window behavior, but themes can choose control placement, control order, visual style hooks, title alignment, and control labels. Supported control styles are `traffic`, `caption`, `toolbar`, and `hidden`:

```php
'window_chrome' => array(
	'controls' => array(
		'placement' => 'left',
		'order'     => array( 'close', 'minimize', 'maximize' ),
		'style'     => 'traffic',
		'labels'    => array(
			'close'    => __( 'Close', 'pufferdesk-admin-desktop' ),
			'minimize' => __( 'Minimize', 'pufferdesk-admin-desktop' ),
			'maximize' => __( 'Maximize', 'pufferdesk-admin-desktop' ),
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
'pufferdesk' => array(
	'id'            => 'pufferdesk',
	'family'        => 'pufferdesk',
	'version'       => 'default',
	'parent'        => 'pufferdesk-base',
	'stylesheet'    => 'pufferdesk/default.css',
	'version_label' => 'Default',
	'media'         => array(
		'wallpapers'  => array(
			'default' => 'aurora-flow',
		),
		'icon_pack'   => 'themes/pufferdesk/default/icons',
	),
);
```

Theme media fields are normalized to local `assets/media/` descriptors with `path` and `url` values, then exposed in the runtime theme config. Keep OS media original or licensed for redistribution.

Bundled alternate themes inherit from `pufferdesk-base` and keep their shell contracts data-driven. `workstation` is a public `workstation/default` theme with a bottom taskbar, start-style system menu, no global menu bar, no global app menu, and taskbar status controls. Window chrome uses right-aligned toolbar controls, left-aligned titles, and visible window icons. Typography uses redistribution-safe system stacks with a tighter utility scale. Theme shell labels rename launcher vocabulary and minimize animation option labels for the taskbar model without changing stored preference values. Media stays release-safe through a small original SVG icon pack under `assets/media/themes/workstation/default/icons/`; any missing app or folder icon falls back through the existing Dashicon descriptor.

`redmond` is a public `redmond/modern` theme inspired by modern Windows desktop patterns without bundling Microsoft-owned assets or clone artwork. Its shell contract uses a bottom full-width taskbar, Start system menu, compact taskbar search field, no global menu bar, no global app menu, taskbar status controls, fixed Trash on the desktop, no taskbar separator, and right-aligned window controls ordered minimize, maximize, close. Its surface contract uses `windows-settings` for the native Settings app and `file-explorer` for folder windows, so those areas render Windows-style navigation, command, address, and list surfaces instead of inheriting PufferDesk/Finder layouts. The Redmond Start surface is rendered from registered apps and `menu.system` command data by the shared menu controller, while `templates/themes/redmond/shell/dock.php` adds the taskbar search and Start button markup needed for that family. Typography prefers local system stacks such as `"Segoe UI Variable"` and `"Segoe UI"` without shipping font files. Theme app icons use local SVG wrappers with selected Tabler Icons glyphs under the MIT License; bundled folders, wallpapers, Trash, and theme wrappers remain PufferDesk assets.

The registry also includes an internal contract-test theme, `canary-taskbar`, that is hidden from the Settings theme picker unless `PUFFERDESK_ENABLE_INTERNAL_THEMES` is truthy. It deliberately uses a taskbar launcher, start-style system menu, no top menu bar, caption window controls, and centered title text so contributors can test theme contracts before adding public theme families.

Wallpapers are managed by `PufferDesk_Wallpaper_Registry`. It combines one shared bundled wallpaper catalog, bundled original color backgrounds, optional theme-declared wallpaper collections, and user-selected Media Library uploads, then resolves the active choice into `--pdk-wallpaper-*` CSS variables for the shell. Bundled themes should set `media.wallpapers.default` to choose their starting wallpaper from the shared catalog instead of exposing different wallpaper lists per theme. Bundled gradient wallpapers use `css_value` instead of image files to keep plugin size small. Image wallpapers remain supported through `path` or `file` fields for original/licensed assets that need texture or detail. The older single `wallpaper` field remains a fallback for one-image themes, but new public bundled themes should normally declare only a default wallpaper id. Theme icon descriptors resolve against `theme.media.icon_pack.url` and keep Dashicons as fallback when the icon file is missing. Third-party icon notices are tracked in `THIRD-PARTY-NOTICES.txt`.

Future phases can add optional alternate theme packs such as classic desktop, Linux desktop, and other skins by registering a theme and adding a stylesheet, plus native custom app windows for posts, media, analytics, and WooCommerce. The bundled default should remain the PufferDesk identity rather than depending on another platform owner’s brand assets.

Workspace layout is persisted in WordPress user meta per site, user, and selected theme through `PufferDesk_Workspace_State`. Fresh shell loads treat WordPress user meta as the authoritative workspace state and refresh the browser `localStorage` cache from that server payload. Workspace saves send the last known server `updatedAt` revision; stale browser saves receive a conflict response with the newer server state instead of overwriting it. Same-browser tabs share accepted workspace updates through `BroadcastChannel`, while cross-browser sessions such as Chrome to Safari pick up changes on reload unless a future remote polling/push sync is added. `sessionStorage` is reserved for one-time page-transition behavior such as skipping window restore once. Core stores layout in named sections, currently `windows`, `widgets`, `desktopIcons`, `desktopSort`, and `recentItems`, so future spaces or theme-specific surfaces can join without replacing the whole payload. Windows track app and folder windows, position, size, maximized/minimized state, and restore stable open windows when the shell loads. Widgets track widget position, size, and hidden state. User-created desktop folder definitions and membership are persisted separately in WordPress user meta, and their icon positions live in the workspace layout state. System Settings exposes current-theme layout reset and all-theme layout reset through the same workspace state controller; full "Erase All Content and Settings" additionally clears PufferDesk preference domains such as app locations, login items, desktop folders, wallpaper, and selected theme.

Widgets are registered through `PufferDesk_Widget_Registry` and can be extended with the `pufferdesk_widgets` filter. A widget declares an id, label, icon, capability, kind/native type, semantic template, default position, default size, and refresh interval. Missing, empty, or non-scalar widget capabilities normalize to `read`; widgets that expose privileged WordPress data should use the exact WordPress capability needed for that data. Default positions can use `left` or `right`, plus `top` or `bottom`, so widgets can anchor to either desktop edge before JavaScript persists their exact dragged position. System Settings includes a Widgets panel that can show or hide registered widgets through the existing `widgets` workspace section. The current foundation includes a native Clock widget; future weather, analytics, system monitor, or note widgets can use the same registry, templates, CSS layer, settings panel, and session section.

== Changelog ==

= 0.1.0 =

- Initial local foundation.
