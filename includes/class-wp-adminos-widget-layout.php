<?php
/**
 * Widget layout attribute helpers.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts widget registry layout data into safe template attributes.
 */
final class WP_AdminOS_Widget_Layout {
	/**
	 * Render widget layout attributes for a desktop widget element.
	 *
	 * @param array<string,mixed> $widget Widget data.
	 */
	public static function render_attributes( $widget ) {
		foreach ( self::get_attributes( $widget ) as $name => $value ) {
			printf(
				"\n\t%s=\"%s\"",
				esc_attr( $name ),
				esc_attr( $value )
			);
		}
	}

	/**
	 * Build widget layout attributes.
	 *
	 * @param array<string,mixed> $widget Widget data.
	 * @return array<string,string>
	 */
	private static function get_attributes( $widget ) {
		$position = isset( $widget['default_position'] ) && is_array( $widget['default_position'] ) ? $widget['default_position'] : array();
		$size     = isset( $widget['default_size'] ) && is_array( $widget['default_size'] ) ? $widget['default_size'] : array();
		$left     = isset( $position['left'] ) ? absint( $position['left'] ) : null;
		$right    = isset( $position['right'] ) ? absint( $position['right'] ) : null;
		$top      = isset( $position['top'] ) ? absint( $position['top'] ) : null;
		$bottom   = isset( $position['bottom'] ) ? absint( $position['bottom'] ) : null;
		$width    = isset( $size['width'] ) ? max( 120, absint( $size['width'] ) ) : WP_AdminOS_Widget_Registry::DEFAULT_WIDTH;
		$height   = isset( $size['height'] ) ? max( 80, absint( $size['height'] ) ) : WP_AdminOS_Widget_Registry::DEFAULT_HEIGHT;

		if ( null === $left && null === $right ) {
			$left = 24;
		}

		if ( null === $top && null === $bottom ) {
			$top = 24;
		}

		$attributes = array();
		$style      = array();

		if ( null !== $left ) {
			$attributes['data-aos-widget-left'] = (string) $left;
			$style[] = sprintf( 'left:%dpx', $left );
		} else {
			$attributes['data-aos-widget-right'] = (string) $right;
			$style[] = sprintf( 'right:%dpx', $right );
		}

		if ( null !== $top ) {
			$attributes['data-aos-widget-top'] = (string) $top;
			$style[] = sprintf( 'top:%dpx', $top );
		} else {
			$attributes['data-aos-widget-bottom'] = (string) $bottom;
			$style[] = sprintf( 'bottom:%dpx', $bottom );
		}

		$attributes['data-aos-widget-width']  = (string) $width;
		$attributes['data-aos-widget-height'] = (string) $height;
		$attributes['style']                  = implode( ';', array_merge( $style, array( sprintf( 'width:%dpx', $width ), sprintf( 'height:%dpx', $height ) ) ) ) . ';';

		return $attributes;
	}
}
