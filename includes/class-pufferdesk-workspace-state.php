<?php
/**
 * Per-user workspace layout state.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Persists theme-scoped workspace layout for a WordPress user.
 */
final class PufferDesk_Workspace_State {
	const META_PREFIX = 'pufferdesk_workspace_state';
	const VERSION     = 4;
	const SECTION_DESKTOP_ICONS = 'desktopIcons';
	const SECTION_DESKTOP_SORT = 'desktopSort';
	const SECTION_DOCK_APPS = 'dockApps';
	const SECTION_FOLDER_DISPLAY = 'folderDisplay';
	const SECTION_FOLDER_SIDEBAR = 'folderSidebar';
	const SECTION_RECENT_ITEMS = 'recentItems';
	const SECTION_SETTINGS_USAGE = 'settingsUsage';
	const SECTION_STICKY_NOTES = 'stickyNotes';
	const SECTION_WIDGETS = 'widgets';
	const SECTION_WINDOWS = 'windows';
	const DESKTOP_ICON_PREFIX_APP = 'app:';
	const DESKTOP_ICON_PREFIX_DOCUMENT = 'document:';
	const DESKTOP_ICON_PREFIX_FOLDER = 'folder:';
	const WINDOW_KIND_APP = 'app';
	const WINDOW_KIND_FOLDER = 'folder';
	const WINDOW_KIND_WINDOW = 'window';

	/**
	 * Build a persisted desktop app icon ID.
	 *
	 * @param string $app_id App ID.
	 * @return string
	 */
	public static function desktop_app_icon_id( $app_id ) {
		return self::DESKTOP_ICON_PREFIX_APP . $app_id;
	}

	/**
	 * Build a persisted desktop folder icon ID.
	 *
	 * @param string $folder_id Folder ID.
	 * @return string
	 */
	public static function desktop_folder_icon_id( $folder_id ) {
		return self::DESKTOP_ICON_PREFIX_FOLDER . $folder_id;
	}

	/**
	 * Build a persisted desktop document icon ID.
	 *
	 * @param int|string $document_id Document ID.
	 * @return string
	 */
	public static function desktop_document_icon_id( $document_id ) {
		return self::DESKTOP_ICON_PREFIX_DOCUMENT . absint( $document_id );
	}

	/**
	 * Get a user's workspace state for a theme.
	 *
	 * @param string                         $theme_id Theme ID.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<int,array<string,mixed>> $widgets Available widgets.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @param int                            $user_id Optional user ID.
	 * @return array<string,mixed>
	 */
	public function get_state( $theme_id, $apps, $widgets, $folders = array(), $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$state   = get_user_meta( $user_id, $this->get_meta_key( $theme_id ), true );

		return $this->sanitize_state( is_array( $state ) ? $state : array(), $apps, $widgets, $folders );
	}

	/**
	 * Save a user's workspace state for a theme.
	 *
	 * @param string                         $theme_id Theme ID.
	 * @param array<string,mixed>            $state Workspace state.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<int,array<string,mixed>> $widgets Available widgets.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @param int                            $user_id Optional user ID.
	 * @param int                            $expected_updated_at Last server revision known to the client.
	 * @return array<string,mixed>|WP_Error
	 */
	public function set_state( $theme_id, $state, $apps, $widgets, $folders = array(), $user_id = 0, $expected_updated_at = 0 ) {
		$user_id             = $user_id ? (int) $user_id : get_current_user_id();
		$current_state       = $this->get_state( $theme_id, $apps, $widgets, $folders, $user_id );
		$current_updated_at  = $this->sanitize_timestamp( isset( $current_state['updatedAt'] ) ? $current_state['updatedAt'] : 0 );
		$expected_updated_at = $this->sanitize_timestamp( $expected_updated_at );

		if ( $expected_updated_at < $current_updated_at ) {
			return new WP_Error(
				'pufferdesk_workspace_conflict',
				__( 'Workspace layout changed in another browser window. The latest layout was kept.', 'pufferdesk-admin-desktop' ),
				array(
					'current_updated_at' => $current_updated_at,
					'status'             => 409,
					'workspace_state'    => $current_state,
				)
			);
		}

		$state              = $this->sanitize_state( is_array( $state ) ? $state : array(), $apps, $widgets, $folders );
		$state['updatedAt'] = max( $this->now_milliseconds(), $current_updated_at + 1 );

		update_user_meta( $user_id, $this->get_meta_key( $theme_id ), $state );

		return $state;
	}

	/**
	 * Delete a user's workspace state for a theme.
	 *
	 * @param string $theme_id Theme ID.
	 * @param int    $user_id Optional user ID.
	 */
	public function delete_state( $theme_id, $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		delete_user_meta( $user_id, $this->get_meta_key( $theme_id ) );
	}

	/**
	 * Delete all PufferDesk workspace state for a user.
	 *
	 * @param int $user_id Optional user ID.
	 * @return int Number of meta keys deleted.
	 */
	public function delete_all_states( $user_id = 0 ) {
		$user_id = $user_id ? (int) $user_id : get_current_user_id();
		$meta    = get_user_meta( $user_id );
		$deleted = 0;

		foreach ( array_keys( $meta ) as $meta_key ) {
			if ( 0 !== strpos( $meta_key, self::META_PREFIX . '_' ) ) {
				continue;
			}

			delete_user_meta( $user_id, $meta_key );
			$deleted++;
		}

		return $deleted;
	}

