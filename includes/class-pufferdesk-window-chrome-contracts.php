<?php
/**
 * Shared window chrome contracts.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns reusable window chrome IDs, defaults, and client contract metadata.
 */
final class PufferDesk_Window_Chrome_Contracts {
	const CONTROL_CLOSE    = 'close';
	const CONTROL_MINIMIZE = 'minimize';
	const CONTROL_MAXIMIZE = 'maximize';

	const PLACEMENT_LEFT  = 'left';
	const PLACEMENT_RIGHT = 'right';

	const STYLE_TRAFFIC = 'traffic';
	const STYLE_CAPTION = 'caption';
	const STYLE_TOOLBAR = 'toolbar';
	const STYLE_HIDDEN  = 'hidden';

	const TITLE_ALIGNMENT_LEFT   = 'left';
	const TITLE_ALIGNMENT_CENTER = 'center';
	const TITLE_ALIGNMENT_RIGHT  = 'right';

	/**
	 * Supported window control IDs.
	 *
	 * @return string[]
	 */
	public static function get_control_ids() {
		return array(
			self::CONTROL_CLOSE,
			self::CONTROL_MINIMIZE,
			self::CONTROL_MAXIMIZE,
		);
	}

	/**
	 * Supported control placements.
	 *
	 * @return string[]
	 */
	public static function get_control_placements() {
		return array(
			self::PLACEMENT_LEFT,
			self::PLACEMENT_RIGHT,
		);
	}

	/**
	 * Supported control styles.
	 *
	 * @return string[]
	 */
	public static function get_control_styles() {
		return array(
			self::STYLE_TRAFFIC,
			self::STYLE_CAPTION,
			self::STYLE_TOOLBAR,
			self::STYLE_HIDDEN,
		);
	}

	/**
	 * Supported title alignment values.
	 *
	 * @return string[]
	 */
	public static function get_title_alignments() {
		return array(
			self::TITLE_ALIGNMENT_LEFT,
			self::TITLE_ALIGNMENT_CENTER,
			self::TITLE_ALIGNMENT_RIGHT,
		);
	}

	/**
	 * DOM dataset attribute names for titlebar controls.
	 *
	 * @return array<string,string>
	 */
	public static function get_control_dataset_attributes() {
		return array(
			self::CONTROL_CLOSE    => 'data-pdk-close',
			self::CONTROL_MINIMIZE => 'data-pdk-minimize',
			self::CONTROL_MAXIMIZE => 'data-pdk-maximize',
		);
	}

	/**
	 * DOM dataset property names for browser-created titlebar controls.
	 *
	 * @return array<string,string>
	 */
	public static function get_control_dataset_actions() {
		return array(
			self::CONTROL_CLOSE    => 'pdkClose',
			self::CONTROL_MINIMIZE => 'pdkMinimize',
			self::CONTROL_MAXIMIZE => 'pdkMaximize',
		);
	}

	/**
	 * CSS modifier names for titlebar controls.
	 *
	 * @return array<string,string>
	 */
	public static function get_control_modifiers() {
		return array(
			self::CONTROL_CLOSE    => self::CONTROL_CLOSE,
			self::CONTROL_MINIMIZE => self::CONTROL_MINIMIZE,
			self::CONTROL_MAXIMIZE => self::CONTROL_MAXIMIZE,
		);
	}

	/**
	 * Default translated window chrome config.
	 *
	 * @return array<string,mixed>
	 */
	public static function default_config() {
		return array(
			'controls' => array(
				'placement' => self::PLACEMENT_LEFT,
				'order'     => self::get_control_ids(),
				'style'     => self::STYLE_TRAFFIC,
				'labels'    => array(
					self::CONTROL_CLOSE    => __( 'Close', 'pufferdesk' ),
					self::CONTROL_MINIMIZE => __( 'Minimize', 'pufferdesk' ),
					self::CONTROL_MAXIMIZE => __( 'Maximize', 'pufferdesk' ),
				),
			),
			'title'    => array(
				'alignment' => self::TITLE_ALIGNMENT_LEFT,
				'show_icon' => true,
			),
		);
	}

	/**
	 * Normalize a partial theme window chrome config.
	 *
	 * @param mixed $window_chrome Raw window chrome config.
	 * @return array<string,mixed>
	 */
	public static function normalize_config( $window_chrome ) {
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
			if ( in_array( $placement, self::get_control_placements(), true ) ) {
				$normalized['controls']['placement'] = $placement;
			}
		}

		if ( array_key_exists( 'style', $controls ) ) {
			$style = sanitize_key( (string) $controls['style'] );
			if ( in_array( $style, self::get_control_styles(), true ) ) {
				$normalized['controls']['style'] = $style;
			}
		}

