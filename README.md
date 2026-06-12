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
- PufferDesk shell with system menu, site title menu, app menu bar, right-click context menus, internal clipboard cut/copy/paste for folders, app references, sticky notes, and documents, notifications, generated and user-created desktop folders, desktop widgets, theme-driven launcher surfaces, search, draggable windows, iframe-based admin apps, and native document apps such as Sticky Notes and Text Editor.
- Embedded admin apps hide the regular WordPress sidebar/top chrome so they behave more like OS windows.

== Notes ==

PufferDesk intentionally wraps existing WordPress admin screens instead of replacing them. That keeps plugin compatibility high and makes Classic Admin a reliable fallback.

The bundled PufferDesk family uses original plugin CSS and release-safe media. Visual polish may use familiar desktop conventions, but the product identity, assets, and naming must remain PufferDesk. Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled font files in this plugin. When third-party media is used, keep source and license details in `THIRD-PARTY-ASSETS.txt`.

Pre-release internal refactors should be clean breaks. If an old internal icon filename, option, DOM attribute, layout value, module path, or helper has not shipped as a public contract with real user state depending on it, replace the single source of truth and remove the old path. Do not add compatibility aliases, legacy lookup paths, duplicate assets, or migration branches for unreleased/internal changes. Compatibility code belongs only to real shipped public contracts or existing user data that cannot be safely normalized at the source.

The foundation separates shell behavior from OS appearance:

- `includes/` owns routing, preferences, shared path normalization, virtual filesystem paths, app/widget/theme registries, stable app and command IDs, app descriptor contracts, client storage key contracts, context-menu target contracts, icon descriptor contracts, window chrome contracts, wallpaper type contracts, app badge rendering, theme token CSS-variable rendering, shared shell context, runtime config, asset manifests/enqueueing, controllers, widget layout attributes, and rendering.
- `templates/` owns shell markup through semantic folders:
  - `templates/shell/` for global shell surfaces such as menu bar, desktop, and dock.
  - `templates/windows/` for reusable window chrome.
  - `templates/desktop/` for desktop icons and folder surfaces.
  - `templates/widgets/` for desktop widget surfaces.
  - Native app content currently renders through purpose-specific JavaScript modules under `assets/js/core/apps/`; add PHP app templates only when server-rendered native app markup exists.
- `assets/css/core/` owns semantic core styles:
  - `admin-chrome.css` for WordPress admin chrome suppression.
  - `shell.css` for global shell variables, menu bar, and shared primitives.
  - `context-menu.css` for right-click menu positioning on top of shared menu primitives.
  - `tooltips.css` for shared tooltip placement, visibility, transition, and theme-variable hooks.
  - `notifications.css` for shared notification button, notification center, list, item, and toast structure.
  - `desktop.css` for desktop surfaces and desktop icons.
  - `widgets.css` for desktop widget layout and shared widget chrome.
  - `windows.css` for reusable window chrome.
  - `documents.css` for native document apps, sticky note desktop objects, and shared document controls.
  - `dock.css` for dock behavior and states.
  - `apps.css` for generic app grids and app launcher tiles.
  - `folders.css` for folder windows, Finder-style surfaces, Trash, and folder info panels.
  - `about.css` for PufferDesk and site About windows.
  - `settings.css` for native System Settings surfaces and controls.
  - `explorer.css` for Explorer-style folder/settings shared surfaces.
  - `responsive.css` for core viewport adaptations.