	/**
	 * Return an empty workspace state.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_default_state() {
		return array(
			'version'      => self::VERSION,
			'updatedAt'    => 0,
			self::SECTION_DOCK_APPS => array(),
			self::SECTION_WINDOWS => array(),
			self::SECTION_WIDGETS => array(),
			self::SECTION_STICKY_NOTES => array(),
			self::SECTION_DESKTOP_ICONS => array(),
			self::SECTION_DESKTOP_SORT => array(
				'iconSize' => 'medium',
				'mode'     => 'none',
			),
			self::SECTION_FOLDER_DISPLAY => array(
				'folders' => array(),
			),
			self::SECTION_FOLDER_SIDEBAR => array(
				'collapsed'          => array(),
				'favoriteIds'        => array(),
				'removedFavoriteIds' => array(),
				'removedItemKeys'    => array(),
			),
			self::SECTION_RECENT_ITEMS => array(),
			self::SECTION_SETTINGS_USAGE => array(
				'panels' => array(),
			),
		);
	}

	/**
	 * Workspace section IDs used by PHP and browser state managers.
	 *
	 * @return array<string,string>
	 */
	public static function get_section_ids() {
		return array(
			'DESKTOP_ICONS'  => self::SECTION_DESKTOP_ICONS,
			'DESKTOP_SORT'   => self::SECTION_DESKTOP_SORT,
			'DOCK_APPS'      => self::SECTION_DOCK_APPS,
			'FOLDER_DISPLAY' => self::SECTION_FOLDER_DISPLAY,
			'FOLDER_SIDEBAR' => self::SECTION_FOLDER_SIDEBAR,
			'RECENT_ITEMS'   => self::SECTION_RECENT_ITEMS,
			'SETTINGS_USAGE' => self::SECTION_SETTINGS_USAGE,
			'STICKY_NOTES'   => self::SECTION_STICKY_NOTES,
			'WIDGETS'        => self::SECTION_WIDGETS,
			'WINDOWS'        => self::SECTION_WINDOWS,
		);
	}

	/**
	 * Persisted window kind IDs used by PHP and browser window managers.
	 *
	 * @return array<string,string>
	 */
	public static function get_window_kind_ids() {
		return array(
			'APP'    => self::WINDOW_KIND_APP,
			'FOLDER' => self::WINDOW_KIND_FOLDER,
			'WINDOW' => self::WINDOW_KIND_WINDOW,
		);
	}

	/**
	 * Sanitize a workspace state payload.
	 *
	 * @param array<string,mixed>            $state Raw state.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<int,array<string,mixed>> $widgets Available widgets.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @return array<string,mixed>
	 */
	public function sanitize_state( $state, $apps, $widgets, $folders = array() ) {
		$default = $this->get_default_state();

		return array(
			'version'      => self::VERSION,
			'updatedAt'    => isset( $state['updatedAt'] ) ? $this->sanitize_timestamp( $state['updatedAt'] ) : $default['updatedAt'],
			self::SECTION_DOCK_APPS => $this->sanitize_dock_apps( isset( $state[ self::SECTION_DOCK_APPS ] ) ? $state[ self::SECTION_DOCK_APPS ] : array(), $apps ),
			self::SECTION_WINDOWS => $this->sanitize_windows( isset( $state[ self::SECTION_WINDOWS ] ) ? $state[ self::SECTION_WINDOWS ] : array(), $apps, $folders ),
			self::SECTION_WIDGETS => $this->sanitize_widgets( isset( $state[ self::SECTION_WIDGETS ] ) ? $state[ self::SECTION_WIDGETS ] : array(), $widgets ),
			self::SECTION_STICKY_NOTES => $this->sanitize_sticky_notes( isset( $state[ self::SECTION_STICKY_NOTES ] ) ? $state[ self::SECTION_STICKY_NOTES ] : array() ),
			self::SECTION_DESKTOP_ICONS => $this->sanitize_desktop_icons( isset( $state[ self::SECTION_DESKTOP_ICONS ] ) ? $state[ self::SECTION_DESKTOP_ICONS ] : array(), $apps, $folders ),
			self::SECTION_DESKTOP_SORT => $this->sanitize_desktop_sort( isset( $state[ self::SECTION_DESKTOP_SORT ] ) ? $state[ self::SECTION_DESKTOP_SORT ] : array() ),
			self::SECTION_FOLDER_DISPLAY => $this->sanitize_folder_display( isset( $state[ self::SECTION_FOLDER_DISPLAY ] ) ? $state[ self::SECTION_FOLDER_DISPLAY ] : array(), $folders ),
			self::SECTION_FOLDER_SIDEBAR => $this->sanitize_folder_sidebar( isset( $state[ self::SECTION_FOLDER_SIDEBAR ] ) ? $state[ self::SECTION_FOLDER_SIDEBAR ] : array(), $folders ),
			self::SECTION_RECENT_ITEMS => $this->sanitize_recent_items( isset( $state[ self::SECTION_RECENT_ITEMS ] ) ? $state[ self::SECTION_RECENT_ITEMS ] : array(), $apps, $folders ),
			self::SECTION_SETTINGS_USAGE => $this->sanitize_settings_usage( isset( $state[ self::SECTION_SETTINGS_USAGE ] ) ? $state[ self::SECTION_SETTINGS_USAGE ] : array() ),
		);
	}

	/**
	 * Build the user meta key for a site/theme scope.
	 *
	 * @param string $theme_id Theme ID.
	 * @return string
	 */
	private function get_meta_key( $theme_id ) {
		$theme_id = sanitize_key( (string) $theme_id );
		$theme_id = '' !== $theme_id ? $theme_id : 'default';

		return self::META_PREFIX . '_' . absint( get_current_blog_id() ) . '_' . $theme_id;
	}

