<?php
/**
 * Theme registry.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns OS theme metadata and lookup.
 */
final class WP_AdminOS_Theme_Registry {
	/**
	 * Get all registered themes.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public function get_themes() {
		$themes = array(
			'adminos-base' => array(
				'id'             => 'adminos-base',
				'label'          => __( 'WP adminOS Base', 'wp-adminos' ),
				'family'         => 'adminos',
				'family_label'   => __( 'WP adminOS', 'wp-adminos' ),
				'version'        => 'base',
				'version_label'  => __( 'Base', 'wp-adminos' ),
				'stylesheet'     => 'adminos/base.css',
				'typography'     => array(
					'fonts'          => array(
						'ui'      => '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
						'display' => '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
						'mono'    => 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
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
				),
				'shell'          => array(
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
						'launcher_position'    => __( 'Dock position on screen', 'wp-adminos' ),
						'auto_hide_launcher'   => __( 'Automatically hide and show the Dock', 'wp-adminos' ),
						'launcher_options'     => __( 'Options', 'wp-adminos' ),
						'keep_in_launcher'     => __( 'Keep in Dock', 'wp-adminos' ),
						'remove_from_launcher' => __( 'Remove from Dock', 'wp-adminos' ),
						'open_at_login'        => __( 'Open at Login', 'wp-adminos' ),
						'menu_bar'             => __( 'Menu Bar', 'wp-adminos' ),
						'menu_bar_auto_hide'   => __( 'Automatically hide and show the menu bar', 'wp-adminos' ),
						'menu_bar_background'  => __( 'Show menu bar background', 'wp-adminos' ),
					),
				),
				'window_chrome'  => array(
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
				'abstract'       => true,
			),
			'adminos' => array(
				'id'             => 'adminos',
				'label'          => __( 'WP adminOS', 'wp-adminos' ),
				'family'         => 'adminos',
				'family_label'   => __( 'WP adminOS', 'wp-adminos' ),
				'version'        => 'default',
				'version_label'  => __( 'Default', 'wp-adminos' ),
				'parent'         => 'adminos-base',
				'stylesheet'     => 'adminos/default.css',
				'media'          => array(
					'wallpapers'  => array(
						'default' => 'aurora-flow',
						'items'   => array(
							array(
								'id'        => 'aurora-flow',
								'label'     => __( 'Aurora', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.34), transparent 24%), radial-gradient(circle at 78% 18%, rgba(46, 211, 255, 0.38), transparent 30%), linear-gradient(135deg, #2447c7 0%, #2fb8d2 52%, #8d3cff 100%)',
							),
							array(
								'id'        => 'aqua-horizon',
								'label'     => __( 'Aqua', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.46), transparent 22%), linear-gradient(120deg, #1d5fbf 0%, #1eb4c9 55%, #62f1dc 100%)',
							),
							array(
								'id'        => 'alpine-mist',
								'label'     => __( 'Alpine', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 76% 22%, rgba(255, 255, 255, 0.42), transparent 24%), linear-gradient(130deg, #16406d 0%, #3a8e9b 48%, #9ac77c 100%)',
							),
							array(
								'id'        => 'canyon-light',
								'label'     => __( 'Canyon', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 72% 18%, rgba(255, 231, 174, 0.45), transparent 28%), linear-gradient(125deg, #ff5c39 0%, #d83c7d 48%, #783fd6 100%)',
							),
							array(
								'id'        => 'coral-ridge',
								'label'     => __( 'Coral', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.38), transparent 24%), linear-gradient(120deg, #ff4438 0%, #ee2d7a 52%, #b22ed5 100%)',
							),
							array(
								'id'        => 'ember',
								'label'     => __( 'Ember', 'wp-adminos' ),
								'css_value' => 'linear-gradient(135deg, #ffffc4 0.000%, #ff6164 50.000%, #b00012 100.000%)',
							),
							array(
								'id'        => 'breeze',
								'label'     => __( 'Breeze', 'wp-adminos' ),
								'css_value' => 'linear-gradient(90deg, #07aeea 0.000%, #2bf598 100.000%)',
							),
							array(
								'id'        => 'solar',
								'label'     => __( 'Solar', 'wp-adminos' ),
								'css_value' => 'linear-gradient(90deg, #2a001b 0.000%, #78130c 16.667%, #ce480e 33.333%, #ff8d22 50.000%, #ffd543 66.667%, #ffff69 83.333%, #ffff8d 100.000%)',
							),
							array(
								'id'        => 'azure',
								'label'     => __( 'Azure', 'wp-adminos' ),
								'css_value' => 'linear-gradient(180deg, #003bff 0.000%, #004bff 8.333%, #125cff 16.667%, #2b6cff 25.000%, #447bff 33.333%, #5d8bff 41.667%, #7499ff 50.000%, #8aa7ff 58.333%, #9db3ff 66.667%, #adbfff 75.000%, #b9c9ff 83.333%, #c2d2ff 91.667%, #c6d9ff 100.000%)',
							),
							array(
								'id'        => 'lagoon-glow',
								'label'     => __( 'Lagoon', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 80% 20%, rgba(227, 255, 241, 0.36), transparent 26%), linear-gradient(135deg, #0c6a88 0%, #18b5b7 54%, #69ddbb 100%)',
							),
							array(
								'id'        => 'violet-wave',
								'label'     => __( 'Violet', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.3), transparent 22%), linear-gradient(130deg, #2b4fcf 0%, #7042d8 46%, #df46a6 100%)',
							),
							array(
								'id'        => 'sunset-field',
								'label'     => __( 'Sunset', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 74% 18%, rgba(255, 239, 170, 0.48), transparent 24%), linear-gradient(120deg, #ff7a18 0%, #ff3f68 48%, #6d4cf5 100%)',
							),
							array(
								'id'        => 'mint-haze',
								'label'     => __( 'Mint', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.4), transparent 24%), linear-gradient(135deg, #207a68 0%, #6ac99d 52%, #b4d676 100%)',
							),
							array(
								'id'        => 'nightfall',
								'label'     => __( 'Nightfall', 'wp-adminos' ),
								'css_value' => 'radial-gradient(circle at 78% 18%, rgba(92, 116, 255, 0.34), transparent 28%), radial-gradient(circle at 22% 76%, rgba(0, 204, 196, 0.22), transparent 32%), linear-gradient(135deg, #121d3d 0%, #242056 50%, #0f5364 100%)',
							),
						),
					),
					'icon_pack'   => 'themes/adminos/default/icons',
					'cursor_pack' => 'themes/adminos/default/cursors',
				),
			),
		);

		/**
		 * Filter WP adminOS themes.
		 *
		 * Theme keys are stable IDs. Values accept:
		 * id, label, family, family_label, version, version_label, parent,
		 * stylesheet, stylesheets, media, wallpaper, wallpapers, icon_pack,
		 * cursor_pack, typography, shell, window_chrome, and abstract.
		 *
		 * @param array<string,array<string,mixed>> $themes Registered themes.
		 */
		$themes = apply_filters( 'wp_adminos_themes', $themes );

