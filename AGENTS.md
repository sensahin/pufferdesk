# AGENTS.md

Guidance for AI coding agents and contributors working on WP adminOS.

This project is not a throwaway MVP. Treat it as a long-term WordPress plugin foundation for multiple OS-style admin experiences. Every change should keep the codebase modular, manageable, extensible, and release-safe.

## Project Purpose

WP adminOS wraps the existing WordPress admin in a desktop-style workspace. It should preserve WordPress compatibility by embedding existing admin screens where practical, while adding an OS shell with themes, windows, apps, widgets, desktop surfaces, one primary WP adminOS identity, and optional future theme families such as Redmond-style, Linux desktop, and nostalgic retro systems.

The foundation matters more than short-term visual hacks.

## Core Rules

Always:

- Keep changes modular, small, and aligned with the existing structure.
- Prefer registries, templates, and theme overrides over hard-coded one-off behavior.
- Treat WP adminOS as the bundled product identity. Polish it with familiar desktop patterns, but do not add a redundant platform clone as a second bundled theme.
- Preserve Classic Admin as a reliable fallback.
- Preserve per-user preferences and per-user/per-theme layout behavior.
- Use WordPress-safe PHP: capability checks, nonces for state changes, sanitization on input, escaping on output.
- Keep readable source assets in `assets/css/` and `assets/js/`; regenerate `assets/dist/` for release assets.
- Update docs when architecture, build behavior, public filters, or extension contracts change.
- Remove replaced code, stale files, unused references, dead branches, and abandoned obsolete paths.
- Run the required validation commands before committing.

Never:

- Do not turn this into a pile of duplicate one-off files.
- Do not leave dead leftover code, unused obsolete modules, stale comments, or unreferenced assets.
- Do not bypass registries for apps, widgets, or themes unless there is a strong architectural reason.
- Do not mix theme-specific styling into core CSS.
- Do not put core behavior into theme files.
- Do not remove or weaken the Classic Admin escape path.
- Do not introduce external dependencies casually.
- Do not ship minified assets without keeping readable source files and source references.
- Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled platform font files. OS theme assets must be original, licensed for redistribution, or otherwise release-safe.
- Do not commit `node_modules/`, `release/`, `.DS_Store`, local credentials, or machine-specific state.

## Directory Map

Root:

- `wp-adminos.php`: plugin header, constants, class loading, singleton bootstrap.
- `README.md`: user-facing plugin/readme documentation.
- `AGENTS.md`: this contributor/agent instruction file.
- `package.json`: build, check, and package scripts.
- `scripts/`: build and packaging tools.
- `assets/dist/`: generated release assets. Do not edit by hand.
- `release/`: generated zip package. Ignored by git.

PHP services in `includes/`:

- `class-wp-adminos-plugin.php`: main orchestrator and WordPress hook wiring.
- `class-wp-adminos-router.php`: mode toggles, shell URL, iframe/classic routing.
- `class-wp-adminos-user-preferences.php`: per-user mode/theme preferences.
- `class-wp-adminos-app-registry.php`: app/folder registry and app normalization.
- `class-wp-adminos-widget-registry.php`: desktop widget registry and widget normalization.
- `class-wp-adminos-widget-layout.php`: shared widget layout attributes for templates.
- `class-wp-adminos-theme-registry.php`: theme family/version/parent inheritance.
- `class-wp-adminos-wallpaper-registry.php`: built-in/theme/upload wallpaper options and CSS-variable resolution.
- `class-wp-adminos-assets.php`: CSS/JS enqueueing and runtime config.
- `class-wp-adminos-shell-renderer.php`: template rendering and theme override resolution.
- `class-wp-adminos-settings-controller.php`: AJAX settings persistence.
- `class-wp-adminos-icon-renderer.php`: icon descriptor normalization and rendering.

Templates in `templates/`:

- `templates/shell/`: shell, menu bar, desktop, dock.
- `templates/windows/`: reusable window chrome.
- `templates/apps/`: native app content.
- `templates/desktop/`: desktop icons and desktop object surfaces.
- `templates/widgets/`: widget layer and widget templates.
- `templates/controls/`: reserved for reusable controls.
- `templates/themes/{theme_id}/...`: theme/version-specific overrides.
- `templates/themes/{family}/...`: OS-family overrides.

CSS:

- `assets/css/core/admin-chrome.css`: WordPress admin chrome suppression.
- `assets/css/core/shell.css`: global shell variables, menu bar, shared primitives.
- `assets/css/core/context-menu.css`: right-click context menu positioning on top of shared menu primitives.
- `assets/css/core/desktop.css`: desktop and desktop icons.
- `assets/css/core/widgets.css`: desktop widgets.
- `assets/css/core/windows.css`: reusable window chrome.
- `assets/css/core/apps.css`: built-in app surfaces.
- `assets/css/core/dock.css`: dock.
- `assets/css/core/responsive.css`: responsive rules.
- `assets/css/themes/{family}/base.css`: theme-family visual base.
- `assets/css/themes/{family}/{version}.css`: theme-version visual skin.

