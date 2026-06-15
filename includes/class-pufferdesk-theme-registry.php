<?php
/**
 * Theme registry.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns shell theme metadata and lookup.
 */
final class PufferDesk_Theme_Registry {
	/**
	 * Get all registered themes.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public function get_themes() {
		$themes = array(
			'pufferdesk-base' => array(
				'id'             => 'pufferdesk-base',
				'label'          => __( 'PufferDesk Base', 'pufferdesk' ),
				'family'         => 'default',
				'family_label'   => __( 'Default', 'pufferdesk' ),
				'version'        => 'base',
				'version_label'  => __( 'Base', 'pufferdesk' ),
				'typography'     => $this->get_default_typography_config(),
				'tokens'         => array(),
				'shell'          => $this->get_default_shell_config(),
				'dialogs'        => $this->get_default_dialog_config(),
				'documents'      => $this->get_default_document_config(),
				'window_chrome'  => $this->get_default_window_chrome_config(),
				'abstract'       => true,
			),
			'default' => array(
				'id'             => 'default',
				'label'          => __( 'Default', 'pufferdesk' ),
				'family'         => 'default',
				'family_label'   => __( 'Default', 'pufferdesk' ),
				'version'        => 'default',
				'version_label'  => __( 'Default', 'pufferdesk' ),
				'parent'         => 'pufferdesk-base',
				'stylesheet'     => 'default/default.css',
				'media'          => array(
					'wallpapers'  => array(
						'default' => 'aurora-flow',
					),
					'icon_pack'   => 'shared/icons/theme',
				),
				'public'         => true,
				'typography'     => array(
					'fonts' => array(
						'ui'      => 'system-ui, "Helvetica Neue", Arial, sans-serif',
						'display' => 'system-ui, "Helvetica Neue", Arial, sans-serif',
						'mono'    => 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
					),
					'scale' => array(
						'menu'             => '13px',
						'body'             => '13px',
						'control'          => '14px',
						'context_menu'     => '13px',
						'label'            => '15px',
						'settings_body'    => '12px',
						'settings_label'   => '13px',
						'settings_heading' => '15px',
						'settings_title'   => '19px',
						'heading'          => '21px',
						'display_title'    => '30px',
						'widget_clock'     => '32px',
					),
					'line_heights' => array(
						'body'    => '1.35',
						'display' => '1.1',
					),
					'weights' => array(
						'heading' => '650',
						'display' => '720',
					),
				),
				'tokens'         => array(
					'radius' => array(
						'window'           => '12px',
						'window_maximized' => '0',
						'menu_popover'     => '12px',
					),
				),
				'documents'      => array(
					'stickyNoteSavePolicy' => 'ask-on-first-save',
				),
				'surfaces'       => array(
					'settings' => 'pufferdesk-hub',
					'folder'   => 'pufferdesk-files',
				),
				'shell'          => array(
					'default_app_location'     => PufferDesk_User_Preferences::APP_LOCATION_HIDDEN,
					'default_plugin_app_limit' => 5,
					'default_app_locations'    => array(
						PufferDesk_App_Ids::DASHBOARD    => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::POSTS        => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::PAGES        => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::MEDIA        => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::COMMENTS     => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::PLUGINS      => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::SETTINGS     => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::STICKY_NOTES => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
						PufferDesk_App_Ids::OS_SETTINGS  => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
					),
					'labels'                   => array(
						'launcher'             => __( 'Launcher', 'pufferdesk' ),
						'desktop_launcher'     => __( 'Desktop & Launcher', 'pufferdesk' ),
						'launcher_and_desktop' => __( 'Launcher & Desktop', 'pufferdesk' ),
						'launcher_position'    => __( 'Launcher position on screen', 'pufferdesk' ),
						'auto_hide_launcher'   => __( 'Automatically hide the launcher', 'pufferdesk' ),
						'launcher_options'     => __( 'Launcher Options', 'pufferdesk' ),
						'keep_in_launcher'     => __( 'Keep in Launcher', 'pufferdesk' ),
						'remove_from_launcher' => __( 'Remove from Launcher', 'pufferdesk' ),
						'open_at_login'        => __( 'Open at startup', 'pufferdesk' ),
						'minimize_animation_genie' => __( 'Drift', 'pufferdesk' ),
						'minimize_animation_scale' => __( 'Scale', 'pufferdesk' ),
						'menu_bar'             => __( 'Top Bar', 'pufferdesk' ),
						'menu_bar_background'  => __( 'Show top bar background', 'pufferdesk' ),
					),
				),
				'window_chrome'  => array(
					'controls' => array(
						'placement' => PufferDesk_Window_Chrome_Contracts::PLACEMENT_RIGHT,
						'order'     => array( PufferDesk_Window_Chrome_Contracts::CONTROL_MINIMIZE, PufferDesk_Window_Chrome_Contracts::CONTROL_MAXIMIZE, PufferDesk_Window_Chrome_Contracts::CONTROL_CLOSE ),
						'style'     => PufferDesk_Window_Chrome_Contracts::STYLE_TOOLBAR,
					),
					'title'    => array(
						'alignment' => PufferDesk_Window_Chrome_Contracts::TITLE_ALIGNMENT_LEFT,
						'show_icon' => true,
					),
				),
				'menu'           => array(
					'labels' => array(
						'get_info'  => __( 'Details', 'pufferdesk' ),
						'recents'   => __( 'Recent', 'pufferdesk' ),
						'favorites' => __( 'Pinned', 'pufferdesk' ),
						'locations' => __( 'Places', 'pufferdesk' ),
						'sort_kind' => __( 'Type', 'pufferdesk' ),
						'type'      => __( 'Type', 'pufferdesk' ),
					),
				),
				'info_panel'     => array(
					'labels' => array(
						'accessLabel'               => __( 'Visibility', 'pufferdesk' ),
						'createdLabel'              => __( 'Added', 'pufferdesk' ),
						/* translators: %s: item name. */
						'documentInfoTitle'         => __( '%s Details', 'pufferdesk' ),
						/* translators: %s: folder name. */
						'folderInfoTitle'           => __( '%s Details', 'pufferdesk' ),
						'generalSection'            => __( 'Overview', 'pufferdesk' ),
						'infoFallbackTitle'         => __( 'Details', 'pufferdesk' ),
						'kindLabel'                 => __( 'Item type', 'pufferdesk' ),
						'lastOpenedLabel'           => __( 'Last opened', 'pufferdesk' ),
						'locationLabel'             => __( 'Path', 'pufferdesk' ),
						'modifiedLabel'             => __( 'Updated', 'pufferdesk' ),
						/* translators: %s: formatted modified date. */
						'modifiedTemplate'          => __( 'Updated %s', 'pufferdesk' ),
						'moreInfoLabel'             => __( 'Open details', 'pufferdesk' ),
						'moreInfoSection'           => __( 'Activity', 'pufferdesk' ),
						'nameSection'               => __( 'Name', 'pufferdesk' ),
						'previewSection'            => __( 'Preview', 'pufferdesk' ),
						'privateUserAccess'         => __( 'Only visible in this WordPress account', 'pufferdesk' ),
						'sharingPermissionsSection' => __( 'Visibility', 'pufferdesk' ),
						'siteHealthInfoTitle'       => __( 'Site diagnostics', 'pufferdesk' ),
						'sourceLabel'               => __( 'Provider', 'pufferdesk' ),
						'typeLabel'                 => __( 'Item type', 'pufferdesk' ),
						'whereLabel'                => __( 'Path', 'pufferdesk' ),
					),
				),
			),
		);

		/**
		 * Filter PufferDesk themes.
		 *
		 * Theme keys are stable IDs. Values accept:
		 * id, label, family, family_label, version, version_label, parent,
		 * stylesheet, stylesheets, media, wallpaper, wallpapers, icon_pack,
		 * cursor_pack, app_labels, typography, tokens, mode_tokens, shell, menu, sounds,
		 * surfaces, window_chrome, abstract, and public.
		 *
		 * @param array<string,array<string,mixed>> $themes Registered themes.
		 */
		$themes = apply_filters( 'pufferdesk_themes', $themes );

		return $this->normalize_themes( $themes );
	}

	/**
	 * Get the current user's theme.
	 *
	 * @param PufferDesk_User_Preferences $preferences User preferences.
	 * @return array<string,mixed>
	 */
	public function get_current_theme( PufferDesk_User_Preferences $preferences ) {
		$themes   = $this->get_themes();
		$theme_id = $preferences->get_theme_id( $themes );
		if (
			empty( $themes[ $theme_id ] )
			|| ! empty( $themes[ $theme_id ]['abstract'] )
		) {
			$theme_id = $this->get_default_selectable_theme_id( $themes );
		}

		return $this->resolve_theme( $theme_id, $themes );
	}

	/**
	 * Get user-selectable themes for the settings UI.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_selectable_themes() {
		$themes  = $this->get_themes();
		$options = array();

		foreach ( $themes as $id => $theme ) {
			if ( ! empty( $theme['abstract'] ) || empty( $theme['public'] ) ) {
				continue;
			}

			$resolved  = $this->resolve_theme( $id, $themes );
			$options[] = array(
				'id'            => $resolved['id'],
				'label'         => $resolved['label'],
				'family'        => $resolved['family'],
				'family_label'  => $resolved['family_label'],
				'version'       => $resolved['version'],
				'version_label' => $resolved['version_label'],
				'parent'        => $resolved['parent'],
				'ancestors'     => $resolved['ancestors'],
				'media'         => $resolved['media'],
				'typography'    => $resolved['typography'],
				'shell'         => $resolved['shell'],
				'dialogs'       => $resolved['dialogs'],
				'documents'     => $resolved['documents'],
				'surfaces'      => $resolved['surfaces'],
				'settings'      => $resolved['settings'],
				'window_chrome' => $resolved['window_chrome'],
				'public'        => $resolved['public'],
			);
		}

		return $options;
	}

	/**
	 * Apply theme-specific app display labels without changing stable app IDs.
	 *
	 * @param array<int,array<string,mixed>> $apps  Registered apps.
	 * @param array<string,mixed>            $theme Resolved theme.
	 * @return array<int,array<string,mixed>>
	 */
	public function apply_app_labels( $apps, $theme = array() ) {
		if ( ! is_array( $apps ) ) {
			return array();
		}

		$labels = isset( $theme['app_labels'] ) && is_array( $theme['app_labels'] ) ? $theme['app_labels'] : array();
		if ( empty( $labels ) ) {
			return $apps;
		}

		return array_map(
			static function ( $app ) use ( $labels ) {
				if ( ! is_array( $app ) || empty( $app['id'] ) ) {
					return $app;
				}

				$app_id = sanitize_key( (string) $app['id'] );
				if ( isset( $labels[ $app_id ] ) && is_string( $labels[ $app_id ] ) && '' !== $labels[ $app_id ] ) {
					$app['label'] = $labels[ $app_id ];
				}

				return $app;
			},
			$apps
		);
	}

	/**
	 * Normalize theme data.
	 *
	 * @param mixed $themes Raw theme data.
	 * @return array<string,array<string,mixed>>
	 */
	private function normalize_themes( $themes ) {
		$normalized = array();

		if ( ! is_array( $themes ) ) {
			return $normalized;
		}

		foreach ( $themes as $id => $theme ) {
			if ( ! is_array( $theme ) ) {
				continue;
			}

			$id = ! empty( $theme['id'] ) ? sanitize_key( $theme['id'] ) : sanitize_key( $id );
			if ( '' === $id ) {
				continue;
			}

			$normalized[ $id ] = array(
				'id'             => $id,
				'label'          => isset( $theme['label'] ) ? sanitize_text_field( $theme['label'] ) : $id,
				'family'         => isset( $theme['family'] ) ? sanitize_key( $theme['family'] ) : '',
				'family_label'   => isset( $theme['family_label'] ) ? sanitize_text_field( $theme['family_label'] ) : '',
				'version'        => isset( $theme['version'] ) ? sanitize_text_field( $theme['version'] ) : '',
				'version_label'  => isset( $theme['version_label'] ) ? sanitize_text_field( $theme['version_label'] ) : '',
				'parent'         => isset( $theme['parent'] ) ? sanitize_key( $theme['parent'] ) : '',
				'stylesheets'    => $this->normalize_stylesheets( $theme ),
				'media'          => $this->normalize_media( $theme ),
				'app_labels'     => $this->normalize_string_map( isset( $theme['app_labels'] ) ? $theme['app_labels'] : array() ),
				'typography'     => $this->normalize_typography_config( isset( $theme['typography'] ) ? $theme['typography'] : array() ),
				'tokens'         => $this->normalize_token_config( isset( $theme['tokens'] ) ? $theme['tokens'] : array() ),
				'mode_tokens'    => $this->normalize_mode_token_config( isset( $theme['mode_tokens'] ) ? $theme['mode_tokens'] : array() ),
				'shell'          => $this->normalize_shell_config( isset( $theme['shell'] ) ? $theme['shell'] : array() ),
				'menu'           => $this->normalize_menu_config( isset( $theme['menu'] ) ? $theme['menu'] : array() ),
				'info_panel'     => $this->normalize_info_panel_config( isset( $theme['info_panel'] ) ? $theme['info_panel'] : array() ),
				'dialogs'        => $this->normalize_dialog_config( isset( $theme['dialogs'] ) ? $theme['dialogs'] : array() ),
				'documents'      => $this->normalize_document_config( isset( $theme['documents'] ) ? $theme['documents'] : array() ),
				'sounds'         => $this->normalize_sound_config( isset( $theme['sounds'] ) ? $theme['sounds'] : array() ),
				'surfaces'       => $this->normalize_surface_config( isset( $theme['surfaces'] ) ? $theme['surfaces'] : array() ),
				'settings'       => $this->normalize_settings_config( isset( $theme['settings'] ) ? $theme['settings'] : array() ),
				'window_chrome'  => $this->normalize_window_chrome_config( isset( $theme['window_chrome'] ) ? $theme['window_chrome'] : array() ),
				'abstract'       => ! empty( $theme['abstract'] ),
				'public'         => array_key_exists( 'public', $theme ) ? ! empty( $theme['public'] ) : empty( $theme['abstract'] ),
			);
		}

		return $normalized;
	}

	/**
	 * Resolve a theme and its parent chain into one asset stack.
	 *
	 * @param string                            $theme_id Theme ID.
	 * @param array<string,array<string,mixed>> $themes Registered themes.
	 * @param array<string,bool>                $seen IDs already visited.
	 * @return array<string,mixed>
	 */
	private function resolve_theme( $theme_id, $themes, $seen = array() ) {
		if ( empty( $themes[ $theme_id ] ) ) {
			$theme_id = $this->get_default_selectable_theme_id( $themes );
		}

		$theme = $themes[ $theme_id ];
		if ( isset( $seen[ $theme_id ] ) ) {
			return $this->complete_standalone_theme( $theme );
		}

		$seen[ $theme_id ] = true;
		$parent_id         = isset( $theme['parent'] ) ? $theme['parent'] : '';
		if ( '' === $parent_id || empty( $themes[ $parent_id ] ) ) {
			return $this->complete_standalone_theme( $theme );
		}

		$parent = $this->resolve_theme( $parent_id, $themes, $seen );

		$theme['family']           = $theme['family'] ? $theme['family'] : $parent['family'];
		$theme['family_label']     = $theme['family_label'] ? $theme['family_label'] : $parent['family_label'];
		$theme['media']            = $this->merge_media( $parent['media'], $theme['media'] );
		$theme['app_labels']       = $this->merge_theme_config( $parent['app_labels'], $theme['app_labels'] );
		$theme['typography']       = $this->complete_typography_config( $this->merge_theme_config( $parent['typography'], $theme['typography'] ) );
		$theme['tokens']           = $this->complete_token_config( $this->merge_theme_config( $parent['tokens'], $theme['tokens'] ) );
		$theme['mode_tokens']      = $this->complete_mode_token_config( $this->merge_theme_config( $parent['mode_tokens'], $theme['mode_tokens'] ) );
		$theme['shell']            = $this->complete_shell_config( $this->merge_theme_config( $parent['shell'], $theme['shell'] ) );
		$theme['menu']             = $this->complete_menu_config( $this->merge_theme_config( $parent['menu'], $theme['menu'] ) );
		$theme['info_panel']       = $this->merge_theme_config( $parent['info_panel'], $theme['info_panel'] );
		$theme['dialogs']          = $this->complete_dialog_config( $this->merge_theme_config( $parent['dialogs'], $theme['dialogs'] ) );
		$theme['documents']        = $this->complete_document_config( $this->merge_theme_config( $parent['documents'], $theme['documents'] ) );
		$theme['sounds']           = $this->complete_sound_config( $this->merge_theme_config( $parent['sounds'], $theme['sounds'] ) );
		$theme['surfaces']         = $this->complete_surface_config( $this->merge_theme_config( $parent['surfaces'], $theme['surfaces'] ) );
		$theme['settings']         = $this->complete_settings_config( $this->merge_theme_config( $parent['settings'], $theme['settings'] ) );
		$theme['window_chrome']    = $this->complete_window_chrome_config( $this->merge_theme_config( $parent['window_chrome'], $theme['window_chrome'] ) );
		$theme['stylesheet_stack']  = array_values( array_unique( array_merge( $parent['stylesheet_stack'], $theme['stylesheets'] ) ) );
		$theme['ancestors']         = array_merge( $parent['ancestors'], array( $parent['id'] ) );

		return $theme;
	}

	/**
	 * Complete a theme that has no usable parent theme.
	 *
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<string,mixed>
	 */
	private function complete_standalone_theme( $theme ) {
		$theme['stylesheet_stack'] = isset( $theme['stylesheets'] ) && is_array( $theme['stylesheets'] ) ? $theme['stylesheets'] : array();
		$theme['ancestors']        = array();
		$theme['typography']       = $this->complete_typography_config( isset( $theme['typography'] ) ? $theme['typography'] : array() );
		$theme['tokens']           = $this->complete_token_config( isset( $theme['tokens'] ) ? $theme['tokens'] : array() );
		$theme['mode_tokens']      = $this->complete_mode_token_config( isset( $theme['mode_tokens'] ) ? $theme['mode_tokens'] : array() );
		$theme['shell']            = $this->complete_shell_config( isset( $theme['shell'] ) ? $theme['shell'] : array() );
		$theme['menu']             = $this->complete_menu_config( isset( $theme['menu'] ) ? $theme['menu'] : array() );
		$theme['info_panel']       = isset( $theme['info_panel'] ) && is_array( $theme['info_panel'] ) ? $theme['info_panel'] : array();
		$theme['dialogs']          = $this->complete_dialog_config( isset( $theme['dialogs'] ) ? $theme['dialogs'] : array() );
		$theme['documents']        = $this->complete_document_config( isset( $theme['documents'] ) ? $theme['documents'] : array() );
		$theme['sounds']           = $this->complete_sound_config( isset( $theme['sounds'] ) ? $theme['sounds'] : array() );
		$theme['surfaces']         = $this->complete_surface_config( isset( $theme['surfaces'] ) ? $theme['surfaces'] : array() );
		$theme['settings']         = $this->complete_settings_config( isset( $theme['settings'] ) ? $theme['settings'] : array() );
		$theme['window_chrome']    = $this->complete_window_chrome_config( isset( $theme['window_chrome'] ) ? $theme['window_chrome'] : array() );

		return $theme;
	}

	/**
	 * Get the first non-abstract theme.
	 *
	 * @param array<string,array<string,mixed>> $themes Registered themes.
	 * @return string
	 */
	private function get_default_selectable_theme_id( $themes ) {
		if ( isset( $themes[ PufferDesk_User_Preferences::THEME_MODE_DEFAULT ] ) && empty( $themes[ PufferDesk_User_Preferences::THEME_MODE_DEFAULT ]['abstract'] ) ) {
			return PufferDesk_User_Preferences::THEME_MODE_DEFAULT;
		}

		foreach ( $themes as $id => $theme ) {
			if ( empty( $theme['abstract'] ) && ! empty( $theme['public'] ) ) {
				return $id;
			}
		}

		foreach ( $themes as $id => $theme ) {
			if ( empty( $theme['abstract'] ) ) {
				return $id;
			}
		}

		return key( $themes );
	}

	/**
	 * Normalize stylesheet paths. Nested paths under assets/css/themes are allowed.
	 *
	 * @param array<string,mixed> $theme Raw theme data.
	 * @return string[]
	 */
	private function normalize_stylesheets( $theme ) {
		$stylesheets = array();

		if ( ! empty( $theme['stylesheet'] ) ) {
			$stylesheets[] = $theme['stylesheet'];
		}

		if ( ! empty( $theme['stylesheets'] ) && is_array( $theme['stylesheets'] ) ) {
			$stylesheets = array_merge( $stylesheets, $theme['stylesheets'] );
		}

		$normalized = array();
		foreach ( $stylesheets as $stylesheet ) {
			$path = $this->sanitize_stylesheet_path( $stylesheet );
			if ( '' !== $path ) {
				$normalized[] = $path;
			}
		}

		return array_values( array_unique( $normalized ) );
	}

	/**
	 * Normalize theme media fields into local asset descriptors.
	 *
	 * @param array<string,mixed> $theme Raw theme data.
	 * @return array<string,array<mixed>>
	 */
	private function normalize_media( $theme ) {
		$media = isset( $theme['media'] ) && is_array( $theme['media'] ) ? $theme['media'] : array();

		foreach ( array( 'wallpaper', 'icon_pack', 'cursor_pack' ) as $field ) {
			if ( array_key_exists( $field, $theme ) ) {
				$media[ $field ] = $theme[ $field ];
			}
		}

		return array(
			'wallpaper'   => $this->normalize_media_file( isset( $media['wallpaper'] ) ? $media['wallpaper'] : '' ),
			'wallpapers'  => $this->normalize_wallpapers( isset( $media['wallpapers'] ) ? $media['wallpapers'] : array(), isset( $media['wallpaper'] ) ? $media['wallpaper'] : '' ),
			'icon_pack'   => $this->normalize_media_directory( isset( $media['icon_pack'] ) ? $media['icon_pack'] : '' ),
			'cursor_pack' => $this->normalize_media_directory( isset( $media['cursor_pack'] ) ? $media['cursor_pack'] : '' ),
		);
	}

	/**
	 * Merge parent and child media descriptors.
	 *
	 * Empty child descriptors inherit parent descriptors.
	 *
	 * @param array<string,array<mixed>> $parent Parent media.
	 * @param array<string,array<mixed>> $child Child media.
	 * @return array<string,array<mixed>>
	 */
	private function merge_media( $parent, $child ) {
		$merged = $child;

		foreach ( array( 'wallpaper', 'icon_pack', 'cursor_pack' ) as $field ) {
			if ( empty( $merged[ $field ]['path'] ) && ! empty( $parent[ $field ] ) ) {
				$merged[ $field ] = $parent[ $field ];
			}
		}

		if ( ! empty( $parent['wallpapers']['items'] ) || ! empty( $child['wallpapers']['items'] ) ) {
			$wallpapers = array();
			foreach ( array( $parent, $child ) as $source ) {
				if ( empty( $source['wallpapers']['items'] ) || ! is_array( $source['wallpapers']['items'] ) ) {
					continue;
				}

				foreach ( $source['wallpapers']['items'] as $item ) {
					if ( ! empty( $item['id'] ) ) {
						$wallpapers[ $item['id'] ] = $item;
					}
				}
			}

			$merged['wallpapers'] = array(
				'default' => ! empty( $child['wallpapers']['default'] ) ? $child['wallpapers']['default'] : ( isset( $parent['wallpapers']['default'] ) ? $parent['wallpapers']['default'] : '' ),
				'items'   => array_values( $wallpapers ),
			);
		}

		return $merged;
	}

	/**
	 * Default typography contract for themes.
	 *
	 * @return array<string,mixed>
	 */
	private function get_default_typography_config() {
		return array(
			'fonts'          => array(
				'ui'      => 'system-ui, "Helvetica Neue", Arial, sans-serif',
				'display' => 'system-ui, "Helvetica Neue", Arial, sans-serif',
				'mono'    => 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
			),
			'scale'          => array(
				'micro'          => '10px',
				'small'          => '11px',
				'fine_print'     => '9px',
				'footer'         => '10.5px',
				'meta'           => '11.5px',
				'caption'        => '12px',
				'menu'           => '13px',
				'body'           => '13px',
				'control'        => '14px',
				'dialog_title'   => '15px',
				'context_menu'   => '16px',
				'context_menu_shortcut' => '18px',
				'label'          => '17px',
				'section_title'  => '18px',
				'settings_caption' => '10px',
				'settings_body'  => '11px',
				'settings_label' => '12.5px',
				'settings_heading' => '13.5px',
				'settings_title' => '16px',
				'profile_title'  => '21px',
				'heading'        => '23px',
				'about_title'    => '25px',
				'stat_value'     => '24px',
				'display_title'  => '34px',
				'avatar'         => '36px',
				'widget_clock'   => '34px',
			),
			'line_heights'   => array(
				'tight'   => '1',
				'caption' => '1.2',
				'body'    => '1.25',
				'display' => '1.05',
			),
			'weights'        => array(
				'regular'      => '400',
				'fine_print'   => '430',
				'meta'         => '450',
				'medium'       => '500',
				'semibold'     => '600',
				'strong'       => '620',
				'bold'         => '700',
				'heading'      => '650',
				'display'      => '700',
				'widget_clock' => '620',
			),
			'letter_spacing' => array(
				'default' => '0',
				'tight'   => '0',
			),
		);
	}

	/**
	 * Normalize a theme typography contract.
	 *
	 * @param mixed $typography Raw typography config.
	 * @return array<string,mixed>
	 */
	private function normalize_typography_config( $typography ) {
		if ( ! is_array( $typography ) ) {
			return array();
		}

		return array_filter(
			array(
				'fonts'          => $this->normalize_font_stack_map(
					isset( $typography['fonts'] ) ? $typography['fonts'] : array(),
					array( 'ui', 'display', 'mono' )
				),
				'scale'          => $this->normalize_css_length_map(
					isset( $typography['scale'] ) ? $typography['scale'] : array(),
					array( 'micro', 'small', 'fine_print', 'footer', 'meta', 'caption', 'menu', 'body', 'control', 'dialog_title', 'context_menu', 'context_menu_shortcut', 'label', 'section_title', 'settings_caption', 'settings_body', 'settings_label', 'settings_heading', 'settings_title', 'profile_title', 'heading', 'about_title', 'stat_value', 'display_title', 'avatar', 'widget_clock' )
				),
				'line_heights'   => $this->normalize_line_height_map(
					isset( $typography['line_heights'] ) ? $typography['line_heights'] : array(),
					array( 'tight', 'caption', 'body', 'display' )
				),
				'weights'        => $this->normalize_font_weight_map(
					isset( $typography['weights'] ) ? $typography['weights'] : array(),
					array( 'regular', 'fine_print', 'meta', 'medium', 'semibold', 'strong', 'bold', 'heading', 'display', 'widget_clock' )
				),
				'letter_spacing' => $this->normalize_letter_spacing_map(
					isset( $typography['letter_spacing'] ) ? $typography['letter_spacing'] : array(),
					array( 'default', 'tight' )
				),
			)
		);
	}

	/**
	 * Apply defaults to a typography config.
	 *
	 * @param mixed $typography Typography config.
	 * @return array<string,mixed>
	 */
	private function complete_typography_config( $typography ) {
		return $this->merge_theme_config(
			$this->get_default_typography_config(),
			is_array( $typography ) ? $typography : array()
		);
	}

	/**
	 * Normalize a theme design token contract.
	 *
	 * @param mixed $tokens Raw token config.
	 * @return array<string,array<string,string>>
	 */
	private function normalize_token_config( $tokens ) {
		if ( ! is_array( $tokens ) ) {
			return array();
		}

		$allowed = $this->get_token_keys();
		$normalized = array();

		foreach ( $allowed as $section => $keys ) {
			if ( empty( $tokens[ $section ] ) || ! is_array( $tokens[ $section ] ) ) {
				continue;
			}

			$section_tokens = $this->normalize_css_token_map( $tokens[ $section ], $keys );
			if ( ! empty( $section_tokens ) ) {
				$normalized[ $section ] = $section_tokens;
			}
		}

		return $normalized;
	}

	/**
	 * Complete a token config.
	 *
	 * Tokens are intentionally additive. Missing token values must not be filled
	 * from generic defaults because emitted shell inline styles override concrete
	 * theme CSS variables such as dark-mode colors and window radius.
	 *
	 * @param mixed $tokens Token config.
	 * @return array<string,array<string,string>>
	 */
	private function complete_token_config( $tokens ) {
		return is_array( $tokens ) ? $tokens : array();
	}

	/**
	 * Normalize light/dark theme design token contracts.
	 *
	 * @param mixed $tokens Raw mode token config.
	 * @return array<string,array<string,array<string,string>>>
	 */
	private function normalize_mode_token_config( $tokens ) {
		$normalized = array();

		if ( ! is_array( $tokens ) ) {
			return $normalized;
		}

		foreach ( array( 'light', 'dark' ) as $mode ) {
			if ( empty( $tokens[ $mode ] ) || ! is_array( $tokens[ $mode ] ) ) {
				continue;
			}

			$mode_tokens = $this->normalize_token_config( $tokens[ $mode ] );
			if ( ! empty( $mode_tokens ) ) {
				$normalized[ $mode ] = $mode_tokens;
			}
		}

		return $normalized;
	}

	/**
	 * Complete a mode token config.
	 *
	 * Mode tokens are also additive so dark/light CSS can keep local overrides
	 * until a surface is intentionally moved to token metadata.
	 *
	 * @param mixed $tokens Mode token config.
	 * @return array<string,array<string,array<string,string>>>
	 */
	private function complete_mode_token_config( $tokens ) {
		return is_array( $tokens ) ? $tokens : array();
	}

	/**
	 * Allowed token keys by section.
	 *
	 * @return array<string,string[]>
	 */
	private function get_token_keys() {
		return array(
			'color'    => array( 'ink', 'muted', 'desktop_bg', 'accent', 'accent_ink', 'highlight' ),
			'material' => array( 'clear_bg', 'clear_border', 'clear_filter', 'clear_shadow', 'regular_bg', 'regular_border', 'regular_filter', 'regular_shadow', 'tinted_bg', 'tinted_border', 'solid_bg', 'solid_border', 'card_shadow', 'control_bg', 'control_hover_bg', 'control_active_bg', 'control_border', 'control_filter', 'bar_bg', 'bar_border', 'bar_filter', 'bar_shadow', 'popover_bg', 'popover_border', 'popover_filter', 'popover_shadow', 'dialog_bg', 'dialog_border', 'dialog_filter', 'dialog_shadow' ),
			'spacing'  => array( 'window_safe_edge', 'dock_screen_edge', 'dock_hover_lift', 'dock_icon_size', 'dock_item_size', 'dock_tile_size', 'scrollbar_size', 'app_badge_size', 'app_badge_padding_x', 'app_badge_max_width' ),
			'radius'   => array( 'window', 'window_maximized', 'menu_popover' ),
			'border'   => array( 'line', 'window_bar', 'tile', 'dock' ),
			'shadow'   => array( 'default', 'card', 'dialog', 'menu_popover' ),
			'context_menu' => array( 'bg', 'border', 'filter', 'shadow', 'radius', 'ink', 'muted', 'separator', 'hover_bg', 'hover_ink', 'disabled', 'selection_bg', 'selection_border', 'selection_shadow', 'sheen', 'sheen_opacity', 'padding', 'item_radius', 'item_height', 'item_gap', 'item_padding_x', 'icon_size', 'separator_margin' ),
			'settings_surface' => array( 'window_bg', 'body_bg', 'main_bg', 'card_bg', 'card_border', 'sidebar_bg', 'sidebar_border', 'sidebar_filter', 'sidebar_shadow', 'sidebar_radius', 'sidebar_reflection_filter', 'sidebar_reflection_mask', 'sidebar_reflection_opacity', 'sidebar_gloss', 'search_bg', 'search_border', 'search_shadow', 'search_filter', 'control_radius', 'section_bg', 'section_hover_bg', 'section_active_bg', 'sidebar_active_bg', 'sidebar_active_ink', 'sidebar_hover_bg', 'titlebar_bg', 'titlebar_back_disabled' ),
			'window_chrome' => array( 'surface_bg', 'surface_border', 'surface_shadow', 'bar_bg', 'bar_border', 'regular_bg', 'regular_border', 'regular_filter', 'regular_shadow', 'liquid_window_bg', 'liquid_window_border', 'liquid_window_filter', 'liquid_window_shadow', 'folder_window_border', 'folder_window_shadow', 'file_explorer_window_radius' ),
			'explorer' => array( 'surface_bg', 'titlebar_bg', 'toolbar_bg', 'addressbar_bg', 'command_bg', 'sidebar_bg', 'sidebar_border', 'sidebar_heading', 'sidebar_selected_bg', 'sidebar_selected_border', 'row_hover_bg', 'field_bg', 'field_border', 'search_bg', 'hover_bg', 'selection_bg', 'selection_border', 'tab_bg', 'tab_inactive_bg', 'tab_border', 'tab_shadow', 'statusbar_bg', 'finder_divider', 'finder_sidebar_active_bg', 'finder_sidebar_active_ink', 'finder_tabbar_bg', 'finder_tabbar_border', 'finder_tab_bg', 'finder_tab_hover_bg', 'finder_tab_active_bg', 'finder_tab_active_border', 'finder_tab_close_bg', 'finder_tab_close_hover_bg', 'finder_tab_add_bg', 'finder_tab_add_hover_bg', 'finder_tab_add_border' ),
		);
	}

	/**
	 * Normalize a CSS token map.
	 *
	 * @param mixed    $values Raw token map.
	 * @param string[] $allowed_keys Allowed keys.
	 * @return array<string,string>
	 */
	private function normalize_css_token_map( $values, $allowed_keys ) {
		$normalized = array();
		if ( ! is_array( $values ) ) {
			return $normalized;
		}

		foreach ( $values as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$value = $this->sanitize_css_token_value( $value );
			if ( '' !== $value ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Sanitize a single CSS token value.
	 *
	 * @param mixed $value Raw token value.
	 * @return string
	 */
	private function sanitize_css_token_value( $value ) {
		$value = trim( wp_strip_all_tags( (string) $value ) );
		$value = preg_replace( '/\s+/', ' ', $value );
		$value = is_string( $value ) ? $value : '';

		if ( '' === $value || preg_match( '/[;{}<>]/', $value ) || preg_match( '/(?:url|expression)\s*\(/i', $value ) ) {
			return '';
		}

		return $value;
	}

	/**
	 * Normalize font family stacks.
	 *
	 * @param mixed    $fonts Raw font stack map.
	 * @param string[] $allowed_keys Allowed keys.
	 * @return array<string,string>
	 */
	private function normalize_font_stack_map( $fonts, $allowed_keys ) {
		$normalized = array();
		if ( ! is_array( $fonts ) ) {
			return $normalized;
		}

		foreach ( $fonts as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$value = trim( (string) $value );
			if ( $this->is_safe_font_stack( $value ) ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize CSS length values.
	 *
	 * @param mixed    $values Raw value map.
	 * @param string[] $allowed_keys Allowed keys.
	 * @param bool     $allow_zero_unitless Whether unitless zero is allowed.
	 * @return array<string,string>
	 */
	private function normalize_css_length_map( $values, $allowed_keys, $allow_zero_unitless = false ) {
		$normalized = array();
		if ( ! is_array( $values ) ) {
			return $normalized;
		}

		foreach ( $values as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$value = $this->sanitize_css_length_value( $value, $allow_zero_unitless );
			if ( '' !== $value ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize line-height values.
	 *
	 * @param mixed    $values Raw value map.
	 * @param string[] $allowed_keys Allowed keys.
	 * @return array<string,string>
	 */
	private function normalize_line_height_map( $values, $allowed_keys ) {
		$normalized = array();
		if ( ! is_array( $values ) ) {
			return $normalized;
		}

		foreach ( $values as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$value = trim( (string) $value );
			if ( preg_match( '/^(?:[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?(?:px|rem|em|%)|normal)$/', $value ) ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize letter spacing values.
	 *
	 * @param mixed    $values Raw value map.
	 * @param string[] $allowed_keys Allowed keys.
	 * @return array<string,string>
	 */
	private function normalize_letter_spacing_map( $values, $allowed_keys ) {
		$normalized = array();
		if ( ! is_array( $values ) ) {
			return $normalized;
		}

		foreach ( $values as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$value = trim( (string) $value );
			if ( in_array( $value, array( '0', '0px', '0em', '0rem' ), true ) ) {
				$normalized[ $key ] = '0';
			}
		}

		return $normalized;
	}

	/**
	 * Normalize font weight values.
	 *
	 * @param mixed    $values Raw value map.
	 * @param string[] $allowed_keys Allowed keys.
	 * @return array<string,string>
	 */
	private function normalize_font_weight_map( $values, $allowed_keys ) {
		$normalized = array();
		if ( ! is_array( $values ) ) {
			return $normalized;
		}

		foreach ( $values as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$value = trim( (string) $value );
			if ( preg_match( '/^(?:[1-9][0-9]{0,2}|1000|normal|bold|bolder|lighter)$/', $value ) ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Validate a CSS font-family stack without accepting external CSS.
	 *
	 * @param string $value Raw font stack.
	 * @return bool
	 */
	private function is_safe_font_stack( $value ) {
		if ( '' === $value || strlen( $value ) > 260 ) {
			return false;
		}

		if ( preg_match( '/[;{}<>\\\\]|url\s*\(|@import|expression\s*\(/i', $value ) ) {
			return false;
		}

		return (bool) preg_match( '/^[a-z0-9\s,._"\'-]+$/i', $value );
	}

	/**
	 * Sanitize a CSS length value.
	 *
	 * @param mixed $value Raw value.
	 * @param bool  $allow_zero_unitless Whether unitless zero is allowed.
	 * @return string
	 */
	private function sanitize_css_length_value( $value, $allow_zero_unitless = false ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return '';
		}

		if ( $allow_zero_unitless && '0' === $value ) {
			return '0';
		}

		if ( ! preg_match( '/^[0-9]+(?:\.[0-9]+)?(?:px|rem|em|%)$/', $value ) ) {
			return '';
		}

		return $value;
	}

	/**
	 * Default shell surface contract for themes.
	 *
	 * @return array<string,mixed>
	 */
	private function get_default_shell_config() {
		return array(
			'chrome'              => 'global-menu-dock',
			'top_bar'             => 'menu-bar',
			'launcher'            => 'dock',
			'system_menu'         => 'mark',
			'app_menu'            => 'global',
			'status_area'         => 'menu-bar',
			'launcher_search'     => false,
			'system_menu_icon'    => 'pufferdesk-mark',
			'launcher_separator'  => true,
			'default_app_location' => PufferDesk_User_Preferences::APP_LOCATION_DOCK,
			'default_app_locations' => array(),
			'fixed_app_locations' => array(),
			'labels'              => array(
				'launcher'             => __( 'Launcher', 'pufferdesk' ),
				'desktop_launcher'     => __( 'Desktop & Launcher', 'pufferdesk' ),
				'launcher_and_desktop' => __( 'Launcher & Desktop', 'pufferdesk' ),
				'launcher_position'    => __( 'Launcher position on screen', 'pufferdesk' ),
				'auto_hide_launcher'   => __( 'Automatically hide the launcher', 'pufferdesk' ),
				'launcher_options'     => __( 'Launcher Options', 'pufferdesk' ),
				'start'                => __( 'Start', 'pufferdesk' ),
				'open_start'           => __( 'Open Start', 'pufferdesk' ),
				'search'               => __( 'Search', 'pufferdesk' ),
				'search_apps'          => __( 'Search apps', 'pufferdesk' ),
				'keep_in_launcher'     => __( 'Keep in Launcher', 'pufferdesk' ),
				'remove_from_launcher' => __( 'Remove from Launcher', 'pufferdesk' ),
				'open_at_login'        => __( 'Open at startup', 'pufferdesk' ),
				'minimize_animation_genie' => __( 'Drift', 'pufferdesk' ),
				'minimize_animation_scale' => __( 'Scale', 'pufferdesk' ),
				'menu_bar'             => __( 'Top Bar', 'pufferdesk' ),
				'menu_bar_background'  => __( 'Show top bar background', 'pufferdesk' ),
			),
		);
	}

	/**
	 * Default window chrome contract for themes.
	 *
	 * @return array<string,mixed>
	 */
	private function get_default_window_chrome_config() {
		return PufferDesk_Window_Chrome_Contracts::default_config();
	}

	/**
	 * Default native app surface layouts for themes.
	 *
	 * @return array<string,string>
	 */
	private function get_default_surface_config() {
		return array(
			'settings' => 'pufferdesk-hub',
			'folder'   => 'pufferdesk-files',
		);
	}

	/**
	 * Normalize a theme shell surface contract.
	 *
	 * @param mixed $shell Raw shell config.
	 * @return array<string,mixed>
	 */
	private function normalize_shell_config( $shell ) {
		if ( ! is_array( $shell ) ) {
			return array();
		}

		$normalized = array();
		$fields     = array(
			'chrome'           => array( 'global-menu-dock', 'taskbar', 'minimal' ),
			'top_bar'          => array( 'menu-bar', 'taskbar', 'none' ),
			'launcher'         => array( 'dock', 'taskbar', 'none' ),
			'system_menu'      => array( 'mark', 'start', 'none' ),
			'app_menu'         => array( 'global', 'window', 'none' ),
			'status_area'      => array( 'menu-bar', 'taskbar', 'none' ),
			'system_menu_icon' => array( 'pufferdesk-mark', 'theme', 'none' ),
		);

		foreach ( $fields as $field => $allowed ) {
			if ( ! array_key_exists( $field, $shell ) ) {
				continue;
			}

			$value = sanitize_key( (string) $shell[ $field ] );
			if ( in_array( $value, $allowed, true ) ) {
				$normalized[ $field ] = $value;
			}
		}

		if ( isset( $shell['labels'] ) && is_array( $shell['labels'] ) ) {
			$normalized['labels'] = $this->normalize_string_map( $shell['labels'] );
		}

		if ( array_key_exists( 'launcher_separator', $shell ) ) {
			$normalized['launcher_separator'] = $this->normalize_boolean( $shell['launcher_separator'] );
		}

		if ( array_key_exists( 'launcher_search', $shell ) ) {
			$normalized['launcher_search'] = $this->normalize_boolean( $shell['launcher_search'] );
		}

		if ( isset( $shell['default_app_location'] ) ) {
			$location = sanitize_key( (string) $shell['default_app_location'] );
			$allowed  = array_values( PufferDesk_User_Preferences::get_app_location_ids() );
			if ( in_array( $location, $allowed, true ) ) {
				$normalized['default_app_location'] = $location;
			}
		}

		if ( isset( $shell['default_app_locations'] ) && is_array( $shell['default_app_locations'] ) ) {
			$normalized['default_app_locations'] = $this->normalize_app_location_map( $shell['default_app_locations'] );
		}

		if ( array_key_exists( 'default_plugin_app_limit', $shell ) && is_numeric( $shell['default_plugin_app_limit'] ) ) {
			$normalized['default_plugin_app_limit'] = max( 0, min( 50, absint( $shell['default_plugin_app_limit'] ) ) );
		}

		if ( isset( $shell['fixed_app_locations'] ) && is_array( $shell['fixed_app_locations'] ) ) {
			$normalized['fixed_app_locations'] = $this->normalize_app_location_map( $shell['fixed_app_locations'] );
		}

		return $normalized;
	}

	/**
	 * Normalize native app surface layout choices.
	 *
	 * @param mixed $surfaces Raw surface config.
	 * @return array<string,string>
	 */
	private function normalize_surface_config( $surfaces ) {
		if ( ! is_array( $surfaces ) ) {
			return array();
		}

		$normalized = array();
		$fields     = array(
			'settings' => array( 'pufferdesk-hub', 'pufferdesk-settings', 'windows-settings' ),
			'folder'   => array( 'pufferdesk-files', 'finder', 'file-explorer' ),
		);

		foreach ( $fields as $field => $allowed ) {
			if ( ! array_key_exists( $field, $surfaces ) ) {
				continue;
			}

			$value = sanitize_key( (string) $surfaces[ $field ] );
			if ( in_array( $value, $allowed, true ) ) {
				$normalized[ $field ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize menu theme metadata.
	 *
	 * @param mixed $menu Raw menu metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_menu_config( $menu ) {
		if ( ! is_array( $menu ) ) {
			return array();
		}

		$normalized = array();
		if ( isset( $menu['labels'] ) && is_array( $menu['labels'] ) ) {
			$normalized['labels'] = $this->normalize_string_map( $menu['labels'] );
		}

		return $normalized;
	}

	/**
	 * Normalize info panel theme metadata.
	 *
	 * @param mixed $info_panel Raw info panel metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_info_panel_config( $info_panel ) {
		if ( ! is_array( $info_panel ) ) {
			return array();
		}

		$normalized = array();
		if ( isset( $info_panel['labels'] ) && is_array( $info_panel['labels'] ) ) {
			$normalized['labels'] = $this->normalize_string_map( $info_panel['labels'] );
		}

		return $normalized;
	}

	/**
	 * Normalize theme dialog metadata.
	 *
	 * @param mixed $dialogs Raw dialog metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_dialog_config( $dialogs ) {
		if ( ! is_array( $dialogs ) ) {
			return array();
		}

		$normalized = array();

		if ( array_key_exists( 'style', $dialogs ) ) {
			$style = sanitize_key( (string) $dialogs['style'] );
			if ( in_array( $style, array( 'floating', 'system-window' ), true ) ) {
				$normalized['style'] = $style;
			}
		}

		if ( isset( $dialogs['confirmations'] ) && is_array( $dialogs['confirmations'] ) ) {
			$confirmations = array();

			foreach ( $dialogs['confirmations'] as $id => $confirmation ) {
				$id = sanitize_key( (string) $id );
				if ( '' === $id || ! is_array( $confirmation ) ) {
					continue;
				}

				$confirmation = $this->normalize_dialog_confirmation_config( $confirmation );
				if ( ! empty( $confirmation ) ) {
					$confirmations[ $id ] = $confirmation;
				}
			}

			if ( ! empty( $confirmations ) ) {
				$normalized['confirmations'] = $confirmations;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize a theme confirmation policy.
	 *
	 * @param array<string,mixed> $confirmation Raw confirmation policy.
	 * @return array<string,mixed>
	 */
	private function normalize_dialog_confirmation_config( $confirmation ) {
		$normalized = array();

		if ( array_key_exists( 'enabled', $confirmation ) ) {
			$normalized['enabled'] = $this->normalize_boolean( $confirmation['enabled'] );
		}

		if ( array_key_exists( 'variant', $confirmation ) ) {
			$variant = sanitize_html_class( (string) $confirmation['variant'] );
			if ( '' !== $variant ) {
				$normalized['variant'] = $variant;
			}
		}

		if ( array_key_exists( 'icon', $confirmation ) && is_scalar( $confirmation['icon'] ) ) {
			$icon = sanitize_text_field( (string) $confirmation['icon'] );
			if ( '' !== $icon ) {
				$normalized['icon'] = $icon;
			}
		}

		if ( array_key_exists( 'default_action', $confirmation ) ) {
			$default_action = sanitize_key( (string) $confirmation['default_action'] );
			if ( in_array( $default_action, array( 'confirm', 'cancel' ), true ) ) {
				$normalized['default_action'] = $default_action;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize Sticky Notes document theme metadata.
	 *
	 * @param mixed $documents Raw document metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_document_config( $documents ) {
		if ( ! is_array( $documents ) ) {
			return array();
		}

		$normalized = array();
		$policy     = '';

		if ( array_key_exists( 'stickyNoteSavePolicy', $documents ) ) {
			$policy = sanitize_key( (string) $documents['stickyNoteSavePolicy'] );
		} elseif ( array_key_exists( 'sticky_note_save_policy', $documents ) ) {
			$policy = sanitize_key( (string) $documents['sticky_note_save_policy'] );
		}

		if ( in_array( $policy, array( 'ask-on-first-save', 'default-location' ), true ) ) {
			$normalized['stickyNoteSavePolicy'] = $policy;
		}

		return $normalized;
	}

	/**
	 * Normalize theme sound metadata.
	 *
	 * @param mixed $sounds Raw sound metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_sound_config( $sounds ) {
		if ( ! is_array( $sounds ) ) {
			return array();
		}

		$normalized = array();

		if ( array_key_exists( 'enabled', $sounds ) ) {
			$normalized['enabled'] = $this->normalize_boolean( $sounds['enabled'] );
		}

		if ( array_key_exists( 'rateLimitMs', $sounds ) || array_key_exists( 'rate_limit_ms', $sounds ) ) {
			$rate_limit = array_key_exists( 'rateLimitMs', $sounds ) ? $sounds['rateLimitMs'] : $sounds['rate_limit_ms'];
			if ( is_numeric( $rate_limit ) ) {
				$normalized['rateLimitMs'] = max( 0, min( 5000, absint( $rate_limit ) ) );
			}
		}

		if ( isset( $sounds['events'] ) && is_array( $sounds['events'] ) ) {
			$events = array();

			foreach ( $sounds['events'] as $event_id => $event ) {
				$event_id = strtolower( preg_replace( '/[^a-zA-Z0-9_.:-]/', '', (string) $event_id ) );
				if ( '' === $event_id ) {
					continue;
				}

				$event = $this->normalize_sound_event_config( $event );
				if ( ! empty( $event ) ) {
					$events[ $event_id ] = $event;
				}
			}

			if ( ! empty( $events ) ) {
				$normalized['events'] = $events;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize one sound event descriptor.
	 *
	 * @param mixed $event Raw sound event descriptor.
	 * @return array<string,mixed>
	 */
	private function normalize_sound_event_config( $event ) {
		$descriptor = is_array( $event ) ? $event : array( 'src' => $event );
		$path       = '';

		foreach ( array( 'path', 'file', 'src' ) as $field ) {
			if ( isset( $descriptor[ $field ] ) && is_scalar( $descriptor[ $field ] ) ) {
				$path = (string) $descriptor[ $field ];
				break;
			}
		}

		$file = $this->normalize_media_file( $path );
		if ( empty( $file['url'] ) ) {
			return array();
		}

		$normalized = array(
			'path' => $file['path'],
			'src'  => $file['url'],
		);

		if ( isset( $descriptor['volume'] ) && is_numeric( $descriptor['volume'] ) ) {
			$normalized['volume'] = max( 0, min( 1, (float) $descriptor['volume'] ) );
		}

		if ( isset( $descriptor['playbackRate'] ) && is_numeric( $descriptor['playbackRate'] ) ) {
			$normalized['playbackRate'] = max( 0.5, min( 2, (float) $descriptor['playbackRate'] ) );
		}

		return $normalized;
	}

	/**
	 * Normalize native settings app theme metadata.
	 *
	 * @param mixed $settings Raw settings metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_settings_config( $settings ) {
		if ( ! is_array( $settings ) ) {
			return array();
		}

		$normalized = array();
		if ( isset( $settings['labels'] ) && is_array( $settings['labels'] ) ) {
			$normalized['labels'] = $this->normalize_label_config( $settings['labels'] );
		}

		return $normalized;
	}

	/**
	 * Normalize nested label config while preserving camelCase keys used by JS.
	 *
	 * @param mixed $config Raw label config.
	 * @return mixed
	 */
	private function normalize_label_config( $config ) {
		if ( is_scalar( $config ) ) {
			return sanitize_text_field( (string) $config );
		}

		if ( ! is_array( $config ) ) {
			return null;
		}

		$normalized = array();
		foreach ( $config as $key => $value ) {
			$normalized_key = is_int( $key ) ? $key : preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $key );
			if ( '' === (string) $normalized_key ) {
				continue;
			}

			$normalized_value = $this->normalize_label_config( $value );
			if ( null !== $normalized_value && '' !== $normalized_value ) {
				$normalized[ $normalized_key ] = $normalized_value;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize a theme window chrome contract.
	 *
	 * @param mixed $window_chrome Raw window chrome config.
	 * @return array<string,mixed>
	 */
	private function normalize_window_chrome_config( $window_chrome ) {
		return PufferDesk_Window_Chrome_Contracts::normalize_config( $window_chrome );
	}

	/**
	 * Merge a partial theme config over a parent config.
	 *
	 * @param mixed $parent Parent config.
	 * @param mixed $child Child config.
	 * @return mixed
	 */
	private function merge_theme_config( $parent, $child ) {
		if ( ! is_array( $parent ) || ! is_array( $child ) ) {
			return $child;
		}

		$merged = $parent;
		foreach ( $child as $key => $value ) {
			if (
				isset( $merged[ $key ] )
				&& is_array( $merged[ $key ] )
				&& is_array( $value )
				&& $this->is_associative_array( $merged[ $key ] )
				&& $this->is_associative_array( $value )
			) {
				$merged[ $key ] = $this->merge_theme_config( $merged[ $key ], $value );
				continue;
			}

			$merged[ $key ] = $value;
		}

		return $merged;
	}

	/**
	 * Apply defaults to a shell config.
	 *
	 * @param mixed $shell Shell config.
	 * @return array<string,mixed>
	 */
	private function complete_shell_config( $shell ) {
		return $this->merge_theme_config(
			$this->get_default_shell_config(),
			is_array( $shell ) ? $shell : array()
		);
	}

	/**
	 * Apply defaults to a surface layout config.
	 *
	 * @param mixed $surfaces Surface layout config.
	 * @return array<string,string>
	 */
	private function complete_surface_config( $surfaces ) {
		return $this->merge_theme_config(
			$this->get_default_surface_config(),
			is_array( $surfaces ) ? $surfaces : array()
		);
	}

	/**
	 * Apply defaults to menu metadata.
	 *
	 * @param mixed $menu Menu metadata.
	 * @return array<string,mixed>
	 */
	private function complete_menu_config( $menu ) {
		return is_array( $menu ) ? $menu : array();
	}

	/**
	 * Apply defaults to sound metadata.
	 *
	 * Runtime config provides shared defaults; theme sound metadata is additive.
	 *
	 * @param mixed $sounds Sound metadata.
	 * @return array<string,mixed>
	 */
	private function complete_sound_config( $sounds ) {
		return is_array( $sounds ) ? $sounds : array();
	}

	/**
	 * Default dialog contract for themes.
	 *
	 * @return array<string,mixed>
	 */
	private function get_default_dialog_config() {
		return array(
			'style'         => 'floating',
			'confirmations' => array(
				'move_folder_to_trash' => array(
					'enabled'        => false,
					'variant'        => 'move-to-trash',
					'icon'           => 'dashicons-category',
					'default_action' => 'confirm',
				),
			),
		);
	}

	/**
	 * Apply defaults to dialog metadata.
	 *
	 * @param mixed $dialogs Dialog metadata.
	 * @return array<string,mixed>
	 */
	private function complete_dialog_config( $dialogs ) {
		return $this->merge_theme_config(
			$this->get_default_dialog_config(),
			is_array( $dialogs ) ? $dialogs : array()
		);
	}

	/**
	 * Default Sticky Notes document contract for themes.
	 *
	 * @return array<string,mixed>
	 */
	private function get_default_document_config() {
		return array(
			'stickyNoteSavePolicy' => 'default-location',
		);
	}

	/**
	 * Apply defaults to document metadata.
	 *
	 * @param mixed $documents Document metadata.
	 * @return array<string,mixed>
	 */
	private function complete_document_config( $documents ) {
		return $this->merge_theme_config(
			$this->get_default_document_config(),
			is_array( $documents ) ? $documents : array()
		);
	}

	/**
	 * Apply defaults to a settings metadata config.
	 *
	 * @param mixed $settings Settings metadata config.
	 * @return array<string,mixed>
	 */
	private function complete_settings_config( $settings ) {
		return is_array( $settings ) ? $settings : array();
	}

	/**
	 * Apply defaults to a window chrome config.
	 *
	 * @param mixed $window_chrome Window chrome config.
	 * @return array<string,mixed>
	 */
	private function complete_window_chrome_config( $window_chrome ) {
		return PufferDesk_Window_Chrome_Contracts::complete_config( $window_chrome );
	}

	/**
	 * Normalize a map of labels.
	 *
	 * @param mixed    $labels Raw labels.
	 * @param string[] $allowed_keys Optional allowed label keys.
	 * @return array<string,string>
	 */
	private function normalize_string_map( $labels, $allowed_keys = array() ) {
		$normalized = array();
		if ( ! is_array( $labels ) ) {
			return $normalized;
		}

		foreach ( $labels as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ( ! empty( $allowed_keys ) && ! in_array( $key, $allowed_keys, true ) ) ) {
				continue;
			}

			if ( ! is_scalar( $value ) ) {
				continue;
			}

			$value = sanitize_text_field( $value );
			if ( '' !== $value ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize a boolean-like theme value.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	private function normalize_boolean( $value ) {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_int( $value ) || is_float( $value ) ) {
			return 1 === (int) $value;
		}

		$value = strtolower( trim( (string) $value ) );

		return ! in_array( $value, array( '', '0', 'false', 'no', 'off' ), true );
	}

	/**
	 * Normalize fixed app location metadata.
	 *
	 * @param mixed $locations Raw location map.
	 * @return array<string,string>
	 */
	private function normalize_app_location_map( $locations ) {
		$normalized = array();
		if ( ! is_array( $locations ) ) {
			return $normalized;
		}

		$allowed = array_values( PufferDesk_User_Preferences::get_app_location_ids() );
		foreach ( $locations as $app_id => $location ) {
			$app_id   = sanitize_key( (string) $app_id );
			$location = sanitize_key( (string) $location );
			if ( '' !== $app_id && in_array( $location, $allowed, true ) ) {
				$normalized[ $app_id ] = $location;
			}
		}

		return $normalized;
	}

	/**
	 * Whether an array uses string keys.
	 *
	 * @param array<mixed> $value Value to inspect.
	 * @return bool
	 */
	private function is_associative_array( $value ) {
		if ( array() === $value ) {
			return false;
		}

		return array_keys( $value ) !== range( 0, count( $value ) - 1 );
	}

	/**
	 * Normalize theme wallpaper collection metadata.
	 *
	 * @param mixed $wallpapers Raw wallpaper collection.
	 * @param mixed $fallback_wallpaper Raw single wallpaper fallback.
	 * @return array<string,mixed>
	 */
	private function normalize_wallpapers( $wallpapers, $fallback_wallpaper ) {
		$normalized = array(
			'default' => '',
			'items'   => array(),
		);

		if ( is_array( $wallpapers ) ) {
			if ( ! empty( $wallpapers['default'] ) ) {
				$normalized['default'] = sanitize_key( $wallpapers['default'] );
			}

			if ( ! empty( $wallpapers['items'] ) && is_array( $wallpapers['items'] ) ) {
				foreach ( $wallpapers['items'] as $item ) {
					if ( ! is_array( $item ) || empty( $item['id'] ) ) {
						continue;
					}

					$id        = sanitize_key( $item['id'] );
					$css_value = $this->sanitize_css_image_value( isset( $item['css_value'] ) ? $item['css_value'] : ( isset( $item['css'] ) ? $item['css'] : '' ) );
					if ( '' === $id ) {
						continue;
					}

					if ( '' !== $css_value ) {
						$normalized['items'][] = array(
							'id'            => $id,
							'label'         => isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : $id,
							'css_value'     => $css_value,
							'preview'       => isset( $item['preview'] ) ? $this->sanitize_css_image_value( $item['preview'] ) : $css_value,
							'fit'           => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
							'position'      => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
							'menu_contrast' => $this->sanitize_menu_contrast( isset( $item['menu_contrast'] ) ? $item['menu_contrast'] : '' ),
						);
						continue;
					}

					$file = $this->normalize_media_file( isset( $item['path'] ) ? $item['path'] : ( isset( $item['file'] ) ? $item['file'] : '' ) );
					if ( ! empty( $file['url'] ) ) {
						$normalized['items'][] = array(
							'id'            => $id,
							'label'         => isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : $id,
							'path'          => $file['path'],
							'url'           => $file['url'],
							'fit'           => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
							'position'      => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
							'menu_contrast' => $this->sanitize_menu_contrast( isset( $item['menu_contrast'] ) ? $item['menu_contrast'] : '' ),
						);
					}
				}
			}
		}

		if ( empty( $normalized['items'] ) && ! empty( $fallback_wallpaper ) ) {
			$file = $this->normalize_media_file( $fallback_wallpaper );
			if ( ! empty( $file['url'] ) ) {
				$normalized['default'] = 'default';
				$normalized['items'][] = array(
					'id'            => 'default',
					'label'         => __( 'Default', 'pufferdesk' ),
					'path'          => $file['path'],
					'url'           => $file['url'],
					'fit'           => 'cover',
					'position'      => 'center center',
					'menu_contrast' => 'auto',
				);
			}
		}

		if ( '' === $normalized['default'] && ! empty( $normalized['items'][0]['id'] ) ) {
			$normalized['default'] = $normalized['items'][0]['id'];
		}

		return $normalized;
	}

	/**
	 * Normalize a media file path below assets/media.
	 *
	 * @param mixed $path Raw path.
	 * @return array<string,string>
	 */
	private function normalize_media_file( $path ) {
		return $this->normalize_media_asset( $path, false );
	}

	/**
	 * Sanitize a theme-defined CSS wallpaper image.
	 *
	 * Only gradient image values are accepted here. URL-backed wallpapers must use
	 * the path/file fields so they stay inside assets/media.
	 *
	 * @param mixed $value Raw CSS image value.
	 * @return string
	 */
	private function sanitize_css_image_value( $value ) {
		$value = trim( (string) $value );
		$value = preg_replace( '/\s+/', ' ', $value );
		$value = str_replace( ';', '', $value );

		if ( '' === $value ) {
			return '';
		}

		$lower = strtolower( $value );
		if (
			false !== strpos( $lower, 'url(' ) ||
			false !== strpos( $lower, 'expression(' ) ||
			false !== strpos( $value, '<' ) ||
			false !== strpos( $value, '>' )
		) {
			return '';
		}

		return preg_match( '/(?:^|,\s*)(?:linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\(/i', $value ) ? $value : '';
	}

	/**
	 * Sanitize a menu contrast token.
	 *
	 * @param mixed $value Raw contrast value.
	 * @return string
	 */
	private function sanitize_menu_contrast( $value ) {
		$value = sanitize_key( (string) $value );

		return in_array( $value, array( 'dark', 'light', 'auto' ), true ) ? $value : '';
	}

	/**
	 * Normalize a media directory path below assets/media.
	 *
	 * @param mixed $path Raw path.
	 * @return array<string,mixed>
	 */
	private function normalize_media_directory( $path ) {
		return $this->normalize_media_asset( $path, true );
	}

	/**
	 * Normalize a local media asset path and URL.
	 *
	 * @param mixed $path Raw path.
	 * @param bool  $directory Whether the asset is a directory.
	 * @return array<string,mixed>
	 */
	private function normalize_media_asset( $path, $directory ) {
		$path = $this->sanitize_asset_path( $path, 'assets/media/' );

		if ( '' === $path ) {
			return array(
				'path' => '',
				'url'  => '',
			);
		}

		$url_path = $directory ? trailingslashit( $path ) : $path;
		$asset    = array(
			'path' => $path,
			'url'  => PUFFERDESK_URL . 'assets/media/' . $url_path,
		);

		if ( $directory ) {
			$versions = $this->get_media_directory_versions( $path );
			if ( ! empty( $versions ) ) {
				$asset['versions'] = $versions;
			}
		}

		return $asset;
	}

	/**
	 * Build a direct-child file version map for runtime-generated media URLs.
	 *
	 * @param string $path Normalized media directory path.
	 * @return array<string,string>
	 */
	private function get_media_directory_versions( $path ) {
		$directory = PUFFERDESK_DIR . 'assets/media/' . $path;
		if ( '' === $path || ! is_dir( $directory ) ) {
			return array();
		}

		$files = scandir( $directory );
		if ( false === $files ) {
			return array();
		}

		$versions = array();
		foreach ( $files as $file ) {
			if ( ! preg_match( '/\.(svg|png|webp|jpe?g|gif)$/i', $file ) ) {
				continue;
			}

			$full_path = trailingslashit( $directory ) . $file;
			if ( ! is_file( $full_path ) ) {
				continue;
			}

			$mtime             = filemtime( $full_path );
			$versions[ $file ] = false !== $mtime ? (string) $mtime : PUFFERDESK_VERSION;
		}

		ksort( $versions );

		return $versions;
	}

	/**
	 * Sanitize a relative CSS path below assets/css/themes.
	 *
	 * @param string $path Raw path.
	 * @return string
	 */
	private function sanitize_stylesheet_path( $path ) {
		return $this->sanitize_asset_path( $path, '' );
	}

	/**
	 * Sanitize a relative asset path.
	 *
	 * @param mixed  $path Raw path.
	 * @param string $prefix Optional prefix to strip before normalizing.
	 * @return string
	 */
	private function sanitize_asset_path( $path, $prefix ) {
		return PufferDesk_Path_Normalizer::normalize_relative_path( $path, $prefix );
	}
}
