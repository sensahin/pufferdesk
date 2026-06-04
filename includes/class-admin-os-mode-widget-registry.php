<?php
/**
 * Desktop widget registry.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the widget data consumed by the shell and runtime.
 */
final class Admin_OS_Mode_Widget_Registry {
	/**
	 * Default width for widgets without an explicit size.
	 *
	 * @var int
	 */
	const DEFAULT_WIDTH = 220;

	/**
	 * Default height for widgets without an explicit size.
	 *
	 * @var int
	 */
	const DEFAULT_HEIGHT = 112;

	/**
	 * Widget registry for the first shell.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_widgets() {
		$widgets = array(
			array(
				'id'               => 'clock',
				'label'            => __( 'Clock', 'admin-os-mode' ),
				'icon'             => $this->theme_icon( 'clock.svg', 'dashicons-clock' ),
				'kind'             => 'native',
				'native'           => 'clock',
				'cap'              => 'read',
				'default_position' => array(
					'right' => 24,
					'top'   => 24,
				),
				'default_size'     => array(
					'width'  => self::DEFAULT_WIDTH,
					'height' => self::DEFAULT_HEIGHT,
				),
				'refresh_interval' => 30000,
			),
		);

		/**
		 * Filter the desktop widget registry.
		 *
		 * Each widget accepts id, label, icon, cap, kind, native, template,
		 * default_position, default_size, and refresh_interval.
		 * Positions accept left or right, and top or bottom.
		 *
		 * Icons may be a Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-clock' )
		 * array( 'type' => 'image', 'src' => 'themes/adminos/default/icons/clock.svg' )
		 * array( 'type' => 'theme', 'name' => 'clock.svg', 'fallback' => 'dashicons-clock' )
		 *
		 * @param array<int,array<string,mixed>> $widgets Registered widgets.
		 */
		$widgets = apply_filters( 'admin_os_mode_widgets', $widgets );

		return $this->normalize_widgets( $widgets );
	}

	/**
	 * Normalize and permission-check widget data.
	 *
	 * @param mixed $widgets Raw widget data.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_widgets( $widgets ) {
		$normalized = array();

		if ( ! is_array( $widgets ) ) {
			return $normalized;
		}

		foreach ( $widgets as $widget ) {
			if ( ! is_array( $widget ) || empty( $widget['id'] ) || empty( $widget['label'] ) ) {
				continue;
			}

			if ( ! empty( $widget['cap'] ) && ! current_user_can( $widget['cap'] ) ) {
				continue;
			}

			$id       = sanitize_key( $widget['id'] );
			$label    = sanitize_text_field( $widget['label'] );
			$kind     = isset( $widget['kind'] ) ? sanitize_key( $widget['kind'] ) : 'native';
			$native   = isset( $widget['native'] ) ? sanitize_key( $widget['native'] ) : '';
			$template = isset( $widget['template'] ) ? $this->normalize_template_path( $widget['template'] ) : '';

			if ( '' === $id || '' === $label ) {
				continue;
			}

			if ( ! in_array( $kind, array( 'native' ), true ) ) {
				$kind = 'native';
			}

			if ( '' === $native ) {
				continue;
			}

			if ( '' === $template ) {
				$template = 'widgets/' . $native . '.php';
			}

			$normalized[] = array(
				'id'               => $id,
				'label'            => $label,
				'icon'             => isset( $widget['icon'] ) ? Admin_OS_Mode_Icon_Renderer::normalize( $widget['icon'] ) : Admin_OS_Mode_Icon_Renderer::normalize( 'dashicons-admin-generic' ),
				'kind'             => $kind,
				'native'           => $native,
				'template'         => $template,
				'default_position' => $this->normalize_position( isset( $widget['default_position'] ) ? $widget['default_position'] : array() ),
				'default_size'     => $this->normalize_size( isset( $widget['default_size'] ) ? $widget['default_size'] : array() ),
				'refresh_interval' => isset( $widget['refresh_interval'] ) ? max( 0, absint( $widget['refresh_interval'] ) ) : 0,
			);
		}

		return $normalized;
	}

	/**
	 * Normalize widget default position.
	 *
	 * @param mixed $position Raw position.
	 * @return array<string,int>
	 */
	private function normalize_position( $position ) {
		if ( ! is_array( $position ) ) {
			$position = array();
		}

		$normalized = array();

		if ( isset( $position['right'] ) && ! isset( $position['left'] ) ) {
			$normalized['right'] = max( 0, absint( $position['right'] ) );
		} else {
			$normalized['left'] = isset( $position['left'] ) ? max( 0, absint( $position['left'] ) ) : 24;
		}

		if ( isset( $position['bottom'] ) && ! isset( $position['top'] ) ) {
			$normalized['bottom'] = max( 0, absint( $position['bottom'] ) );
		} else {
			$normalized['top'] = isset( $position['top'] ) ? max( 0, absint( $position['top'] ) ) : 24;
		}

		return $normalized;
	}

	/**
	 * Normalize widget default size.
	 *
	 * @param mixed $size Raw size.
	 * @return array<string,int>
	 */
	private function normalize_size( $size ) {
		if ( ! is_array( $size ) ) {
			$size = array();
		}

		return array(
			'width'  => isset( $size['width'] ) ? max( 120, absint( $size['width'] ) ) : self::DEFAULT_WIDTH,
			'height' => isset( $size['height'] ) ? max( 80, absint( $size['height'] ) ) : self::DEFAULT_HEIGHT,
		);
	}

	/**
	 * Sanitize a relative template path while preserving semantic folders.
	 *
	 * @param string $template Template path.
	 * @return string
	 */
	private function normalize_template_path( $template ) {
		$template = str_replace( '\\', '/', (string) $template );
		$template = ltrim( $template, '/' );
		$parts    = array_filter( explode( '/', $template ) );

		$normalized = array();
		foreach ( $parts as $part ) {
			if ( '.' === $part || '..' === $part ) {
				continue;
			}

			$part = sanitize_file_name( $part );
			if ( '' !== $part ) {
				$normalized[] = $part;
			}
		}

		return implode( '/', $normalized );
	}

	/**
	 * Build a theme-aware icon descriptor with a Dashicon fallback.
	 *
	 * @param string $name Theme icon file name.
	 * @param string $fallback Dashicon fallback class.
	 * @return array<string,string>
	 */
	private function theme_icon( $name, $fallback ) {
		return array(
			'type'     => 'theme',
			'name'     => $name,
			'fallback' => $fallback,
		);
	}
}