		if ( isset( $controls['order'] ) ) {
			$order = self::normalize_control_order( $controls['order'] );
			if ( ! empty( $order ) ) {
				$normalized['controls']['order'] = $order;
			}
		}

		if ( isset( $controls['labels'] ) && is_array( $controls['labels'] ) ) {
			$labels = self::normalize_string_map( $controls['labels'], self::get_control_ids() );
			if ( ! empty( $labels ) ) {
				$normalized['controls']['labels'] = $labels;
			}
		}

		if ( array_key_exists( 'alignment', $title ) ) {
			$alignment = sanitize_key( (string) $title['alignment'] );
			if ( in_array( $alignment, self::get_title_alignments(), true ) ) {
				$normalized['title']['alignment'] = $alignment;
			}
		}

		if ( array_key_exists( 'show_icon', $title ) ) {
			$normalized['title']['show_icon'] = (bool) $title['show_icon'];
		}

		return $normalized;
	}

	/**
	 * Apply defaults to a normalized window chrome config.
	 *
	 * @param mixed $window_chrome Window chrome config.
	 * @return array<string,mixed>
	 */
	public static function complete_config( $window_chrome ) {
		return self::merge_config(
			self::default_config(),
			is_array( $window_chrome ) ? $window_chrome : array()
		);
	}

	/**
	 * Browser-facing window chrome contract.
	 *
	 * @return array<string,mixed>
	 */
	public static function client_contract() {
		return array(
			'controlIds'            => array(
				'CLOSE'    => self::CONTROL_CLOSE,
				'MINIMIZE' => self::CONTROL_MINIMIZE,
				'MAXIMIZE' => self::CONTROL_MAXIMIZE,
			),
			'controlDatasetActions' => self::get_control_dataset_actions(),
			'controlModifiers'      => self::get_control_modifiers(),
			'controls'              => self::get_control_ids(),
			'defaultConfig'         => self::default_config(),
			'placements'            => self::get_control_placements(),
			'styles'                => self::get_control_styles(),
			'titleAlignments'       => self::get_title_alignments(),
		);
	}

	/**
	 * Normalize the order of supported window controls.
	 *
	 * @param mixed $order Raw order.
	 * @return string[]
	 */
	private static function normalize_control_order( $order ) {
		if ( is_string( $order ) ) {
			$order = preg_split( '/[\s,]+/', $order );
		}

		if ( ! is_array( $order ) ) {
			return array();
		}

		$normalized = array();
		foreach ( $order as $control ) {
			$control = sanitize_key( (string) $control );
			if ( in_array( $control, self::get_control_ids(), true ) && ! in_array( $control, $normalized, true ) ) {
				$normalized[] = $control;
			}
		}

		return $normalized;
	}

	/**
	 * Normalize a string map.
	 *
	 * @param mixed    $labels       Raw labels.
	 * @param string[] $allowed_keys Allowed keys.
	 * @return array<string,string>
	 */
	private static function normalize_string_map( $labels, $allowed_keys ) {
		$normalized = array();
		if ( ! is_array( $labels ) ) {
			return $normalized;
		}

		foreach ( $labels as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || ! in_array( $key, $allowed_keys, true ) ) {
				continue;
			}

			$value = sanitize_text_field( (string) $value );
			if ( '' !== $value ) {
				$normalized[ $key ] = $value;
			}
		}

		return $normalized;
	}

	/**
	 * Merge nested config while replacing list arrays.
	 *
	 * @param mixed $base     Base config.
	 * @param mixed $override Override config.
	 * @return mixed
	 */
	private static function merge_config( $base, $override ) {
		if ( ! is_array( $base ) || ! is_array( $override ) ) {
			return $override;
		}

		$merged = $base;
		foreach ( $override as $key => $value ) {
			if (
				isset( $merged[ $key ] )
				&& is_array( $merged[ $key ] )
				&& is_array( $value )
				&& self::is_associative_array( $merged[ $key ] )
				&& self::is_associative_array( $value )
			) {
				$merged[ $key ] = self::merge_config( $merged[ $key ], $value );
				continue;
			}

			$merged[ $key ] = $value;
		}

		return $merged;
	}

	/**
	 * Whether an array uses string keys.
	 *
	 * @param array<mixed> $value Value to inspect.
	 * @return bool
	 */
	private static function is_associative_array( $value ) {
		if ( array() === $value ) {
			return false;
		}

		return array_keys( $value ) !== range( 0, count( $value ) - 1 );
	}
}
