# Context Menu Platform

PufferDesk context menus are a core shell platform feature. Right-click menus and command-button dropdowns must resolve target context centrally, compose menu schema centrally, render through the shared menu renderer, and execute actions through `window.PufferDesk.menuCommands`.

Clipboard items are command-backed transient shell state. Copy payloads expire after 30 minutes, cut payloads expire after 15 minutes, and Refresh commands prune expired or stale clipboard entries before the next context menu render. Workspace reset and full erase actions clear the clipboard explicitly. Context-menu Cut and Paste items are hidden when unavailable instead of rendering as disabled. Inline folder-style context menus hide Cut; other theme families can show Cut where their surface expects it.

## Current Audit

Source scan covered `assets/js/`, `assets/css/`, `templates/`, `includes/`, and existing docs for `contextmenu`, `data-pdk-context`, `pdk-context-menu`, and command-menu creation.

| Area | Target Type | Current Menu Items | Implementation File | Action Handler | Theme Behavior | Risks | Platform Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop background | Background | New Folder, New Sticky Note, Paste when available, Refresh, Sort By, wallpaper/settings/reset; optional structural variants for icon sizing, grid alignment, sort, and personalize actions | `assets/js/core/shell/context-menu.js` | `assets/js/core/shell/commands.js` | Theme CSS skins `data-pdk-context-menu="desktop"`; structural variants use theme-family branches | Theme-family branching still lives in provider data | Centralized |
| Desktop app | Item/app | Copy, Paste, Open, browser tab, add/move to folder, About; Cut appears only outside inline folder-style menus; fixed Trash actions stay command-backed | `assets/js/core/shell/context-menu.js`, `templates/desktop/apps.php` | CommandRegistry | Theme CSS uses `desktop-app`/desktop item state | Trash menu vocabulary remains core provider logic keyed by theme labels | Centralized |
| Desktop folder | Item/folder | Copy, Paste, Open, New Tab, Get Info/Properties, rename/delete for user folders; Cut appears only outside inline folder-style menus | `assets/js/core/shell/context-menu.js`, `templates/desktop/folders.php` | CommandRegistry and folder manager | Folder visual differences flow through theme CSS and surface metadata | Folder mutation availability depends on folder provider state | Centralized |
| Folder background | Background | Inline style: New Folder, New Sticky Note, Paste when available, Get Info, Refresh, View, Sort By. Command-bar style keeps Paste/Refresh before folder actions. | `assets/js/core/shell/context-menu.js`, `assets/js/core/apps/folder-menu-options.js` | CommandRegistry | Menu visuals flow through theme CSS | Empty Trash/folder panes share background context; destructive actions stay commands | Centralized |
| Folder app | Item/app | Copy, Paste, Open, browser tab, remove/move folder membership, add/move to folder, About; Cut appears only outside inline folder-style menus | `assets/js/core/shell/context-menu.js`, `assets/js/core/apps/launcher-renderer.js` | CommandRegistry | Item active state via CSS | Local right-click listener only selects the item before central menu opens | Centralized |
| Folder document | Item/document | Open, Open With when a handler supports the document kind, Paste when available, Move to Trash/Delete, Get Info/Properties, Rename, Copy; Cut appears only outside inline folder-style menus | `assets/js/core/shell/context-menu.js`, `assets/js/core/shell/commands.js`, `assets/js/core/apps/app-launcher.js` | Document commands and clipboard commands | Uses shared menu skin | Rename/Get Info require persisted document IDs; right-click selection is local and intentional | Centralized |
| Trash item | Item/trash-item | Put Back, Delete Immediately | `assets/js/core/shell/context-menu.js`, `assets/js/core/apps/launcher-renderer.js` | CommandRegistry and folder manager | Trash item active state through theme CSS | Local listener prevents native menu and selects item; it does not build menu DOM | Centralized |
| Folder toolbar | Toolbar/background | Icons and Text, Icons Only, Text Only; command-bar dropdowns use action-specific schemas | `assets/js/core/shell/context-menu.js`, `assets/js/core/apps/app-launcher.js` | CommandRegistry | Theme CSS preserves command menu styling | Command groups are still defined in app launcher because they belong to that toolbar's command surface | Centralized rendering/positioning/closing |
| Folder tab | Tab | Close, Close Others, Move Tab to New Window | `assets/js/core/shell/context-menu.js`, `assets/js/core/apps/app-launcher.js` | CommandRegistry | Theme tab menu CSS | Availability depends on current tab strip DOM | Centralized |
| Folder sidebar | Sidebar item | Recents: Open in New Tab, Remove from Sidebar. Favorites/Locations: Open in New Tab, Remove from Sidebar, Get Info | `assets/js/core/shell/context-menu.js`, `assets/js/core/apps/app-launcher.js` | CommandRegistry | Sidebar CSS | Remove is section-aware; fixed Recents/Locations removals persist in folder sidebar workspace state | Centralized |
| Folder window/titlebar | Window titlebar | Bring to Front/Open in Browser Tab/Minimize/Close/About; alternate chrome menus can expose Restore/Move/Size/Minimize/Maximize/Close | `assets/js/core/shell/context-menu.js`, `assets/js/core/windows/window-factory.js` | CommandRegistry and window manager | Window chrome metadata and theme CSS | Root window context suppresses native menu outside titlebar | Centralized |
| Launcher background | Background | Show All, launcher settings | `templates/shell/dock.php`, `assets/js/core/shell/context-menu.js` | CommandRegistry | Launcher CSS via theme data attributes | New platform target; menu is intentionally small | Centralized |
| Launcher item | Item/app | Open/Hide/Quit, browser tab, launcher options, About; Trash open/empty; Sticky Notes offers New Note and Show when hidden notes exist | `templates/shell/dock.php`, `assets/js/core/shell/context-menu.js` | CommandRegistry | Launcher-specific skin and long-press behavior | Long press remains part of central manager because it opens the same menu | Centralized |
| Sound status | Status item | Mute/Unmute, Sound Settings | `assets/js/core/shell/sound-status.js`, `assets/js/core/shell/context-menu.js` | CommandRegistry | Shared popover skin | None known | Centralized |
| Widget | Item/widget | Remove Widget, Edit Widgets... | `templates/widgets/*.php`, `assets/js/core/shell/context-menu.js` | CommandRegistry, widget manager, and Settings panel command | Widget target CSS only | Removing hides the widget from desktop; Settings restores hidden widgets | Centralized |
| Sticky note | Sticky note document object | Open, Open With Sticky Notes, Paste when available, Move to Trash/Delete, Get Info/Properties, Rename, Copy; Cut appears only outside inline folder-style menus; native browser menu in editable content | `assets/js/core/desktop/sticky-notes.js`, `assets/js/core/shell/context-menu.js`, `assets/js/core/shell/commands.js` | Document commands, clipboard commands, and Sticky Notes document service | Sticky note controls editing UI; shell menu uses shared skin outside editable content | Editable content uses `data-pdk-native-context-menu="1"` so text editing keeps native behavior; unsaved transient notes do not expose persisted-document commands | Centralized |
| Future custom modules | Any registered context key | Extension-provided schema | `window.PufferDesk.contextMenus.register()` | CommandRegistry | Theme adapter applies shared data attributes | Extensions must register commands separately | Supported |