- `assets/js/core/` owns reusable shell behavior through purpose-specific modules:
  - `api/` exposes stable facades such as the Desktop API over existing shell managers.
  - `boot.js` wires the shell together.
  - `config.js` exposes the WordPress-provided runtime payload.
  - `dom.js` owns shared DOM helpers.
  - `events/` owns the internal event bus used for decoupled shell/module notifications.
  - `services/` owns browser storage, AJAX clients, tooltip helpers, semantic sound playback, virtual filesystem helpers, native document requests, geometry helpers, and debounced task scheduling.
  - `drag-drop/` owns the central drag/drop platform: normalized movable item models, drop target registry, move validation, move execution, drag lifecycle events, and compatibility adapters for desktop and folder-window item moves.
  - `preferences/` owns shell preference appliers such as appearance, wallpaper, launcher, and menu bar state.
  - `session/` owns per-user, per-theme workspace session sections such as windows, widgets, desktop icons, recent items, and folder sidebar state, with WordPress user meta as durable state, browser storage as cache/fallback, and `storage-keys.js` as the browser helper for PHP-provided storage key fragments.
  - `windows/` owns window creation, shared titlebar actions, drag/focus behavior, and window state serialization.
  - `widgets/` owns widget binding, drag behavior, live updates, and widget layout persistence.
  - `notifications/` owns the notification store, center binding, toast presentation, read/dismiss state, and runtime system notifications.
  - `desktop/` owns desktop icon layout plus user-created folder rendering, sticky note desktop objects, and membership behavior.
  - `apps/` owns app launching, native app renderer registration, native app content such as System Settings, Sticky Notes, Text Editor, and extracted helpers for app badges, app preferences, app window options, native app opening, launcher rendering, folder rendering/data/window state, and recent items.
  - `apps/settings/` owns System Settings label normalization, shared panel UI helpers, AJAX mutation/status helpers, and panel factory modules.
  - `shell/` owns global shell controls such as search, clock behavior, menu commands, top menus, context menus, and command-backed clipboard actions. Clipboard payloads are transient tab-session state: copy expires after 30 minutes, cut expires after 15 minutes, Refresh prunes expired or stale clipboard entries, and workspace reset/erase actions clear the clipboard. `context-menu-constants.js` exposes the PHP-provided context target/key contract to browser modules.
- `assets/css/themes/` owns theme-specific visual language.
- `assets/media/` reserves release-safe media locations:
  - `assets/media/themes/{family}/{version}/wallpapers/`
  - `assets/media/themes/{family}/{version}/cursors/`
  - `assets/media/shared/icons/`
  - `assets/media/shared/icons/theme/`
  - `assets/media/shared/sounds/`

Apps and folders use structured icon descriptors internally. Dashicon strings still work as shorthand, but the normalized shape supports both current and future media-backed icons:

```php
'icon' => array(
	'type'  => 'dashicon',
	'value' => 'dashicons-admin-post',
);

'icon' => array(
	'type'       => 'image',
	'src'        => 'shared/icons/theme/posts.svg',
	'appearance' => 'brand',
);

'icon' => array(
	'type'       => 'theme',
	'name'       => 'posts.svg',
	'fallback'   => 'dashicons-admin-post',
	'appearance' => 'brand',
);
```

Icon descriptor types, appearances, and the default Dashicon fallback live in `PufferDesk_Icon_Renderer`, flow through `runtime.contracts.icons`, and are consumed by `window.PufferDesk.dom.createIcon()` and `getDefaultDashicon()`. `appearance => brand` preserves full-color images, while `appearance => monochrome` lets tintable data-image glyphs render through the adaptive icon mask. PHP registries and browser modules should use that descriptor contract instead of repeating icon type strings, appearance strings, or the generic fallback.

Apps are registered through `PufferDesk_App_Registry` or the `pufferdesk_apps` filter. Built-in app IDs live in `PufferDesk_App_Ids` and are exposed to browser code as `runtime.contracts.appIds`; native renderer IDs are exposed separately as `runtime.contracts.nativeAppIds`. Iframe apps provide a `url`; native apps provide `kind => native` and a stable `native` renderer ID. Descriptor groups, kinds, and window persistence values live in `PufferDesk_App_Normalizer`, flow through `runtime.contracts.appDescriptors`, and are consumed by browser helpers that open native windows or decide workspace restoration. Each app should declare the WordPress capability required for its target screen or action through `cap`; missing, empty, or non-scalar capabilities normalize to `read`, which is intended only for current-user shell features. Top-level WordPress admin menu apps inherit the capability WordPress used to show that menu item, so the dock, desktop, and launcher stay aligned with the native admin menu. Apps can opt out of workspace window restoration with `window_persistence => none`; the default `workspace` behavior restores stable app windows across shell loads. JavaScript native app windows are registered with `window.PufferDesk.apps.registerNativeAppRenderer( nativeId, renderer )`, and the renderer returns reusable window options such as `content`, `bodyClass`, `width`, `height`, and `resizeMode`. Apps may define a `badge` with `text`, optional `count`, `tone`, and `aria_label`; top-level WordPress admin menu count spans are normalized into this same badge shape for dock and desktop app icons. PHP-rendered shell surfaces use the shared app badge renderer, and browser-rendered surfaces use `apps/app-badges.js`, so Dock and desktop badge markup and accessibility labels stay aligned. App location values live in `PufferDesk_User_Preferences`, flow through `runtime.contracts.appLocations`, and are consumed by app surface/preference modules. App location and login-item state is mediated by `apps/app-preferences.js`; Settings panels and command/context-menu actions should not duplicate those endpoint flows. The app launcher stays generic and does not special-case individual native apps.

