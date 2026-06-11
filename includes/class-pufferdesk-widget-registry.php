<?php
/**
 * Desktop widget registry.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the widget data consumed by the shell and runtime.
 */
final class PufferDesk_Widget_Registry {
	const DEFAULT_CAPABILITY = 'read';
	const KIND_NATIVE = 'native';
	const NATIVE_CLOCK = 'clock';

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
				'label'            => __( 'Clock', 'pufferdesk-admin-desktop' ),
				'icon'             => $this->theme_icon( 'clock.svg', 'dashicons-clock' ),
				'kind'             => self::KIND_NATIVE,
				'native'           => self::NATIVE_CLOCK,
				'cap'              => self::DEFAULT_CAPABILITY,
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
		 * default_position, default_size, and refresh_interval. Missing, empty,
		 * or non-scalar cap values default to read during normalization.
		 * Positions accept left or right, and top or bottom.
		 *
		 * Icons may be a Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-clock' )
		 * array( 'type' => 'image', 'src' => 'themes/pufferdesk/default/icons/clock.svg' )
		 * array( 'type' => 'theme', 'name' => 'clock.svg', 'fallback' => 'dashicons-clock' )
		 *
		 * @param array<int,array<string,mixed>> $widgets Registered widgets.
		 */
		$widgets = apply_filters( 'pufferdesk_widgets', $widgets );

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

			$cap = $this->normalize_capability( isset( $widget['cap'] ) ? $widget['cap'] : self::DEFAULT_CAPABILITY );
			if ( ! current_user_can( $cap ) ) {
				continue;
			}

			$id       = sanitize_key( $widget['id'] );
			$label    = sanitize_text_field( $widget['label'] );
			$kind     = isset( $widget['kind'] ) ? sanitize_key( $widget['kind'] ) : self::KIND_NATIVE;
			$native   = isset( $widget['native'] ) ? sanitize_key( $widget['native'] ) : '';
			$template = isset( $widget['template'] ) ? PufferDesk_Path_Normalizer::normalize_relative_path( $widget['template'] ) : '';

			if ( '' === $id || '' === $label ) {
				continue;
			}

			if ( ! in_array( $kind, array( self::KIND_NATIVE ), true ) ) {
				$kind = self::KIND_NATIVE;
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
				'icon'             => isset( $widget['icon'] ) ? PufferDesk_Icon_Renderer::normalize( $widget['icon'] ) : PufferDesk_Icon_Renderer::normalize( PufferDesk_Icon_Renderer::DEFAULT_DASHICON ),
				'cap'              => $cap,
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
	 * Normalize a widget capability key.
	 *
	 * @param mixed $capability Raw capability.
	 * @return string
	 */
	private function normalize_capability( $capability ) {
		if ( is_array( $capability ) || is_object( $capability ) ) {
			return self::DEFAULT_CAPABILITY;
		}

		$capability = sanitize_key( (string) $capability );

		return '' !== $capability ? $capability : self::DEFAULT_CAPABILITY;
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
	 * Build a theme-aware icon descriptor with a Dashicon fallback.
	 *
	 * @param string $name Theme icon file name.
	 * @param string $fallback Dashicon fallback class.
	 * @return array<string,string>
	 */
	private function theme_icon( $name, $fallback ) {
		return array(
			'type'     => PufferDesk_Icon_Renderer::TYPE_THEME,
			'name'     => $name,
			'fallback' => $fallback,
		);
	}
}
