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
			'macos-base' => array(
				'id'             => 'macos-base',
				'label'          => __( 'macOS Base', 'admin-os-mode' ),
				'family'         => 'macos',
				'family_label'   => __( 'macOS', 'admin-os-mode' ),
				'version'        => 'base',
				'version_label'  => __( 'Base', 'admin-os-mode' ),
				'stylesheet'     => 'macos/base.css',
				'welcome_kicker' => __( 'macOS workspace', 'admin-os-mode' ),
				'abstract'       => true,
			),
			'macos' => array(
				'id'             => 'macos',
				'label'          => __( 'macOS', 'admin-os-mode' ),
				'family'         => 'macos',
				'family_label'   => __( 'macOS', 'admin-os-mode' ),
				'version'        => 'default',
				'version_label'  => __( 'Default', 'admin-os-mode' ),
				'parent'         => 'macos-base',
				'stylesheet'     => 'macos/default.css',
				'media'          => array(
					'icon_pack'   => 'themes/macos/default/icons',
					'cursor_pack' => 'themes/macos/default/cursors',
				),
			),
		);

		/**
		 * Filter Admin OS themes.
		 *
		 * Theme keys are stable IDs. Values accept:
		 * id, label, family, family_label, version, version_label, parent,
		 * stylesheet, stylesheets, media, wallpaper, icon_pack, cursor_pack,
		 * welcome_kicker, and abstract.
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
				'welcome_kicker' => isset( $theme['welcome_kicker'] ) ? sanitize_text_field( $theme['welcome_kicker'] ) : '',
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
		$theme['welcome_kicker']    = $theme['welcome_kicker'] ? $theme['welcome_kicker'] : $parent['welcome_kicker'];
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

		return $merged;
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