The browser runtime exposes `window.PufferDesk.desktopApi` and `window.PufferDesk.desktop.api` as a facade over the current window manager, app launcher, command registry, and native app renderer registry. Extensions should prefer this facade for opening apps, creating/focusing/minimizing/closing/moving windows, registering command-backed behavior, and registering native renderers instead of reaching into lower-level managers. Stable command IDs live in `PufferDesk_Command_Ids`, flow through `runtime.contracts.commandIds`, and are exposed as `window.PufferDesk.shell.commands`; menu definitions, context menus, settings action rows, shortcut definitions, and browser command registration should use those IDs instead of repeating command strings. Client-side storage key fragments live in `PufferDesk_Client_Storage_Keys`, flow through `runtime.contracts.storageKeys`, and are consumed by `window.PufferDesk.session.storageKeys`; workspace cache, broadcast channel, reopen skip, custom shortcut override storage, and wallpaper menu contrast keys should use that helper instead of repeating string formats. Router query keys live in `PufferDesk_Router::client_contract()` and are exposed through `window.PufferDesk.config.getRouterQueryKey()` and `getRouterValue()`, so iframe/classic/mode URLs stay aligned with PHP routing. Shared browser event names live in `assets/js/core/events/event-names.js`; shared app descriptor, icon, context-menu, window chrome, wallpaper type, shortcut, and workspace contracts flow through `runtime.contracts`. `window.PufferDesk.events` provides a small internal event bus with `on`, `once`, `off`, and `emit`. Shell boot emits `desktop:ready` with the facade and runtime context. The window manager emits `window:created`, `window:focused`, `window:closed`, and `window:stateChanged`; handlers receive a `CustomEvent` and should read state from `event.detail`.

Keyboard shortcuts are centralized in `assets/js/core/shell/shortcuts.js`, with shared shortcut context IDs owned by `assets/js/core/shell/shortcut-contexts.js`; see `docs/shortcut-platform.md`. Users can open Help > Keyboard Shortcuts to view the active shortcut registry with platform-formatted labels. Feature shortcuts are declarative data that resolve to command IDs, use `primary` for Cmd/Ctrl and `secondary` for Option/Alt, declare valid contexts such as `desktop`, `window`, `folder`, or `input-focused`, and pass through conflict checks before registration. Do not add feature-level `keydown` listeners to components; local key handlers should be limited to focused navigation and editing behavior such as Escape in dialogs, menu arrow navigation, or inline rename confirmation.

Context menus are centralized as a shell platform contract; see `docs/context-menu-platform.md`. Context target IDs, area IDs, target types, item types, and context keys live in `PufferDesk_Context_Menu_Contracts`, flow through `runtime.contracts.contextMenu`, and are exposed in JavaScript by `assets/js/core/shell/context-menu-constants.js`. Menu group IDs live in `PufferDesk_App_Menu_Normalizer`, flow through `runtime.contracts.menuGroups`, and drive the browser menu schema. Targets resolve through the shared resolver into normalized area/item/window context, menus compose through the shared registry and schema, and actions execute through `window.PufferDesk.menuCommands`. Extensions can add menu items with `window.PufferDesk.contextMenus.register( contextKey, itemOrDefinition )` after shell boot, while themes only style the shared `.pdk-context-menu` presentation hooks.

Drag/drop item moves flow through the core drag/drop platform in `assets/js/core/drag-drop/`; see `docs/drag-drop-platform.md` for the current behavior matrix and contracts. UI modules may own pointer tracking, drag proxies, and drop highlight classes, but validation and state mutation belong to `DragDropManager` and `MoveService`. The platform emits stable `drag:*`, `drop:validate`, `item:move:*`, `desktop:layout:changed`, and `folder:contents:changed` events through `window.PufferDesk.events`.

