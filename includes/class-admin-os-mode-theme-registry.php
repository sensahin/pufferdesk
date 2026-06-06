<?php
/**
 * Theme registry.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns OS theme metadata and lookup.
 */
final class Admin_OS_Mode_Theme_Registry {
	/**
	 * Get all registered themes.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public function get_themes() {
		$themes = array(
			'adminos-base' => array(
				'id'             => 'adminos-base',
				'label'          => __( 'Admin OS Base', 'admin-os-mode' ),
				'family'         => 'adminos',
				'family_label'   => __( 'Admin OS', 'admin-os-mode' ),
				'version'        => 'base',
				'version_label'  => __( 'Base', 'admin-os-mode' ),
				'stylesheet'     => 'adminos/base.css',
				'abstract'       => true,
			),
			'adminos' => array(
				'id'             => 'adminos',
				'label'          => __( 'Admin OS', 'admin-os-mode' ),
				'family'         => 'adminos',
				'family_label'   => __( 'Admin OS', 'admin-os-mode' ),
				'version'        => 'default',
				'version_label'  => __( 'Default', 'admin-os-mode' ),
				'parent'         => 'adminos-base',
				'stylesheet'     => 'adminos/default.css',
				'media'          => array(
					'wallpapers'  => array(
						'default' => 'aurora-flow',
						'items'   => array(
							array(
								'id'        => 'aurora-flow',
								'label'     => __( 'Aurora', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.34), transparent 24%), radial-gradient(circle at 78% 18%, rgba(46, 211, 255, 0.38), transparent 30%), linear-gradient(135deg, #2447c7 0%, #2fb8d2 52%, #8d3cff 100%)',
							),
							array(
								'id'        => 'aqua-horizon',
								'label'     => __( 'Aqua', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.46), transparent 22%), linear-gradient(120deg, #1d5fbf 0%, #1eb4c9 55%, #62f1dc 100%)',
							),
							array(
								'id'        => 'alpine-mist',
								'label'     => __( 'Alpine', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 76% 22%, rgba(255, 255, 255, 0.42), transparent 24%), linear-gradient(130deg, #16406d 0%, #3a8e9b 48%, #9ac77c 100%)',
							),
							array(
								'id'        => 'canyon-light',
								'label'     => __( 'Canyon', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 72% 18%, rgba(255, 231, 174, 0.45), transparent 28%), linear-gradient(125deg, #ff5c39 0%, #d83c7d 48%, #783fd6 100%)',
							),
							array(
								'id'        => 'coral-ridge',
								'label'     => __( 'Coral', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.38), transparent 24%), linear-gradient(120deg, #ff4438 0%, #ee2d7a 52%, #b22ed5 100%)',
							),
							array(
								'id'        => 'ember',
								'label'     => __( 'Ember', 'admin-os-mode' ),
								'css_value' => 'linear-gradient(135deg, #ffffc4 0.000%, #ff6164 50.000%, #b00012 100.000%)',
							),
							array(
								'id'        => 'lagoon-glow',
								'label'     => __( 'Lagoon', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 80% 20%, rgba(227, 255, 241, 0.36), transparent 26%), linear-gradient(135deg, #0c6a88 0%, #18b5b7 54%, #69ddbb 100%)',
							),
							array(
								'id'        => 'violet-wave',
								'label'     => __( 'Violet', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.3), transparent 22%), linear-gradient(130deg, #2b4fcf 0%, #7042d8 46%, #df46a6 100%)',
							),
							array(
								'id'        => 'sunset-field',
								'label'     => __( 'Sunset', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 74% 18%, rgba(255, 239, 170, 0.48), transparent 24%), linear-gradient(120deg, #ff7a18 0%, #ff3f68 48%, #6d4cf5 100%)',
							),
							array(
								'id'        => 'mint-haze',
								'label'     => __( 'Mint', 'admin-os-mode' ),
								'css_value' => 'radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.4), transparent 24%), linear-gradient(135deg, #207a68 0%, #6ac99d 52%, #b4d676 100%)',
							),
							array(
								'id'        => 'nightfall',
								'label'     => __( 'Nightfall', 'admin-os-mode' ),
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
		 * Filter Admin OS themes.
		 *
		 * Theme keys are stable IDs. Values accept:
		 * id, label, family, family_label, version, version_label, parent,
			 * stylesheet, stylesheets, media, wallpaper, wallpapers, icon_pack,
			 * cursor_pack, and abstract.
		 *
		 * @param array<string,array<string,mixed>> $themes Registered themes.
		 */
		$themes = apply_filters( 'admin_os_mode_themes', $themes );

		return $this->normalize_themes( $themes );
	}

	/**
	 * Get the current user's theme.
	 *
	 * @param Admin_OS_Mode_User_Preferences $preferences User preferences.
	 * @return array<string,mixed>
	 */
	public function get_current_theme( Admin_OS_Mode_User_Preferences $preferences ) {
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
			return $theme;
		}

		$seen[ $theme_id ] = true;
		$parent_id         = isset( $theme['parent'] ) ? $theme['parent'] : '';
		if ( '' === $parent_id || empty( $themes[ $parent_id ] ) ) {
			$theme['stylesheet_stack'] = $theme['stylesheets'];
			$theme['ancestors']        = array();
			return $theme;
		}

		$parent = $this->resolve_theme( $parent_id, $themes, $seen );

			$theme['family']            = $theme['family'] ? $theme['family'] : $parent['family'];
			$theme['family_label']      = $theme['family_label'] ? $theme['family_label'] : $parent['family_label'];
			$theme['media']             = $this->merge_media( $parent['media'], $theme['media'] );
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
							'id'        => $id,
							'label'     => isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : $id,
							'css_value' => $css_value,
							'preview'   => isset( $item['preview'] ) ? $this->sanitize_css_image_value( $item['preview'] ) : $css_value,
							'fit'       => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
							'position'  => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
						);
						continue;
					}

					$file = $this->normalize_media_file( isset( $item['path'] ) ? $item['path'] : ( isset( $item['file'] ) ? $item['file'] : '' ) );
					if ( ! empty( $file['url'] ) ) {
						$normalized['items'][] = array(
							'id'       => $id,
							'label'    => isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : $id,
							'path'     => $file['path'],
							'url'      => $file['url'],
							'fit'      => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
							'position' => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
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
					'id'       => 'default',
					'label'    => __( 'Default', 'admin-os-mode' ),
					'path'     => $file['path'],
					'url'      => $file['url'],
					'fit'      => 'cover',
					'position' => 'center center',
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
			'url'  => ADMIN_OS_MODE_URL . 'assets/media/' . $url_path,
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
