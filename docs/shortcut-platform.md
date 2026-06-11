# Shortcut Platform

PufferDesk keyboard shortcuts are a core shell platform feature. Feature shortcuts must register declarative shortcut definitions and execute commands through `window.PufferDesk.menuCommands` or the Desktop API command facade. Do not add component-owned `keydown` listeners for app, window, folder, desktop, or settings commands.

Local keyboard handlers are still appropriate for focused component behavior such as menu arrow navigation, dialog Escape handling, inline rename Enter/Escape, and text input editing. Those handlers must not duplicate command shortcuts.

## Architecture

- `ShortcutManager` owns the single document-level shortcut listener.
- `ShortcutRegistry` stores default and custom shortcut definitions as separate layers.
- `ShortcutResolver` maps the active key combo and context to a command item.
- `ShortcutConflictChecker` blocks duplicate or browser-reserved shortcut registrations and reports risky conflicts.
- `ShortcutSettings` stores future user-custom shortcut definitions separately from defaults and can restore defaults.
- `CommandRegistry` remains the only place that executes feature behavior.

The implementation lives in `assets/js/core/shell/shortcuts.js` and is exposed through `window.PufferDesk.shortcuts` plus the boot-facing `window.PufferDesk.shell.createShortcutController()`.

## Shortcut Shape

Use platform-aware modifiers:

```js
{
	id: 'settings.open',
	label: 'System Settings',
	command: commandIds.OPEN_APP,
	combo: 'primary+,',
	contexts: ['global'],
	target: appIds.OS_SETTINGS,
	preventDefault: true
}
```

`primary` resolves to Cmd on macOS and Ctrl on Windows/Linux. `secondary` resolves to Option/Alt. Explicit `ctrl`, `meta`, `alt`, and `shift` are available when a shortcut intentionally needs that exact modifier.

Shortcut descriptors may also use:

- `keys: ['primary', ',']`
- `macCombo`, `winCombo`, or `linuxCombo` for platform-specific exceptions
- `allowInTextFields` for intentional input-focused shortcuts such as Text Editor save
- `allowReserved` and `reservedReason` only when a normally risky shortcut is intentionally scoped and documented
- `enabledWhen(ctx)` for runtime availability checks

## Contexts

Supported contexts are:

- `global`
- `desktop`
- `window`
- `folder`
- `folder-tab`
- `modal`
- `input-focused`
- `command-palette`

The resolver never intercepts normal text editing shortcuts while focus is inside an input, textarea, select, contenteditable element, or textbox unless the shortcut explicitly opts into `allowInTextFields` or the `input-focused` context.

## Reserved Shortcuts

The conflict checker blocks common browser and OS shortcuts such as browser reload, location bar, new tab, print, browser history navigation, private window, reopened tab, DevTools, and unscoped primary+W. Scoped `primary+W` is allowed for PufferDesk windows or folder tabs. `primary+S` is only allowed where intentionally handled, currently the native Text Editor save command.

When a module registers a duplicate combo in an overlapping context, the registry reports the conflict and does not override the existing command.

## Adding Shortcuts

1. Add or reuse a stable command ID in `PufferDesk_Command_Ids`.
2. Register command behavior through `assets/js/core/shell/commands.js`, `window.PufferDesk.menuCommands.register()`, or the Desktop API command facade.
3. Add shortcut data to the default shortcut list, a menu item descriptor, or a future custom shortcut settings payload.
4. Use `primary` and `secondary` unless an exact physical modifier is required.
5. Keep browser-reserved shortcuts unregistered unless the shortcut is intentionally scoped and documented.