Notifications are centralized through `PufferDesk_Notification_Registry`, `PufferDesk_Notification_Controller`, `assets/js/core/notifications/`, and the Desktop API notification facade. Server-side providers can add capability-aware notifications with the `pufferdesk_notifications` filter; browser modules should call `window.PufferDesk.desktopApi.notifications.notify()` for runtime notifications instead of creating standalone toast UI. Notification settings live in the `notifications` settings domain and control source visibility, severity, badges, toasts, quiet mode, notification-specific sound preference, and history retention. Stable notification source IDs live on `PufferDesk_User_Preferences` and are exposed as `notifications.sourceIds`; Settings source rows and runtime PufferDesk notifications should use those IDs instead of hard-coded source names. Provider-backed notifications are retained per user and pruned by the saved retention window. Notification sounds flow through `PufferDesk_Sound_Registry`, `assets/js/core/services/sound-manager.js`, and the runtime `sounds.events` map so future theme sound packs can replace semantic events without notification-specific playback code. Extensions can add semantic events with the `pufferdesk_sound_events` filter. `sounds.eventIds` exposes stable client aliases, `sounds.eventList` drives the multi-event preview list in Settings > Sound, and `sounds.notificationEvents` maps notification types to semantic sound IDs. Shared shell dialogs, Trash empty success, command failures, and runtime app errors use those aliases through the Desktop API sound facade. Global sound enable and output volume live in the separate `sounds` settings domain. Core CSS owns notification structure, while theme CSS owns the visual variables for notification buttons, centers, items, and toasts.

Native document features use one private WordPress post type (`pufferdesk_note`) and the shared `PufferDesk_Document_Service` for create, duplicate, list, update, and trash behavior. Sticky Notes and Text Editor only differ by document `kind` (`sticky_note` or `text_document`); content is stored in `post_content`, while user-visible note/window layout is stored separately in the workspace state. Document organization uses `PufferDesk_Virtual_Filesystem` canonical paths such as `pdk://site/{site}/home/{user}/stickies` and `pdk://site/{site}/home/{user}/documents`; the stored `_pufferdesk_document_parent_path` meta is the source of truth for where a document appears in virtual folders. Do not store document content or document folder placement in `workspaceState`, browser storage, widgets, or app-specific user meta. Browser code should use `assets/js/core/services/documents.js` and `assets/js/core/services/virtual-filesystem.js` instead of posting directly to document AJAX actions or hard-coding folder paths.

Theme document metadata can define native document save behavior. Sticky Notes currently use `theme.documents.stickyNoteSavePolicy`: `default-location` creates documents directly in the virtual filesystem default path, while `ask-on-first-save` keeps a new note client-side until the first explicit Save opens the shared document save dialog and stores the selected virtual parent path.

== Extension examples ==

Register apps with PHP filters, then use the Desktop API for native app renderers and window events:

```php
add_filter( 'pufferdesk_apps', function ( $apps ) {
	$apps[] = array(
		'id'     => 'acme-reports',
		'label'  => __( 'Reports', 'acme' ),
		'cap'    => 'manage_options',
		'group'  => 'tools',
		'icon'   => array( 'type' => 'dashicon', 'value' => 'dashicons-chart-area' ),
		'kind'   => 'native',
		'native' => 'acme-reports',
	);

	return $apps;
} );
```

```js
const eventNames = window.PufferDesk.events.names;

window.PufferDesk.events.on(eventNames.DESKTOP_READY, (event) => {
	const { api } = event.detail;

	api.nativeApps.registerRenderer('acme-reports', ({ app }) => {
		const content = document.createElement('div');
		content.className = 'acme-reports-window';
		content.textContent = app && app.label ? app.label : 'Reports';

		return {
			bodyClass: 'pdk-window-body',
			content,
			height: '520px',
			resizeMode: 'both',
			width: '760px'
		};
	});

	api.events.on(eventNames.WINDOW_STATE_CHANGED, ({ detail }) => {
		console.debug('PufferDesk window changed:', detail.windowId, detail.change);
	});
});
```

Iframe apps use the same registry and provide `url` instead of `kind` and `native`. Widgets use `pufferdesk_widgets`:

```php
add_filter( 'pufferdesk_widgets', function ( $widgets ) {
	$widgets[] = array(
		'id'               => 'acme-status',
		'label'            => __( 'Status', 'acme' ),
		'cap'              => 'manage_options',
		'icon'             => 'dashicons-chart-line',
		'kind'             => 'native',
		'native'           => 'acme-status',
		'template'         => 'widgets/acme-status.php',
		'default_position' => array( 'right' => 24, 'top' => 160 ),
		'default_size'     => array( 'width' => 260, 'height' => 140 ),
	);

	return $widgets;
} );
```