## Architecture

The platform keeps the old boot-facing `createContextMenuController()` factory as the compatibility entry point, but the implementation is now split into focused contracts:

- `PufferDesk_Context_Menu_Contracts`: PHP source of truth for context target IDs, area IDs, target types, item types, and context keys; exposed to the browser as `runtime.contracts.contextMenu`.
- `assets/js/core/shell/context-menu-constants.js`: browser accessor for the PHP-provided context-menu contract.
- `assets/js/core/shell/context-menu-resolver.js`: resolves nested right-click targets into a normalized context object with `area`, `targetType`, `targetId`, `containerId`, `itemType`, `theme`, `metadata`, and legacy fields such as `type`, `id`, `app`, `folder`, and `windowElement`.
- `assets/js/core/shell/context-menu-permissions.js`: filters declarative menu items with `visibleWhen`, `enabledWhen`, `requiresPermission`, `requiresFeature`, and `themeSupport`.
- `assets/js/core/shell/context-menu-positioner.js`: positions menus inside shell viewport bounds, including launcher edge placement.
- `assets/js/core/shell/context-menu-keyboard.js`: owns Arrow/Home/End/Enter/Space/Escape behavior and focus movement.
- `assets/js/core/shell/context-menu-theme-adapter.js`: applies theme/context data attributes for CSS presentation only.
- `assets/js/core/shell/context-menu.js`: owns the core registry, manager lifecycle, rendering through `createMenuItemRenderer()`, extension composition, event emission, Dock long-press opening, and command execution handoff.