	/**
	 * Order Dock apps from a sanitized workspace state while preserving new apps.
	 *
	 * @param array<int,array<string,mixed>> $apps Apps currently visible in the Dock.
	 * @param array<string,mixed>            $state Workspace state.
	 * @return array<int,array<string,mixed>>
	 */
	public function order_apps_for_dock( $apps, $state ) {
		if ( empty( $apps ) ) {
			return array_values( (array) $apps );
		}

		if ( empty( $state[ self::SECTION_DOCK_APPS ] ) || ! is_array( $state[ self::SECTION_DOCK_APPS ] ) ) {
			return $this->order_fixed_dock_apps_last( $apps );
		}

		$by_id   = array();
		$ordered = array();
		$fixed   = array();

		foreach ( (array) $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) ) {
				continue;
			}

			if ( $this->is_fixed_dock_app( $app ) ) {
				$fixed[] = $app;
				continue;
			}

			$by_id[ sanitize_key( (string) $app['id'] ) ] = $app;
		}

		foreach ( $state[ self::SECTION_DOCK_APPS ] as $app_id ) {
			$app_id = sanitize_key( (string) $app_id );
			if ( ! isset( $by_id[ $app_id ] ) ) {
				continue;
			}

			$ordered[] = $by_id[ $app_id ];
			unset( $by_id[ $app_id ] );
		}

		foreach ( (array) $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) ) {
				continue;
			}

			$app_id = sanitize_key( (string) $app['id'] );
			if ( isset( $by_id[ $app_id ] ) ) {
				$ordered[] = $app;
			}
		}

		return array_merge( $ordered, $fixed );
	}

	/**
	 * Move fixed Dock apps to the end while preserving relative order.
	 *
	 * @param array<int,array<string,mixed>> $apps Apps.
	 * @return array<int,array<string,mixed>>
	 */
	private function order_fixed_dock_apps_last( $apps ) {
		$regular = array();
		$fixed   = array();

		foreach ( (array) $apps as $app ) {
			if ( is_array( $app ) && $this->is_fixed_dock_app( $app ) ) {
				$fixed[] = $app;
			} else {
				$regular[] = $app;
			}
		}

		return array_merge( $regular, $fixed );
	}

	/**
	 * Sanitize window layout records.
	 *
	 * @param mixed                          $windows Raw window records.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_windows( $windows, $apps, $folders = array() ) {
		$available_apps    = $this->get_available_ids( $apps );
		$available_folders = $this->get_available_ids( $folders );
		$sanitized         = array();

		foreach ( is_array( $windows ) ? $windows : array() as $window ) {
			if ( ! is_array( $window ) ) {
				continue;
			}

			$kind      = isset( $window['kind'] ) ? sanitize_key( (string) $window['kind'] ) : self::WINDOW_KIND_APP;
			$app_id    = isset( $window['appId'] ) ? sanitize_key( (string) $window['appId'] ) : '';
			$folder_id = isset( $window['folderId'] ) ? sanitize_key( (string) $window['folderId'] ) : '';
			$state     = $this->sanitize_rect_state(
				isset( $window['state'] ) && is_array( $window['state'] ) ? $window['state'] : array(),
				array(
					'min_width'  => 240,
					'min_height' => 160,
					'z_index'    => true,
					'closed'     => true,
					'maximized'  => true,
				)
			);

			if ( self::WINDOW_KIND_FOLDER === $kind ) {
				if ( ! $this->is_allowed_folder_id( $folder_id, $available_folders ) ) {
					continue;
				}

				$folder_tabs      = $this->sanitize_folder_tabs(
					isset( $window['tabs'] ) ? $window['tabs'] : array(),
					$available_folders
				);
				$active_tab_id    = isset( $window['activeTabId'] ) && is_scalar( $window['activeTabId'] )
					? sanitize_key( (string) $window['activeTabId'] )
					: '';
				$active_tab_id    = $this->sanitize_active_folder_tab_id( $active_tab_id, $folder_tabs );
				$active_tab       = '' !== $active_tab_id ? $this->get_folder_tab_by_id( $folder_tabs, $active_tab_id ) : null;
				$active_folder_id = is_array( $active_tab ) && ! empty( $active_tab['folderId'] ) ? sanitize_key( (string) $active_tab['folderId'] ) : '';

				if ( $this->is_allowed_folder_id( $active_folder_id, $available_folders ) ) {
					$folder_id = $active_folder_id;
				}

				$folder_window = array(
					'kind'     => self::WINDOW_KIND_FOLDER,
					'folderId' => $folder_id,
					'state'    => $state,
				);

				if ( ! empty( $folder_tabs ) ) {
					$folder_window['tabs']        = $folder_tabs;
					$folder_window['activeTabId'] = $active_tab_id;
				}

				$sanitized[] = $folder_window;
			} else {
				if ( ! $this->is_allowed_app_id( $app_id, $available_apps ) ) {
					continue;
				}

				$sanitized[] = array(
					'kind'  => self::WINDOW_KIND_APP,
					'appId' => $app_id,
					'state' => $state,
				);
			}

			if ( count( $sanitized ) >= 80 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize folder tab records inside a folder window.
	 *
	 * @param mixed              $tabs Raw tab records.
	 * @param array<string,bool> $available_folders Available folder IDs.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_folder_tabs( $tabs, $available_folders ) {
		$sanitized = array();
		$seen      = array();

		foreach ( is_array( $tabs ) ? $tabs : array() as $tab ) {
			if ( ! is_array( $tab ) ) {
				continue;
			}

			$tab_id = isset( $tab['id'] ) && is_scalar( $tab['id'] )
				? sanitize_key( (string) $tab['id'] )
				: '';
			if ( '' === $tab_id ) {
				$tab_id = 'folder-tab-' . ( count( $sanitized ) + 1 );
			}

			$base_tab_id = $tab_id;
			$suffix      = 2;
			while ( isset( $seen[ $tab_id ] ) ) {
				$tab_id = $base_tab_id . '-' . $suffix;
				$suffix++;
			}

			$entries = array();
			foreach ( isset( $tab['entries'] ) && is_array( $tab['entries'] ) ? $tab['entries'] : array() as $entry ) {
				if ( ! is_scalar( $entry ) ) {
					continue;
				}

				$entry_id = sanitize_key( (string) $entry );
				if ( ! $this->is_allowed_folder_id( $entry_id, $available_folders ) ) {
					continue;
				}

				$entries[] = $entry_id;
				if ( count( $entries ) >= 80 ) {
					break;
				}
			}

			$folder_id = isset( $tab['folderId'] ) && is_scalar( $tab['folderId'] )
				? sanitize_key( (string) $tab['folderId'] )
				: '';
			$index     = isset( $tab['index'] ) ? $this->sanitize_number( $tab['index'], 0, 79 ) : null;

			if ( empty( $entries ) && $this->is_allowed_folder_id( $folder_id, $available_folders ) ) {
				$entries = array( $folder_id );
				$index   = 0;
			}

			if ( empty( $entries ) ) {
				continue;
			}

			$index = null === $index ? count( $entries ) - 1 : min( $index, count( $entries ) - 1 );
			if ( ! $this->is_allowed_folder_id( $folder_id, $available_folders ) ) {
				$folder_id = $entries[ $index ];
			} elseif ( $entries[ $index ] !== $folder_id ) {
				$entries[ $index ] = $folder_id;
			}

			$sanitized[] = array(
				'id'       => $tab_id,
				'folderId' => $folder_id,
				'entries'  => array_values( $entries ),
				'index'    => $index,
			);
			$seen[ $tab_id ] = true;

			if ( count( $sanitized ) >= 30 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize an active folder tab ID against sanitized tabs.
	 *
	 * @param string                         $tab_id Active tab ID.
	 * @param array<int,array<string,mixed>> $tabs Sanitized tabs.
	 * @return string
	 */
	private function sanitize_active_folder_tab_id( $tab_id, $tabs ) {
		if ( '' !== $tab_id ) {
			foreach ( $tabs as $tab ) {
				if ( isset( $tab['id'] ) && $tab['id'] === $tab_id ) {
					return $tab_id;
				}
			}
		}

		return isset( $tabs[0]['id'] ) ? (string) $tabs[0]['id'] : '';
	}

	/**
	 * Get a sanitized folder tab by ID.
	 *
	 * @param array<int,array<string,mixed>> $tabs Sanitized tabs.
	 * @param string                         $tab_id Tab ID.
	 * @return array<string,mixed>|null
	 */
	private function get_folder_tab_by_id( $tabs, $tab_id ) {
		foreach ( $tabs as $tab ) {
			if ( isset( $tab['id'] ) && $tab['id'] === $tab_id ) {
				return $tab;
			}
		}

		return null;
	}

	/**
	 * Sanitize Dock app order.
	 *
	 * @param mixed                          $dock_apps Raw Dock app IDs.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @return array<int,string>
	 */
	private function sanitize_dock_apps( $dock_apps, $apps ) {
		$available = $this->get_available_ids( $apps );
		$fixed     = $this->get_fixed_dock_app_ids( $apps );
		$sanitized = array();
		$seen      = array();

		foreach ( is_array( $dock_apps ) ? $dock_apps : array() as $app_id ) {
			$app_id = sanitize_key( (string) $app_id );
			if ( '' === $app_id || isset( $seen[ $app_id ] ) || isset( $fixed[ $app_id ] ) || ! $this->is_allowed_app_id( $app_id, $available ) ) {
				continue;
			}

			$sanitized[]     = $app_id;
			$seen[ $app_id ] = true;

			if ( count( $sanitized ) >= 300 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Get IDs for fixed Dock apps.
	 *
	 * @param array<int,array<string,mixed>> $apps Apps.
	 * @return array<string,bool>
	 */
	private function get_fixed_dock_app_ids( $apps ) {
		$fixed = array();

		foreach ( (array) $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) || ! $this->is_fixed_dock_app( $app ) ) {
				continue;
			}

			$fixed[ sanitize_key( (string) $app['id'] ) ] = true;
		}

		return $fixed;
	}

	/**
	 * Determine whether an app has a fixed Dock placement.
	 *
	 * @param array<string,mixed> $app App data.
	 * @return bool
	 */
	private function is_fixed_dock_app( $app ) {
		return is_array( $app )
			&& ! empty( $app['dock'] )
			&& is_array( $app['dock'] )
			&& ! empty( $app['dock']['fixed'] );
	}

	/**
	 * Sanitize widget layout records.
	 *
	 * @param mixed                          $widgets_state Raw widget records.
	 * @param array<int,array<string,mixed>> $widgets Available widgets.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_widgets( $widgets_state, $widgets ) {
		$available = $this->get_available_ids( $widgets );
		$sanitized = array();

		foreach ( is_array( $widgets_state ) ? $widgets_state : array() as $widget ) {
			if ( ! is_array( $widget ) ) {
				continue;
			}

			$id = isset( $widget['id'] ) ? sanitize_key( (string) $widget['id'] ) : '';
			if ( '' === $id || ! isset( $available[ $id ] ) ) {
				continue;
			}

			$sanitized[] = array(
				'id'    => $id,
				'state' => $this->sanitize_rect_state(
					isset( $widget['state'] ) && is_array( $widget['state'] ) ? $widget['state'] : array(),
					array(
						'min_width'  => 80,
						'min_height' => 60,
					)
				),
			);

			if ( count( $sanitized ) >= 50 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize sticky note layout records.
	 *
	 * @param mixed $notes Raw sticky note records.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_sticky_notes( $notes ) {
		$sanitized = array();
		$seen      = array();

		foreach ( is_array( $notes ) ? $notes : array() as $note ) {
			if ( ! is_array( $note ) ) {
				continue;
			}

			$id = isset( $note['id'] ) ? absint( $note['id'] ) : 0;
			if ( $id <= 0 || isset( $seen[ $id ] ) ) {
				continue;
			}

			$raw_note_state = isset( $note['state'] ) && is_array( $note['state'] ) ? $note['state'] : array();
			$note_state     = $this->sanitize_rect_state(
				$raw_note_state,
				array(
					'min_width'  => 180,
					'min_height' => 140,
					'z_index'    => true,
				)
			);
			if ( isset( $raw_note_state['right'] ) && ! isset( $note_state['left'] ) ) {
				$right = $this->sanitize_number( $raw_note_state['right'], 0, 5000 );
				if ( null !== $right ) {
					$note_state['right'] = $right;
				}
			}
			if ( isset( $raw_note_state['expandedHeight'] ) ) {
				$expanded_height = $this->sanitize_number( $raw_note_state['expandedHeight'], 140, 5000 );
				if ( null !== $expanded_height ) {
					$note_state['expandedHeight'] = $expanded_height;
				}
			}
			foreach (
				array(
					'restoreLeft'   => array( 0, 5000 ),
					'restoreTop'    => array( 0, 5000 ),
					'restoreWidth'  => array( 180, 5000 ),
					'restoreHeight' => array( 140, 5000 ),
				) as $restore_key => $limits
			) {
				if ( ! isset( $raw_note_state[ $restore_key ] ) ) {
					continue;
				}

				$restore_value = $this->sanitize_number( $raw_note_state[ $restore_key ], $limits[0], $limits[1] );
				if ( null !== $restore_value ) {
					$note_state[ $restore_key ] = $restore_value;
				}
			}
			$note_state['collapsed']  = ! empty( $raw_note_state['collapsed'] );
			$note_state['fullscreen'] = ! empty( $raw_note_state['fullscreen'] );

			$sanitized[] = array(
				'id'    => $id,
				'state' => $note_state,
			);
			$seen[ $id ] = true;

			if ( count( $sanitized ) >= 100 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize desktop icon layout records.
	 *
	 * @param mixed                          $icons Raw icon records.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_desktop_icons( $icons, $apps, $folders ) {
		$available_apps    = $this->get_available_ids( $apps );
		$available_folders = $this->get_available_ids( $folders );
		$sanitized         = array();
		$seen              = array();

		foreach ( is_array( $icons ) ? $icons : array() as $icon ) {
			if ( ! is_array( $icon ) ) {
				continue;
			}

			$id = isset( $icon['id'] ) ? sanitize_text_field( (string) $icon['id'] ) : '';
			if ( '' === $id || isset( $seen[ $id ] ) || ! $this->is_allowed_desktop_icon_id( $id, $available_apps, $available_folders ) ) {
				continue;
			}

			$kind   = isset( $icon['kind'] ) ? sanitize_key( (string) $icon['kind'] ) : 'item';
			$record = array(
				'id'    => $id,
				'kind'  => in_array( $kind, array( 'app', 'document', 'folder', 'item' ), true ) ? $kind : 'item',
				'state' => $this->sanitize_position_state( isset( $icon['state'] ) && is_array( $icon['state'] ) ? $icon['state'] : array() ),
			);

			if ( 0 === strpos( $id, self::DESKTOP_ICON_PREFIX_APP ) && isset( $icon['label'] ) ) {
				$label = sanitize_text_field( (string) $icon['label'] );
				if ( '' !== $label ) {
					$record['label'] = $label;
				}
			}

			$sanitized[] = $record;
			$seen[ $id ] = true;

			if ( count( $sanitized ) >= 300 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize the desktop sort mode.
	 *
	 * @param mixed $sort Raw sort state.
	 * @return array<string,string>
	 */
	private function sanitize_desktop_sort( $sort ) {
		$mode       = is_array( $sort ) && isset( $sort['mode'] ) ? sanitize_key( (string) $sort['mode'] ) : '';
		$icon_size  = is_array( $sort ) && isset( $sort['iconSize'] ) ? sanitize_key( (string) $sort['iconSize'] ) : '';
		$modes      = array(
			'none',
			'snap-to-grid',
			'name',
			'kind',
			'last-modified-by',
			'date-last-opened',
			'date-added',
			'date-modified',
			'date-created',
			'size',
		);
		$icon_sizes = array(
			'large',
			'medium',
			'small',
		);

		return array(
			'iconSize' => in_array( $icon_size, $icon_sizes, true ) ? $icon_size : 'medium',
			'mode'     => in_array( $mode, $modes, true ) ? $mode : 'none',
		);
	}

	/**
	 * Sanitize per-folder display preferences.
	 *
	 * @param mixed                          $display Raw folder display state.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @return array<string,array<string,array<string,string>>>
	 */
	private function sanitize_folder_display( $display, $folders ) {
		$available_folders = $this->get_available_ids( $folders );
		$state             = is_array( $display ) ? $display : array();
		$folder_records    = isset( $state['folders'] ) && is_array( $state['folders'] ) ? $state['folders'] : array();
		$sanitized         = array();

		foreach ( $folder_records as $folder_id => $record ) {
			$folder_id = sanitize_key( (string) $folder_id );
			if ( '' === $folder_id || ! is_array( $record ) || ! $this->is_allowed_folder_id( $folder_id, $available_folders ) ) {
				continue;
			}

			$sanitized[ $folder_id ] = $this->sanitize_folder_display_record( $record );

			if ( count( $sanitized ) >= 300 ) {
				break;
			}
		}

		return array(
			'folders' => $sanitized,
		);
	}

	/**
	 * Sanitize a single folder display preference record.
	 *
	 * @param array<string,mixed> $record Raw folder display record.
	 * @return array<string,string>
	 */
	private function sanitize_folder_display_record( $record ) {
		$view_mode  = isset( $record['viewMode'] ) ? sanitize_key( (string) $record['viewMode'] ) : '';
		$sort_mode  = isset( $record['sortMode'] ) ? sanitize_key( (string) $record['sortMode'] ) : '';
		$group_mode = isset( $record['groupMode'] ) ? sanitize_key( (string) $record['groupMode'] ) : '';

		$view_modes = array(
			'icons',
			'extra-large-icons',
			'large-icons',
			'medium-icons',
			'small-icons',
			'list',
			'details',
			'tiles',
			'content',
		);
		$sort_modes = array(
			'none',
			'name',
			'kind',
			'date-added',
			'date-modified',
			'size',
		);
		$group_modes = array(
			'none',
			'name',
			'kind',
			'date-added',
			'date-modified',
			'size',
		);

		return array(
			'viewMode'  => in_array( $view_mode, $view_modes, true ) ? $view_mode : 'icons',
			'sortMode'  => in_array( $sort_mode, $sort_modes, true ) ? $sort_mode : 'none',
			'groupMode' => in_array( $group_mode, $group_modes, true ) ? $group_mode : 'none',
		);
	}

	/**
	 * Sanitize Finder-style folder sidebar state.
	 *
	 * @param mixed                          $sidebar Raw sidebar state.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @return array<string,mixed>
	 */
	private function sanitize_folder_sidebar( $sidebar, $folders ) {
		$available_folders = $this->get_available_ids( $folders );
		$state             = is_array( $sidebar ) ? $sidebar : array();
		$collapsed         = array();
		$favorite_ids      = array();
		$removed_ids       = array();
		$removed_item_keys = array();
		$seen_favorites    = array();
		$seen_removed      = array();
		$seen_removed_keys = array();

		foreach ( isset( $state['collapsed'] ) && is_array( $state['collapsed'] ) ? $state['collapsed'] : array() as $section => $value ) {
			$section = sanitize_key( (string) $section );
			if ( in_array( $section, array( 'favorites', 'locations' ), true ) ) {
				$collapsed[ $section ] = (bool) $value;
			}
		}

		foreach ( isset( $state['favoriteIds'] ) && is_array( $state['favoriteIds'] ) ? $state['favoriteIds'] : array() as $folder_id ) {
			$folder_id = sanitize_key( (string) $folder_id );
			if ( ! $this->is_allowed_folder_id( $folder_id, $available_folders ) || isset( $seen_favorites[ $folder_id ] ) ) {
				continue;
			}

			$favorite_ids[]                 = $folder_id;
			$seen_favorites[ $folder_id ] = true;
			if ( count( $favorite_ids ) >= 50 ) {
				break;
			}
		}

		foreach ( isset( $state['removedFavoriteIds'] ) && is_array( $state['removedFavoriteIds'] ) ? $state['removedFavoriteIds'] : array() as $folder_id ) {
			$folder_id = sanitize_key( (string) $folder_id );
			if ( ! $this->is_allowed_folder_id( $folder_id, $available_folders ) || isset( $seen_removed[ $folder_id ] ) ) {
				continue;
			}

			$removed_ids[]              = $folder_id;
			$seen_removed[ $folder_id ] = true;
			if ( count( $removed_ids ) >= 50 ) {
				break;
			}
		}

		foreach ( isset( $state['removedItemKeys'] ) && is_array( $state['removedItemKeys'] ) ? $state['removedItemKeys'] : array() as $item_key ) {
			$item_key = sanitize_text_field( (string) $item_key );
			$parts     = explode( ':', $item_key, 2 );
			$section   = isset( $parts[0] ) ? sanitize_key( (string) $parts[0] ) : '';
			$folder_id = isset( $parts[1] ) ? sanitize_key( (string) $parts[1] ) : '';

			if ( ! in_array( $section, array( 'recents', 'locations' ), true ) || isset( $seen_removed_keys[ $section . ':' . $folder_id ] ) ) {
				continue;
			}

			if ( 'recents' === $section && 'recents' !== $folder_id ) {
				continue;
			}

			if ( 'locations' === $section && ! $this->is_allowed_folder_id( $folder_id, $available_folders ) ) {
				continue;
			}

			$normalized_key                        = $section . ':' . $folder_id;
			$removed_item_keys[]                  = $normalized_key;
			$seen_removed_keys[ $normalized_key ] = true;
			if ( count( $removed_item_keys ) >= 50 ) {
				break;
			}
		}

		return array(
			'collapsed'          => $collapsed,
			'favoriteIds'        => $favorite_ids,
			'removedFavoriteIds' => $removed_ids,
			'removedItemKeys'    => $removed_item_keys,
		);
	}

	/**
	 * Sanitize menu bar recent items.
	 *
	 * @param mixed                          $items Raw recent items.
	 * @param array<int,array<string,mixed>> $apps Available apps.
	 * @param array<int,array<string,mixed>> $folders Available folders.
	 * @return array<int,array<string,mixed>>
	 */
	private function sanitize_recent_items( $items, $apps, $folders ) {
		$available_apps    = $this->get_available_ids( $apps );
		$available_folders = $this->get_available_ids( $folders );
		$sanitized         = array();
		$seen              = array();

		foreach ( is_array( $items ) ? $items : array() as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$type = isset( $item['type'] ) ? sanitize_key( (string) $item['type'] ) : 'app';
			$id   = isset( $item['id'] ) ? sanitize_text_field( (string) $item['id'] ) : '';
			if ( '' === $id || isset( $seen[ $type . ':' . $id ] ) ) {
				continue;
			}

			if ( 'app' === $type && ! $this->is_allowed_app_id( sanitize_key( $id ), $available_apps ) ) {
				continue;
			}

			if ( 'folder' === $type && ! $this->is_allowed_folder_id( sanitize_key( $id ), $available_folders ) ) {
				continue;
			}

			if ( 'document' === $type && empty( $item['url'] ) && ! preg_match( '/\d+$/', $id ) ) {
				continue;
			}

			if ( ! in_array( $type, array( 'app', 'folder', 'document' ), true ) ) {
				continue;
			}

			$label = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
			if ( '' === $label ) {
				continue;
			}

			$url         = isset( $item['url'] ) ? esc_url_raw( (string) $item['url'] ) : '';
			$sanitized[] = array(
				'command' => $this->sanitize_recent_command( isset( $item['command'] ) ? $item['command'] : '', $type ),
				'icon'    => $this->sanitize_recent_icon( isset( $item['icon'] ) ? $item['icon'] : '' ),
				'id'      => $id,
				'label'   => $label,
				'target'  => isset( $item['target'] ) ? sanitize_text_field( (string) $item['target'] ) : $id,
				'title'   => isset( $item['title'] ) ? sanitize_text_field( (string) $item['title'] ) : $label,
				'type'    => $type,
				'url'     => $url,
			);
			$seen[ $type . ':' . $id ] = true;

			if ( count( $sanitized ) >= 50 ) {
				break;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize Settings panel usage records.
	 *
	 * @param mixed $usage Raw usage payload.
	 * @return array<string,array<string,array<string,int>>>
	 */
	private function sanitize_settings_usage( $usage ) {
		$panels = array();
		$raw    = is_array( $usage ) && isset( $usage['panels'] ) && is_array( $usage['panels'] ) ? $usage['panels'] : array();

		foreach ( $raw as $panel_id => $record ) {
			$panel_id = sanitize_key( (string) $panel_id );
			if ( '' === $panel_id || ! is_array( $record ) ) {
				continue;
			}

			$count           = isset( $record['count'] ) ? $this->sanitize_number( $record['count'], 0, 9999 ) : 0;
			$last_visited_at = isset( $record['lastVisitedAt'] ) ? $this->sanitize_timestamp( $record['lastVisitedAt'] ) : 0;

			if ( ! $count && ! $last_visited_at ) {
				continue;
			}

			$panels[ $panel_id ] = array(
				'count'         => null === $count ? 0 : $count,
				'lastVisitedAt' => $last_visited_at,
			);

			if ( count( $panels ) >= 50 ) {
				break;
			}
		}

		return array(
			'panels' => $panels,
		);
	}

	/**
	 * Sanitize rectangular layout state.
	 *
	 * @param array<string,mixed> $state Raw state.
	 * @param array<string,mixed> $options Sanitizer options.
	 * @return array<string,mixed>
	 */
	private function sanitize_rect_state( $state, $options = array() ) {
		$sanitized = $this->sanitize_position_state( $state );
		$width     = isset( $state['width'] ) ? $this->sanitize_number( $state['width'], 0, 5000 ) : null;
		$height    = isset( $state['height'] ) ? $this->sanitize_number( $state['height'], 0, 5000 ) : null;

		if ( null !== $width ) {
			$sanitized['width'] = max( isset( $options['min_width'] ) ? (int) $options['min_width'] : 0, $width );
		}

		if ( null !== $height ) {
			$sanitized['height'] = max( isset( $options['min_height'] ) ? (int) $options['min_height'] : 0, $height );
		}

		if ( ! empty( $options['z_index'] ) && isset( $state['zIndex'] ) ) {
			$z_index = $this->sanitize_number( $state['zIndex'], 0, 100000 );
			if ( null !== $z_index ) {
				$sanitized['zIndex'] = $z_index;
			}
		}

		$sanitized['hidden'] = ! empty( $state['hidden'] );

		if ( ! empty( $options['closed'] ) ) {
			$sanitized['closed'] = ! empty( $state['closed'] );
		}

		if ( ! empty( $options['maximized'] ) ) {
			$sanitized['maximized'] = ! empty( $state['maximized'] );
		}

		return $sanitized;
	}

	/**
	 * Sanitize a positional state.
	 *
	 * @param array<string,mixed> $state Raw state.
	 * @return array<string,int>
	 */
	private function sanitize_position_state( $state ) {
		$sanitized = array();
		$left      = isset( $state['left'] ) ? $this->sanitize_number( $state['left'], 0, 5000 ) : null;
		$top       = isset( $state['top'] ) ? $this->sanitize_number( $state['top'], 0, 5000 ) : null;

		if ( null !== $left ) {
			$sanitized['left'] = $left;
		}

		if ( null !== $top ) {
			$sanitized['top'] = $top;
		}

		return $sanitized;
	}

	/**
	 * Sanitize a numeric layout value.
	 *
	 * @param mixed $value Raw value.
	 * @param int   $min Minimum.
	 * @param int   $max Maximum.
	 * @return int|null
	 */
	private function sanitize_number( $value, $min, $max ) {
		if ( ! is_numeric( $value ) ) {
			return null;
		}

		return max( $min, min( $max, (int) round( (float) $value ) ) );
	}

	/**
	 * Sanitize a JavaScript millisecond timestamp.
	 *
	 * @param mixed $value Raw value.
	 * @return int
	 */
	private function sanitize_timestamp( $value ) {
		if ( ! is_numeric( $value ) ) {
			return 0;
		}

		return max( 0, min( PHP_INT_MAX, (int) round( (float) $value ) ) );
	}

	/**
	 * Get available registry IDs.
	 *
	 * @param array<int,array<string,mixed>> $items Registry items.
	 * @return array<string,bool>
	 */
	private function get_available_ids( $items ) {
		$available = array();

		foreach ( (array) $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) ) {
				continue;
			}

			$available[ sanitize_key( (string) $item['id'] ) ] = true;
		}

		return $available;
	}

	/**
	 * Whether an app ID can be preserved in workspace state.
	 *
	 * @param string             $app_id App ID.
	 * @param array<string,bool> $available Available app IDs.
	 * @return bool
	 */
	private function is_allowed_app_id( $app_id, $available ) {
		if ( '' === $app_id ) {
			return false;
		}

		return isset( $available[ $app_id ] ) || $this->is_deferred_app_id( $app_id );
	}

	/**
	 * Whether a folder ID can be preserved in workspace state.
	 *
	 * @param string             $folder_id Folder ID.
	 * @param array<string,bool> $available Available folder IDs.
	 * @return bool
	 */
	private function is_allowed_folder_id( $folder_id, $available ) {
		return '' !== $folder_id && ( isset( $available[ $folder_id ] ) || strlen( $folder_id ) <= 120 );
	}

	/**
	 * Whether a desktop icon ID can be preserved.
	 *
	 * @param string             $icon_id Icon ID.
	 * @param array<string,bool> $available_apps Available app IDs.
	 * @param array<string,bool> $available_folders Available folder IDs.
	 * @return bool
	 */
	private function is_allowed_desktop_icon_id( $icon_id, $available_apps, $available_folders ) {
		if ( 0 === strpos( $icon_id, self::DESKTOP_ICON_PREFIX_APP ) ) {
			return $this->is_allowed_app_id( sanitize_key( substr( $icon_id, strlen( self::DESKTOP_ICON_PREFIX_APP ) ) ), $available_apps );
		}

		if ( 0 === strpos( $icon_id, self::DESKTOP_ICON_PREFIX_FOLDER ) ) {
			return $this->is_allowed_folder_id( sanitize_key( substr( $icon_id, strlen( self::DESKTOP_ICON_PREFIX_FOLDER ) ) ), $available_folders );
		}

		if ( 0 === strpos( $icon_id, self::DESKTOP_ICON_PREFIX_DOCUMENT ) ) {
			return absint( substr( $icon_id, strlen( self::DESKTOP_ICON_PREFIX_DOCUMENT ) ) ) > 0;
		}

		return strlen( $icon_id ) <= 140;
	}

	/**
	 * Whether an app ID may be absent from an AJAX-time registry.
	 *
	 * @param string $app_id App ID.
	 * @return bool
	 */
	private function is_deferred_app_id( $app_id ) {
		return strlen( $app_id ) <= 120 && 0 === strpos( $app_id, 'wp-admin-' );
	}

	/**
	 * Sanitize a recent item command.
	 *
	 * @param mixed  $command Raw command.
	 * @param string $type Recent item type.
	 * @return string
	 */
	private function sanitize_recent_command( $command, $type ) {
		$command = strtolower( preg_replace( '/[^a-z0-9_.-]/', '', (string) $command ) );
		$allowed = array(
			PufferDesk_Command_Ids::DOCUMENT_OPEN,
			PufferDesk_Command_Ids::OPEN_APP,
			PufferDesk_Command_Ids::OPEN_FOLDER,
			PufferDesk_Command_Ids::OPEN_URL,
		);

		if ( in_array( $command, $allowed, true ) ) {
			return $command;
		}

		if ( 'folder' === $type ) {
			return PufferDesk_Command_Ids::OPEN_FOLDER;
		}

		if ( 'document' === $type ) {
			return PufferDesk_Command_Ids::OPEN_URL;
		}

		return PufferDesk_Command_Ids::OPEN_APP;
	}

	/**
	 * Sanitize a recent item icon descriptor without losing arrays.
	 *
	 * @param mixed $icon Raw icon.
	 * @return mixed
	 */
	private function sanitize_recent_icon( $icon ) {
		if ( is_array( $icon ) ) {
			return PufferDesk_Icon_Renderer::normalize( $icon );
		}

		return is_scalar( $icon ) ? sanitize_text_field( (string) $icon ) : '';
	}

	/**
	 * Current time in JavaScript-compatible milliseconds.
	 *
	 * @return int
	 */
	private function now_milliseconds() {
		return (int) round( microtime( true ) * 1000 );
	}
}