Themes use `pufferdesk_themes`. Stylesheets are normalized under `assets/css/themes`, and media resolves under `assets/media`; bundled assets must be original or licensed for redistribution:

```php
add_filter( 'pufferdesk_themes', function ( $themes ) {
	$themes['acme'] = array(
		'id'         => 'acme',
		'label'      => __( 'Acme', 'acme' ),
		'family'     => 'acme',
		'version'    => 'default',
		'parent'     => 'pufferdesk-base',
		'stylesheet' => 'acme/default.css',
		'tokens'     => array(
			'radius' => array(
				'window'           => '16px',
				'window_maximized' => '8px',
				'menu_popover'     => '14px',
			),
		),
	);

	return $themes;
} );
```

System Settings uses PHP-provided `settings.labels` runtime data for user-facing panel labels, option lists, and status messages. `PufferDesk_Settings_Registry` describes the stable settings domains, AJAX actions, capabilities, reset domains, meta keys, defaults, and panel ownership; `settings.domains` exposes the client-safe portion of that schema, while `runtime.contracts.settingsDomainIds` exposes enum-style domain IDs for browser modules. Browser code should resolve actions with `window.PufferDesk.config.getSettingAction( domainKey )` rather than spelling AJAX action strings. The browser-side `assets/js/core/apps/settings/labels.js` module formats and reads the translated runtime labels before the panel factories render. Theme-derived `settings.capabilities` and `shellCapabilities` control whether shell-specific panels and rows are visible, so a theme without a menu bar or Dock does not expose irrelevant controls. Apps, Widgets, Workspace, and System panels are live restore/reset surfaces: app placement and login items use the shared app preference store and existing app preference endpoints, widgets use the `widgets` workspace section, Workspace resets current-theme or all-theme layout state, and System routes restart, Classic Admin, and full PufferDesk preference reset through shared shell commands. Settings domain metadata can be inspected or extended with the `pufferdesk_settings_domains` filter, but existing IDs, action names, meta keys, and reset domains are compatibility anchors.

== Build and release assets ==

Readable source assets stay in `assets/css/core/`, `assets/css/themes/`, and `assets/js/core/`. `assets/manifest.json` is the source of truth for core CSS order, JavaScript dependency order, and dist bundle paths used by both WordPress enqueueing and `npm run build`.
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

== Local development and testing ==

The project owner's local WordPress environment is available at:

```text
https://newwp:7890/wp-admin/
https://newwp:7890/wp-admin/admin.php?page=pufferdesk-admin-desktop
```

Private local login details, database constants, WP-CLI socket configuration, and the detailed browser smoke checklist are documented in `AGENTS.md`. `AGENTS.md` is intentionally excluded from release packaging, so do not duplicate local passwords or machine-only credentials in this README.

Use the level of testing that matches the change:

- Small non-visual, non-runtime changes usually only need `npm run check` and a focused WP-CLI/PHP check when PHP behavior changed.
- CSS, JavaScript, template, theme, Settings, menu, window, workspace-state, asset-loading, or runtime-config changes should be tested in the local PufferDesk shell.
- Broad architecture or release-impacting changes should run `npm run check`, Plugin Check, `npm run package`, and a browser smoke pass.

For meaningful UI/runtime changes, verify the shell loads, menus/context menus are readable, System Settings opens, the Appearance panel shows theme selection, folder windows render correctly, Dock/taskbar behavior still works, and Classic Admin remains available through `/wp-admin/index.php?pufferdesk_classic=1`. When testing theme or mode work, check PufferDesk and Redmond in light and dark modes and restore the user's original preferences afterward. Do not test destructive reset/delete actions unless the task explicitly requires it.

Template resolution supports theme-specific overrides. The renderer checks paths in this order:

1. `templates/themes/{theme_id}/{template}`
2. `templates/themes/{family}/{template}`
3. `templates/{template}`

Use template overrides only when theme metadata, template data, or scoped CSS cannot describe the required structural difference. Bundled themes should prefer shared templates plus theme shell/surface metadata; external theme packs can still provide override files at those paths.

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
		'launcher_search' => false,
		'system_menu_icon' => 'pufferdesk-mark',
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
`launcher_search` and `system_menu_icon` let taskbar themes add a search field or theme-drawn Start icon through the shared launcher template instead of replacing the launcher markup.
`app_labels` and `menu.labels` let a theme adapt OS-family vocabulary such as Trash versus Recycle Bin while keeping app IDs and command IDs stable.