Document `Open With` menu entries are runtime data under `documents.openWith`. Each handler declares an app/handler ID and supported document kinds; the menu provider turns those handlers into `open-with` command items only for document-like targets. Folder targets do not receive `Open With`.

Themes may style `.pdk-context-menu`, `data-pdk-context-menu`, `data-pdk-context-key`, `data-pdk-context-area`, `data-pdk-context-target-type`, `data-pdk-context-item-type`, and theme-family attributes. Themes must not decide which actions exist or which commands run.

## Extension Contract

Register new menu items by context key:

```js
window.PufferDesk.contextMenus.register('folder.item', {
	id: 'compress',
	label: 'Compress',
	command: 'file.compress',
	visibleWhen: (context) => context.itemType !== 'trash-item',
	enabledWhen: (context) => Boolean(context.targetId),
	order: 80
});
```

Supported keys include current target types such as `desktop.background`, `desktop.item`, `folder.background`, `folder.item`, `folder.toolbar`, `folder.tab`, `folder.sidebar`, `dock.background`, `dock.item`, `window.titlebar`, `widget.item`, and legacy `data-pdk-context` values such as `desktop-app` or `dock-app`. New core code should read these values from `window.PufferDesk.shell.contextMenuConstants` instead of spelling them directly.

Extensions must register their command through `window.PufferDesk.menuCommands.register()` or the Desktop API command facade. Context menu items should not mutate app, folder, widget, or window state directly.

## Event Contract

The manager emits through `window.PufferDesk.events`:

- `contextmenu:resolve`
- `contextmenu:open`
- `contextmenu:render`
- `contextmenu:close`
- `contextmenu:item:hover`
- `contextmenu:item:execute`
- `contextmenu:error`

Handlers receive the normalized `context` in `event.detail.context` when relevant.

## Migration Notes

- Existing shell boot still calls `createContextMenuController()`.
- `window.PufferDesk.contextMenus` exposes `register`, `registerProvider`, `openMenu`, `openForElement`, `close`, `resolve`, and `getActiveContext`.
- The command-bar dropdown no longer creates its own `.pdk-context-menu` DOM. It passes an action-specific schema to the central manager so the manager owns rendering, positioning, keyboard behavior, outside-click close, resize/scroll close, and command execution.
- Local `contextmenu` listeners remain only where they update selection before the central menu opens or intentionally suppress shell menus for window bodies. They do not build menus.
- `data-pdk-context-menu-disabled="1"` remains the central opt-out marker. Editable regions that should keep native browser text menus use `data-pdk-native-context-menu="1"`.

## Reliability Checklist

- Nested elements resolve through `closest('[data-pdk-context]')`.
- Window root contexts only open on titlebar events; non-titlebar window body right-clicks can keep native iframe/content behavior.
- Disabled shell context targets close any active menu and suppress native context menus where appropriate.
- Menus clamp to shell viewport edges.
- Launcher long-press opens the same central launcher item menu.
- Outside pointer down, Escape, resize, and scroll close the active menu.
- Manager binding is guarded against duplicate listeners.
- Menu composition trims empty groups and duplicate separators after permission filtering.
- Command failures remain handled by CommandRegistry; context composition/render failures emit `contextmenu:error`.

## Accessibility Checklist

- Menus use `role="menu"`.
- Menu items use real `button` elements with `role="menuitem"`.
- Separators use `role="separator"`.
- Disabled items set `disabled` and `aria-disabled="true"`.
- Submenus expose `aria-haspopup="menu"` and `aria-expanded`.
- Arrow Up/Down, Home/End, Enter/Space, Escape, and Arrow Left are supported.
- Keyboard-opened toolbar menus can focus the first enabled item without forcing focus for pointer-opened context menus.

## Remaining Risks

- Some desktop and Trash item composition still branches in the core provider because it changes action vocabulary and menu structure, not only CSS. If more theme families need structural variants, move that menu data into theme metadata rather than adding more family conditionals.
- Client-side `requiresPermission` can only evaluate permissions exposed in runtime config. Privileged mutations must continue to enforce WordPress capabilities server-side.
- Local right-click selection listeners are intentionally retained. Removing them would regress multi-select and delete-selected flows because central menu resolution should not own selection state.