		return $this->normalize_themes( $themes );
	}

	/**
	 * Get the current user's theme.
	 *
	 * @param WP_AdminOS_User_Preferences $preferences User preferences.
	 * @return array<string,mixed>
	 */
	public function get_current_theme( WP_AdminOS_User_Preferences $preferences ) {
		$themes   = $this->get_themes();
		$theme_id = $preferences->get_theme_id( $themes );
		if ( empty( $themes[ $theme_id ] ) || ! empty( $themes[ $theme_id ]['abstract'] ) ) {
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
			if ( ! empty( $theme['abstract'] ) ) {
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
				'window_chrome' => $resolved['window_chrome'],
			);
		}

		return $options;
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
				'typography'     => $this->normalize_typography_config( isset( $theme['typography'] ) ? $theme['typography'] : array() ),
				'shell'          => $this->normalize_shell_config( isset( $theme['shell'] ) ? $theme['shell'] : array() ),
				'window_chrome'  => $this->normalize_window_chrome_config( isset( $theme['window_chrome'] ) ? $theme['window_chrome'] : array() ),
				'abstract'       => ! empty( $theme['abstract'] ),
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
			$theme['stylesheet_stack'] = $theme['stylesheets'];
			$theme['ancestors']        = array();
			$theme['typography']       = $this->complete_typography_config( $theme['typography'] );
			$theme['shell']            = $this->complete_shell_config( $theme['shell'] );
			$theme['window_chrome']    = $this->complete_window_chrome_config( $theme['window_chrome'] );
			return $theme;
		}

		$seen[ $theme_id ] = true;
		$parent_id         = isset( $theme['parent'] ) ? $theme['parent'] : '';
		if ( '' === $parent_id || empty( $themes[ $parent_id ] ) ) {
			$theme['stylesheet_stack'] = $theme['stylesheets'];
			$theme['ancestors']        = array();
			$theme['typography']       = $this->complete_typography_config( $theme['typography'] );
			$theme['shell']            = $this->complete_shell_config( $theme['shell'] );
			$theme['window_chrome']    = $this->complete_window_chrome_config( $theme['window_chrome'] );
			return $theme;
		}

		$parent = $this->resolve_theme( $parent_id, $themes, $seen );

		$theme['family']           = $theme['family'] ? $theme['family'] : $parent['family'];
		$theme['family_label']     = $theme['family_label'] ? $theme['family_label'] : $parent['family_label'];
		$theme['media']            = $this->merge_media( $parent['media'], $theme['media'] );
		$theme['typography']       = $this->complete_typography_config( $this->merge_theme_config( $parent['typography'], $theme['typography'] ) );
		$theme['shell']            = $this->complete_shell_config( $this->merge_theme_config( $parent['shell'], $theme['shell'] ) );
		$theme['window_chrome']    = $this->complete_window_chrome_config( $this->merge_theme_config( $parent['window_chrome'], $theme['window_chrome'] ) );
		$theme['stylesheet_stack']  = array_values( array_unique( array_merge( $parent['stylesheet_stack'], $theme['stylesheets'] ) ) );
		$theme['ancestors']         = array_merge( $parent['ancestors'], array( $parent['id'] ) );

		return $theme;
	}

	/**
	 * Get the first non-abstract theme.
	 *
	 * @param array<string,array<string,mixed>> $themes Registered themes.
	 * @return string
	 */
	private function get_default_selectable_theme_id( $themes ) {
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
	 * @return array<string,array<string,string>>
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
	 * @param array<string,array<string,string>> $parent Parent media.
	 * @param array<string,array<string,string>> $child Child media.
	 * @return array<string,array<string,string>>
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
				'ui'      => '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
				'display' => '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
				'mono'    => 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
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
				'launcher_position'    => __( 'Dock position on screen', 'wp-adminos' ),
				'auto_hide_launcher'   => __( 'Automatically hide and show the Dock', 'wp-adminos' ),
				'launcher_options'     => __( 'Options', 'wp-adminos' ),
				'keep_in_launcher'     => __( 'Keep in Dock', 'wp-adminos' ),
				'remove_from_launcher' => __( 'Remove from Dock', 'wp-adminos' ),
				'open_at_login'        => __( 'Open at Login', 'wp-adminos' ),
				'menu_bar'             => __( 'Menu Bar', 'wp-adminos' ),
				'menu_bar_auto_hide'   => __( 'Automatically hide and show the menu bar', 'wp-adminos' ),
				'menu_bar_background'  => __( 'Show menu bar background', 'wp-adminos' ),
			),
		);
	}

	/**
	 * Default window chrome contract for themes.
	 *
	 * @return array<string,mixed>
	 */
	private function get_default_window_chrome_config() {
		return array(
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
			'chrome'      => array( 'global-menu-dock', 'taskbar', 'minimal' ),
			'top_bar'     => array( 'menu-bar', 'taskbar', 'none' ),
			'launcher'    => array( 'dock', 'taskbar', 'none' ),
			'system_menu' => array( 'mark', 'start', 'none' ),
			'app_menu'    => array( 'global', 'window', 'none' ),
			'status_area' => array( 'menu-bar', 'taskbar', 'none' ),
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

		return $normalized;
	}

	/**
	 * Normalize a theme window chrome contract.
	 *
	 * @param mixed $window_chrome Raw window chrome config.
	 * @return array<string,mixed>
	 */
	private function normalize_window_chrome_config( $window_chrome ) {
		if ( ! is_array( $window_chrome ) ) {
			return array();
		}

		$normalized = array();
		$controls   = isset( $window_chrome['controls'] ) && is_array( $window_chrome['controls'] )
			? $window_chrome['controls']
			: array();
		$title      = isset( $window_chrome['title'] ) && is_array( $window_chrome['title'] )
			? $window_chrome['title']
			: array();

		if ( array_key_exists( 'placement', $controls ) ) {
			$placement = sanitize_key( (string) $controls['placement'] );
			if ( in_array( $placement, array( 'left', 'right' ), true ) ) {
				$normalized['controls']['placement'] = $placement;
			}
		}

		if ( array_key_exists( 'style', $controls ) ) {
			$style = sanitize_key( (string) $controls['style'] );
			if ( in_array( $style, array( 'traffic', 'caption', 'toolbar', 'hidden' ), true ) ) {
				$normalized['controls']['style'] = $style;
			}
		}

		if ( isset( $controls['order'] ) ) {
			$order = $this->normalize_window_control_order( $controls['order'] );
			if ( ! empty( $order ) ) {
				$normalized['controls']['order'] = $order;
			}
		}

		if ( isset( $controls['labels'] ) && is_array( $controls['labels'] ) ) {
			$labels = $this->normalize_string_map( $controls['labels'], array( 'close', 'minimize', 'maximize' ) );
			if ( ! empty( $labels ) ) {
				$normalized['controls']['labels'] = $labels;
			}
		}

		if ( array_key_exists( 'alignment', $title ) ) {
			$alignment = sanitize_key( (string) $title['alignment'] );
			if ( in_array( $alignment, array( 'left', 'center', 'right' ), true ) ) {
				$normalized['title']['alignment'] = $alignment;
			}
		}

		if ( array_key_exists( 'show_icon', $title ) ) {
			$normalized['title']['show_icon'] = (bool) $title['show_icon'];
		}

		return $normalized;
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
	 * Apply defaults to a window chrome config.
	 *
	 * @param mixed $window_chrome Window chrome config.
	 * @return array<string,mixed>
	 */
	private function complete_window_chrome_config( $window_chrome ) {
		return $this->merge_theme_config(
			$this->get_default_window_chrome_config(),
			is_array( $window_chrome ) ? $window_chrome : array()
		);
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
	 * Normalize the order of supported window controls.
	 *
	 * @param mixed $order Raw order.
	 * @return string[]
	 */
	private function normalize_window_control_order( $order ) {
		if ( is_string( $order ) ) {
			$order = preg_split( '/[\s,]+/', $order );
		}

		if ( ! is_array( $order ) ) {
			return array();
		}

		$normalized = array();
		foreach ( $order as $control ) {
			$control = sanitize_key( (string) $control );
			if ( in_array( $control, array( 'close', 'minimize', 'maximize' ), true ) && ! in_array( $control, $normalized, true ) ) {
				$normalized[] = $control;
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
					'label'         => __( 'Default', 'wp-adminos' ),
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
	 * @return array<string,string>
	 */
	private function normalize_media_directory( $path ) {
		return $this->normalize_media_asset( $path, true );
	}

	/**
	 * Normalize a local media asset path and URL.
	 *
	 * @param mixed $path Raw path.
	 * @param bool  $directory Whether the asset is a directory.
	 * @return array<string,string>
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

		return array(
			'path' => $path,
			'url'  => WP_ADMINOS_URL . 'assets/media/' . $url_path,
		);
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
		$path = str_replace( '\\', '/', (string) $path );
		$path = ltrim( $path, '/' );

		if ( '' !== $prefix ) {
			$path = preg_replace( '#^' . preg_quote( $prefix, '#' ) . '#', '', $path );
		}

		$raw_parts = array_filter( explode( '/', $path ) );
		$parts     = array();

		foreach ( $raw_parts as $part ) {
			if ( '.' === $part || '..' === $part ) {
				continue;
			}

			$part = sanitize_file_name( $part );
			if ( '' !== $part ) {
				$parts[] = $part;
			}
		}

		return implode( '/', $parts );
	}
}