Native app surface layout is theme metadata too. Use this when another OS family needs a different Settings or folder structure rather than a reskin of the PufferDesk defaults:

```php
'surfaces' => array(
	'settings' => 'pufferdesk-settings', // Or windows-settings.
	'folder'   => 'finder',           // Or file-explorer.
),
```

Window chrome is also theme metadata. Core still owns window behavior, but themes can choose control placement, control order, visual style hooks, title alignment, and control labels. Supported control IDs, placements, styles, title alignments, dataset actions, modifiers, and defaults live in `PufferDesk_Window_Chrome_Contracts`, flow through `runtime.contracts.windowChrome`, and are consumed by the PHP titlebar template plus browser window factories. Supported control styles are `traffic`, `caption`, `toolbar`, and `hidden`:

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

Design tokens are theme metadata too. Explicit resolved `tokens` inherit through the theme parent chain and emit as shell CSS variables for shared colors, material/glass effects, spacing, radii, borders, and shadows before first paint. Tokens are additive: missing values must stay unset so existing theme/core CSS variables remain authoritative. This lets themes migrate visual constants into metadata gradually without generic defaults overriding dark-mode colors or family-specific window chrome:

```php
'tokens' => array(
	'color' => array(
		'ink'        => '#1d2327',
		'muted'      => '#646970',
		'desktop_bg' => '#f0f0f1',
		'accent'     => '#2271b1',
	),
	'material' => array(
		'regular_bg'     => 'rgba(255, 255, 255, 0.78)',
		'regular_border' => 'rgba(255, 255, 255, 0.42)',
		'regular_shadow' => '0 22px 60px rgba(0, 0, 0, 0.2)',
	),
	'radius' => array(
		'window'       => '8px',
		'menu_popover' => '18px',
	),
),
```

