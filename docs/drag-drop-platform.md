# Drag/drop platform

PufferDesk treats drag/drop as a core platform service. UI modules may own pointer tracking, drag proxies, and visual feedback, but move rules and state changes must go through the central drag/drop stack.

## Core modules

- `assets/js/core/drag-drop/constants.js`: stable item types, container IDs, container prefixes, target aliases, and move reasons.
- `assets/js/core/drag-drop/item-model.js`: canonical item, container, position, and move request normalization.
- `assets/js/core/drag-drop/draggable-registry.js`: compatibility adapter from existing desktop/folder DOM markers into normalized item models.
- `assets/js/core/drag-drop/drop-target-registry.js`: registered and dynamically resolved drop containers.
- `assets/js/core/drag-drop/move-state-store.js`: bridge to existing state owners such as `folder-manager`, `desktop-icons`, launcher sidebar state, and workspace state.
- `assets/js/core/drag-drop/move-validator.js`: move rules for app/folder items, valid containers, duplicate prevention, locked/system items, Trash handling, and folder nesting.
- `assets/js/core/drag-drop/move-service.js`: authoritative move execution and platform events.
- `assets/js/core/drag-drop/drag-drop-manager.js`: public drag lifecycle and compatibility entry point for UI adapters.

## Current behavior matrix

| Source | Target | Item type | Previous implementation | Works | Duplicated | Theme-specific | Persistence | Core migration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop | Desktop position/reorder | app, folder | `assets/js/core/desktop/desktop-icons.js` | Yes | No | No | `workspaceState.desktopIcons`, `desktopSort` | Lifecycle events only; geometry remains in desktop adapter |
| Desktop | User folder icon/window pane/sidebar folder | app, folder | `desktop-icons.js`, boot callbacks, `folder-manager.js` | Yes | Yes | No | `desktopFolders`, `desktopIcons` | Migrated to `DragDropManager` + `MoveService` |
| Folder pane | Desktop | app, folder | `assets/js/core/apps/app-launcher.js`, `folder-manager.js` | Yes for persisted user-folder membership | Yes | No | `desktopFolders`, `desktopIcons` | Migrated to `DragDropManager` + `MoveService` |
| Folder pane | User folder | app, folder | `app-launcher.js`, `folder-manager.js` | Yes | Yes | No | `desktopFolders` | Migrated to `DragDropManager` + `MoveService` |
| Folder pane | Folder sidebar Favorites | folder | `app-launcher.js` | Yes | Yes | No | `workspaceState.folderSidebar` | Migrated to `DragDropManager` + `MoveService` |
| Sidebar folder item | Folder pane/folder icon | folder | Not a persisted drag source today | No | No | No | N/A | Container model supports future adapter |
| Dock/taskbar | Dock/taskbar reorder | app | `assets/js/core/preferences/desktop-dock.js` | Yes | Separate domain | No | app location preferences | Left as specialized launcher ordering until app-location moves are migrated |
| Trash command | Trash | folder | `assets/js/core/shell/commands.js`, `folder-manager.js` | Yes by command/context menu | No | Confirmation policy is theme metadata only | `desktopTrash` | Trash registered as a distinct container; generic Trash-as-parent drops are blocked |

Window dragging, widget dragging, split-sidebar resizing, and sticky note movement are not content move flows. They remain in their owning managers because they do not move registered items between containers.

## Item model

Every movable item is normalized before validation:

```js
{
	id,
	type,
	label,
	icon,
	sourceContainerId,
	currentContainerId,
	allowedDropTargets,
	metadata
}
```

Supported drag/drop item types are currently `app` and `folder`. Clipboard commands can cut/copy/paste documents and sticky notes through `assets/js/core/services/clipboard-service.js` and the document service, but that does not make documents draggable platform items. Documents and Trash records still need their own drag/drop persistence contract before becoming movable through `MoveService`.

## Container model

Every drop target resolves to a normalized container:

```js
{
	id,
	type,
	accepts(item, move),
	canMoveOut(item, move),
	canReorder,
	canContainFolders,
	maxDepth,
	persistence,
	metadata
}
```

Canonical container IDs include `desktop`, `folder:<folder-id>`, `folder-sidebar:favorites`, `dock`, and `trash`.

## Events

The platform emits these stable events through `window.PufferDesk.events`:

- `drag:start`
- `drag:hover`
- `drag:leave`
- `drag:cancel`
- `drop:validate`
- `item:move:start`
- `item:move:success`
- `item:move:error`
- `item:move:rollback`
- `desktop:layout:changed`
- `folder:contents:changed`

UI adapters should listen to events or call `window.PufferDesk.dragDrop.manager`; they should not duplicate move rules.

## Validation rules

The central validator prevents:

- Unknown or unsupported item types.
- Drops to unregistered containers.
- Moving locked/system folders except adding valid folders to sidebar Favorites.
- Using Trash as a folder parent.
- Moving a folder into itself or a descendant.
- Moving an app to a folder that already contains it.
- Moving an app to desktop when it is already desktop-visible.
- App drops into system folders that do not own user folder membership persistence.

## Migration status

The current compatibility layer keeps existing pointer/proxy behavior in `desktop-icons.js` and `app-launcher.js`, but delegates validation and move execution to the core stack. Future migrations should move Dock/app-location reordering and any new content object types through the same `MoveService.moveItem()` contract once their persistence strategies are explicit.
