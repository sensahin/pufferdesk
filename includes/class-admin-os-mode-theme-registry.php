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
			'modern-base' => array(
				'id'             => 'modern-base',
				'label'          => __( 'Modern OS Base', 'admin-os-mode' ),
				'family'         => 'modern',
				'family_label'   => __( 'Modern OS', 'admin-os-mode' ),
				'version'        => 'base',
				'version_label'  => __( 'Base', 'admin-os-mode' ),
				'stylesheet'     => 'modern/base.css',
				'welcome_kicker' => __( 'Modern OS workspace', 'admin-os-mode' ),
				'abstract'       => true,
			),
			'modern-os' => array(
				'id'             => 'modern-os',
				'label'          => __( 'Modern OS', 'admin-os-mode' ),
				'family'         => 'modern',
				'family_label'   => __( 'Modern OS', 'admin-os-mode' ),
				'version'        => 'current',
				'version_label'  => __( 'Current', 'admin-os-mode' ),
				'parent'         => 'modern-base',
				'stylesheet'     => 'modern/current.css',
			),
		);

		/**
		 * Filter Admin OS themes.
		 *
		 * Theme keys are stable IDs. Values accept:
		 * id, label, family, family_label, version, version_label, parent,
		 * stylesheet, stylesheets, welcome_kicker, and abstract.
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
	 * Sanitize a relative CSS path below assets/css/themes.
	 *
	 * @param string $path Raw path.
	 * @return string
	 */
	private function sanitize_stylesheet_path( $path ) {
		$parts = array_filter( explode( '/', (string) $path ) );
		$parts = array_map( 'sanitize_file_name', $parts );
		$parts = array_filter( $parts );

		return implode( '/', $parts );
	}
}