Use `mode_tokens.light` and `mode_tokens.dark` for visual values that vary by appearance, such as context menu color/radius/shadow, Settings sidebar and panel surfaces, window chrome material/border/shadow, and Explorer or Finder toolbar/row surfaces. Mode tokens are emitted as scoped CSS rules instead of shell inline styles, so light/dark values can change without blocking higher-specificity material or accessibility overrides. Derived accent variables such as soft, medium, active, active gradient, focus ring, and highlight should flow from `--pdk-accent-rgb` plus alpha tokens instead of repeating per-accent visual values.

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
		'icon_pack'   => 'shared/icons/theme',
	),
);
```

Theme media fields are normalized to local `assets/media/` descriptors with `path` and `url` values, then exposed in the runtime theme config. Directory-backed media packs such as `icon_pack` also expose direct-child file `versions` so browser-rendered theme icons can append cache-busting filemtime query strings just like PHP-rendered shell icons. Bundled themes share `assets/media/shared/icons/theme/` for app, document, folder, and Trash icons; add a theme-specific icon pack only when the artwork is genuinely different, not when SVG sizing alone can handle a smaller surface. Keep OS media original or licensed for redistribution. Theme mode can be `auto`, `pufferdesk`, or `redmond`; auto mode uses the request platform hint only to choose the initial concrete theme, with PufferDesk as the Linux/unknown fallback, while explicit manual selections remain stored and are not overridden by platform detection.

`redmond` is a public `redmond/modern` theme inspired by modern Windows desktop patterns without bundling Microsoft-owned assets or clone artwork. Its shell contract uses a bottom full-width taskbar, Start system menu, compact taskbar search field, no global menu bar, no global app menu, taskbar status controls, fixed Trash on the desktop, no taskbar separator, and right-aligned window controls ordered minimize, maximize, close. Its surface contract uses `windows-settings` for the native Settings app and `file-explorer` for folder windows, so those areas render Windows-style navigation, command, address, and list surfaces instead of inheriting PufferDesk/Finder layouts. The Redmond Start surface is rendered from registered apps and `menu.system` command data by the shared menu controller, while taskbar search and the Start glyph are declared in theme shell metadata and rendered by the shared launcher template. Typography prefers local system stacks such as `"Segoe UI Variable"` and `"Segoe UI"` without shipping font files. App, document, and virtual folder icons come from the shared PufferDesk SVG icon pack with selected Tabler Icons glyphs under the MIT License; bundled wallpapers and theme wrappers remain PufferDesk assets.

Wallpapers are managed by `PufferDesk_Wallpaper_Registry`. It combines one shared bundled wallpaper catalog, bundled original color backgrounds, optional theme-declared wallpaper collections, and user-selected Media Library uploads, then resolves the active choice into `--pdk-wallpaper-*` CSS variables for the shell. Wallpaper type IDs live in the registry, flow through `runtime.contracts.wallpaperTypes`, and should be used by preference sanitizers or browser modules instead of repeated `color`, `theme`, or `upload` strings. Bundled themes should set `media.wallpapers.default` to choose their starting wallpaper from the shared catalog instead of exposing different wallpaper lists per theme. Bundled gradient wallpapers use `css_value` instead of image files to keep plugin size small. Image wallpapers remain supported through `path` or `file` fields for original/licensed assets that need texture or detail. The older single `wallpaper` field remains a fallback for one-image themes, but new public bundled themes should normally declare only a default wallpaper id. Theme icon descriptors resolve against `theme.media.icon_pack.url` and keep Dashicons as fallback when the icon file is missing. Third-party icon notices are tracked in `THIRD-PARTY-NOTICES.txt`.

Future phases can add optional alternate theme packs such as classic desktop, Linux desktop, and other skins by registering a theme and adding a stylesheet, plus native custom app windows for posts, media, analytics, and WooCommerce. The bundled default should remain the PufferDesk identity rather than depending on another platform owner’s brand assets.

Workspace layout is persisted in WordPress user meta per site, user, and selected theme through `PufferDesk_Workspace_State`. Fresh shell loads treat WordPress user meta as the authoritative workspace state and refresh the browser `localStorage` cache from that server payload. Workspace saves send the last known server `updatedAt` revision; stale browser saves receive a conflict response with the newer server state instead of overwriting it. Same-browser tabs share accepted workspace updates through `BroadcastChannel`, while cross-browser sessions such as Chrome to Safari pick up changes on reload unless a future remote polling/push sync is added. `sessionStorage` is reserved for tab-session shell state such as skipping window restore once and the transient clipboard payload. Browser modules derive workspace cache keys, workspace broadcast channel names, and one-time reopen keys through `window.PufferDesk.session.storageKeys`, backed by `PufferDesk_Client_Storage_Keys`, so key formats stay aligned with the PHP runtime contract. Core stores layout in named sections owned by `PufferDesk_Workspace_State::get_section_ids()` and exposed as `runtime.contracts.workspace.sections`: `windows`, `widgets`, `desktopIcons`, `desktopSort`, `dockApps`, `folderSidebar`, `stickyNotes`, and `recentItems`. Desktop icon app/folder ID prefixes and persisted window kind IDs are owned by `PufferDesk_Workspace_State`, exposed as `runtime.contracts.workspace.desktopIconPrefixes` and `runtime.contracts.workspace.windowKinds`, and consumed by `window.PufferDesk.session.workspace`. Future spaces or theme-specific surfaces can join without replacing the whole payload. Windows track app and folder windows, position, size, maximized/minimized state, and restore stable open windows when the shell loads. Widgets track widget position, size, and hidden state. User-created desktop folder definitions and membership are persisted separately in WordPress user meta, and their icon positions live in the workspace layout state. System Settings exposes current-theme layout reset and all-theme layout reset through the same workspace state controller; full "Erase All Content and Settings" additionally clears PufferDesk preference domains such as app locations, login items, desktop folders, wallpaper, and selected theme.

Widgets are registered through `PufferDesk_Widget_Registry` and can be extended with the `pufferdesk_widgets` filter. A widget declares an id, label, icon, capability, kind/native type, semantic template, default position, default size, and refresh interval. Missing, empty, or non-scalar widget capabilities normalize to `read`; widgets that expose privileged WordPress data should use the exact WordPress capability needed for that data. Default positions can use `left` or `right`, plus `top` or `bottom`, so widgets can anchor to either desktop edge before JavaScript persists their exact dragged position. System Settings includes a Widgets panel that can show or hide registered widgets through the existing `widgets` workspace section. The current foundation includes a native Clock widget; future weather, analytics, system monitor, or note widgets can use the same registry, templates, CSS layer, settings panel, and session section.

== Changelog ==

= 0.1.0 =

- Initial local foundation.