JavaScript:

- `assets/js/core/boot.js`: shell boot order.
- `assets/js/core/config.js`: runtime payload accessor.
- `assets/js/core/dom.js`: shared DOM helpers.
- `assets/js/core/services/`: browser storage and AJAX clients.
- `assets/js/core/session/`: shared workspace session sections.
- `assets/js/core/wallpaper.js`: wallpaper CSS-variable application and preference helpers.
- `assets/js/core/windows/`: windows, window factory, window state serialization.
- `assets/js/core/widgets/`: widget binding, live updates, widget layout persistence.
- `assets/js/core/apps/`: app launcher, reusable app surfaces such as about windows, and native apps.
- `assets/js/core/apps/settings/`: System Settings label normalization, shared UI helpers, and panel factory modules.
- `assets/js/core/shell/`: search, menu bar clock, command registry, top menus, context menus, global shell controls.

Media:

- `assets/media/themes/{family}/{version}/wallpapers/`
- `assets/media/themes/{family}/{version}/icons/`
- `assets/media/themes/{family}/{version}/cursors/`
- `assets/media/shared/icons/`

## Extension Contracts

Apps:

- Register apps through `WP_AdminOS_App_Registry` or the `wp_adminos_apps` filter.
- Apps should define `id`, `label`, `cap`, `group`, `icon`, and either iframe data (`url`) or native data (`kind => native`, `native`).
- Apps may define reusable `about` metadata with `name`, `version`, `copyright`, `rights`, and `icon`; do not hard-code app-specific about windows.
- About metadata must stay GPL-compatible for WordPress distribution. Do not use "All rights reserved" defaults in plugin UI.
- App-specific top menu behavior belongs in the app's `menu` definition, not in hard-coded menu bar conditionals.
- The fixed WP adminOS mark opens the system menu. Do not wire it directly to an app; system-menu items belong in the `menu.system` runtime definition.
- Keep app IDs stable. Layout/session behavior depends on stable IDs.

Menus:

- Menu definitions use the canonical shape `array( 'groups' => array( ... ) )`.
- Each group should define `id`, `label`, and `items`; supported group IDs are `site`, `app`, `file`, `edit`, `view`, `go`, `window`, and `help`.
- Menu command items should define `label` plus optional `command`, `target`, `url`, `title`, `icon`, `shortcut`, `payload`, and `disabled`.
- `shortcut` is executable data, not decorative text. Use macOS-style strings such as `⌘W`, `⌘M`, `⌘H`, `⌥⌘H`, or a structured descriptor with `key`, `modifiers`, `label`, `allowInTextFields`, and `preventDefault`. The keyboard engine lives in `assets/js/core/shell/shortcuts.js`.
- Commands are registered in `assets/js/core/shell/commands.js`; schema normalization is in `assets/js/core/shell/menu-schema.js`; shared menu item rendering is in `assets/js/core/shell/menu-renderer.js`; top menu rendering is in `assets/js/core/shell/menu.js`.
- Context menus are registered and rendered through `assets/js/core/shell/context-menu.js`. Context targets should use stable `data-aos-context` and `data-aos-context-id` attributes rather than one-off event handlers.
- Supported context target types include `desktop`, `app`, `desktop-app`, `dock-app`, `folder`, `desktop-folder`, `window`, and `widget`.
- Context menu providers should compose common command-backed items with target-specific items. Do not add right-click behavior inside dock, desktop, widget, or window modules unless it is exposing target state to the shared context menu system.
- Runtime modules that need custom behavior should register commands through `window.WPAdminOS.menuCommands.register()` after boot, staying inside the `window.WPAdminOS` namespace.
- Dropdown rendering must stay generic and schema-driven. App-specific items belong in app `menu` definitions.
- Do not add app-specific menu conditionals to `templates/shell/menu-bar.php` or the menu renderer. Add command-backed data to the registry/schema instead.
- Keep command IDs stable and generic, such as `open-app`, `open-folder`, `open-url`, `open-about`, `open-system-about`, `open-external-url`, `navigate-url`, `shell.restart`, `shell.switch-classic`, `user.logout`, `session.reset-layout`, `folder.refresh`, `widget.hide`, `window.focus`, `window.focus-id`, `window.close`, `window.minimize`, `window.reload`, `window.history-back`, `window.history-forward`, `window.hide`, `window.hide-others`, `window.show-all`, and `window.toggle-maximize`.

Widgets:

- Register widgets through `WP_AdminOS_Widget_Registry` or the `wp_adminos_widgets` filter.
- Widgets should define `id`, `label`, `cap`, `icon`, `kind`, `native`, `template`, `default_position`, `default_size`, and optional `refresh_interval`.
- Widget `default_position` may use `left` or `right`, plus `top` or `bottom`; use one horizontal anchor and one vertical anchor.
- Keep widget IDs stable. Widget layout persistence depends on stable IDs.
- Add widget templates under `templates/widgets/`.
- Use `WP_AdminOS_Widget_Layout::render_attributes()` for widget positioning and size attributes.
- Use `templates/widgets/generic.php` as the fallback, not as a dumping ground.

Themes:

- Themes are organized by family and version.
- Use parent/child theme inheritance for common theme-family styling.
- Put visual language in theme CSS. Put behavior in core JS/PHP.
- Use theme `shell` metadata for OS-family shell surfaces. Supported fields include `chrome`, `top_bar`, `launcher`, `system_menu`, `app_menu`, `status_area`, and `labels`; these normalize into shell runtime config and shell `data-aos-*` attributes.
- Use theme `window_chrome` metadata for reusable window chrome. Supported fields include `controls.placement`, `controls.order`, `controls.style`, `controls.labels`, `title.alignment`, and `title.show_icon`; do not hard-code family-specific window controls in JS.
- Use theme shell labels for family-specific vocabulary such as Dock versus Taskbar. Do not hard-code launcher labels in settings panels, menus, or context menus when a runtime label exists.
- Use theme `typography` metadata for font stacks, type scale, line heights, weights, and neutral letter spacing. Typography normalizes into shell CSS variables; do not hard-code family-specific fonts or type sizes into component CSS when a token exists.
- Do not bundle Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform font files. Use system font stacks or original/licensed font assets only.
- Declare media through theme fields, not hard-coded paths in templates or app code. Supported fields are `wallpaper`, `wallpapers`, `icon_pack`, and `cursor_pack`; they normalize to local `assets/media/` descriptors with `path` and `url`.
- Use `wallpapers` for a theme-managed wallpaper collection. The canonical shape is `array( 'default' => 'wallpaper-id', 'items' => array( array( 'id' => 'wallpaper-id', 'label' => 'Wallpaper Label', 'path' => 'themes/{family}/{version}/wallpapers/file.jpg' ) ) )`.
- Use `WP_AdminOS_Wallpaper_Registry` for built-in color backgrounds, theme image wallpapers, upload validation, and `--aos-wallpaper-*` CSS-variable resolution. Do not read theme wallpaper URLs directly from templates or app JS.
- Keep OS media original, licensed for redistribution, or otherwise release-safe.
- Template override resolution order is:
  1. `templates/themes/{theme_id}/{template}`
  2. `templates/themes/{family}/{template}`
  3. `templates/{template}`

Icons:

- Dashicon strings are allowed as shorthand.
- Prefer theme descriptors with Dashicon fallbacks for built-in apps, folders, and widgets, so OS icon packs can replace the visual asset without changing registry IDs or app definitions.
- Theme icon files resolve from `theme.media.icon_pack.url`; missing files must fall back cleanly to Dashicons in PHP-rendered and JS-rendered surfaces.
- Prefer normalized descriptors for future flexibility:

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

Session:

- Use `assets/js/core/session/session-store.js` for persisted shell layout.
- Use `assets/js/core/session/reopen-policy.js` for one-time shell reopen behavior; do not clear stored layout just to skip reopening windows for one transition.
- Store layout by named section, such as `windows` and `widgets`.
- Do not overwrite the whole session blob from one module.
- New desktop object types should add their own section instead of hijacking `windows` or `widgets`.

## WordPress Coding Standards

PHP:

- Guard all PHP files with `defined( 'ABSPATH' ) || exit;`.
- Prefix public functions, hooks, filters, and IDs with `wp_adminos` or `WP_AdminOS`.
- Use capabilities before rendering privileged actions or performing mutations.
- Use nonces for AJAX/state-changing requests.
- Sanitize input with WordPress functions such as `sanitize_key`, `sanitize_text_field`, `absint`, and `esc_url_raw`.
- Escape output with `esc_html`, `esc_attr`, `esc_url`, or `wp_json_encode` as appropriate.
- Use translation functions with the `wp-adminos` text domain for user-facing strings.
- Prefer WordPress APIs over raw globals or direct database access.
- Avoid PHP notices/warnings on missing array keys.

JavaScript:

- Keep modules purpose-specific.
- Use existing namespaces under `window.WPAdminOS`.
- Do not create unrelated globals.
- Keep boot wiring in `boot.js`.
- Keep DOM helpers in `dom.js`.
- Keep persistence through `session-store.js` or service modules.
- Avoid browser APIs that break hardened admin/browser contexts unless guarded.

CSS:

- Core CSS defines structural behavior and shared components.
- Theme CSS defines visual skin and OS personality.
- Avoid one-note palettes and unmaintainable selector sprawl.
- Keep selectors semantic and aligned with template structure.
- Do not add visual polish by hard-coding theme-specific values into core component files.

Accessibility:

- Use meaningful labels for shell regions, windows, widgets, and controls.
- Buttons must be real buttons for actions.
- Links must be real links for navigation.
- Keep keyboard and focus behavior in mind when adding controls.

## Build, Check, Package

Install dependencies:

```bash
npm install
```

Build minified release assets:

```bash
npm run build
```

Run local checks:

```bash
npm run check
```

Create release zip:

```bash
npm run package
```

Generated release assets:

- `assets/dist/css/wp-adminos-core.min.css`
- `assets/dist/css/themes/{family}/{version}.min.css`
- `assets/dist/js/wp-adminos.min.js`
- `assets/dist/SOURCES.md`

Do not edit generated dist files by hand. Change source files, then run `npm run build`.

## WordPress Local Validation

Local WordPress path:

```bash
/Users/senolsahin/Sites/new
```

Plugin path:

```bash
/Users/senolsahin/Sites/new/wp-content/plugins/wp-adminos
```

WP-CLI needs the MAMP MySQL socket:

```bash
php -d mysqli.default_socket=/Applications/MAMP/tmp/mysql/mysql.sock /usr/local/bin/wp --path=/Users/senolsahin/Sites/new <command>
```

WP-CLI may print PHP deprecation warnings from WP-CLI internals on newer PHP versions. If the command exits successfully and the warning is from the WP-CLI phar/vendor code, do not treat it as a plugin failure.

Recommended Plugin Check command:

```bash
PLUGIN_DIR=/Users/senolsahin/Sites/new/wp-content/plugins/wp-adminos
find "$PLUGIN_DIR" -name .DS_Store -delete
find "$PLUGIN_DIR" -type d -exec chmod u-w {} +
php -d mysqli.default_socket=/Applications/MAMP/tmp/mysql/mysql.sock /usr/local/bin/wp --path=/Users/senolsahin/Sites/new plugin check wp-adminos --exclude-directories=.github,release,node_modules --exclude-files=.gitignore,.gitattributes,.DS_Store,AGENTS.md
STATUS=$?
find "$PLUGIN_DIR" -type d -exec chmod u+w {} +
find "$PLUGIN_DIR" -name .DS_Store -delete
exit $STATUS
```

Use this pattern because Finder can recreate `.DS_Store`, and Plugin Check should not scan ignored development/release directories.

## Release and GitHub

The GitHub repository is private:

```bash
https://github.com/sensahin/wpadminos.git
```

Before committing:

1. Inspect `git status --short`.
2. Confirm there are no unrelated local changes.
3. Run `npm run check`.
4. Run Plugin Check for meaningful PHP/WordPress changes.
5. Run `npm run package` when source assets or release contents changed.
6. Confirm generated `assets/dist/` changed only because source assets changed.
7. Commit with a clear message.
8. Push to `origin main`.
9. Confirm GitHub Actions CI passes.

## Architecture Standards

When adding a feature, decide where it belongs:

- New shell behavior belongs in `assets/js/core/{domain}/`.
- New PHP data contract belongs in an `includes/` registry/service class.
- New visual component markup belongs in `templates/{domain}/`.
- New core component CSS belongs in `assets/css/core/{domain}.css`.
- New theme-specific skin belongs in `assets/css/themes/{family}/`.
- New image/icon/wallpaper assets belong in `assets/media/`.

Prefer data-driven registration over hard-coded conditionals. If future OS families or versions will need to change something, make it a registry field, theme field, template override, or scoped CSS variable.

## Cleanup Standard

Every change must leave the codebase cleaner or at least no messier.

If you replace a module, remove the old module and update all references.
If you rename a path, update build scripts, enqueue logic, docs, and dist source manifests.
If you remove a feature, remove its CSS, JS, templates, registry entries, and docs.
If a helper is no longer used, delete it.
If a comment describes behavior that changed, update or delete it.

No dead code. No abandoned experiments. No duplicate implementations.

## Process Cleanup

Before finishing a task, stop any long-running process, watcher, local server, browser automation tab, or temporary background job started for that task. Re-check for stale processes when browser automation, dev servers, package scripts, WP-CLI, or visual smoke tests were used. Do not kill unrelated user apps, WordPress/MAMP services, Codex infrastructure, or macOS system services unless the project owner explicitly asks for that specific process to be stopped. Report any process intentionally left running.

## When Unsure

If a change affects routing, saved user layout, theme inheritance, release packaging, security, or WordPress compatibility, stop and inspect the relevant existing classes before editing.

If a quick visual hack would weaken the foundation, do the foundation work first.

If the right direction is unclear, document the tradeoff and ask the project owner before committing a broad architectural change.
