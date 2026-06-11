<?php
/**
 * Shared tooltip rendering helpers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders static tooltip markup for PHP shell templates.
 */
final class PufferDesk_Tooltip_Renderer {
	const PLACEMENT_TOP    = 'top';
	const PLACEMENT_RIGHT  = 'right';
	const PLACEMENT_BOTTOM = 'bottom';
	const PLACEMENT_LEFT   = 'left';

	/**
	 * Supported tooltip placement IDs.
	 *
	 * @return string[]
	 */
	public static function get_placement_ids() {
		return array(
			self::PLACEMENT_TOP,
			self::PLACEMENT_RIGHT,
			self::PLACEMENT_BOTTOM,
			self::PLACEMENT_LEFT,
		);
	}

	/**
	 * Build trigger data attributes for a tooltip target.
	 *
	 * @param string              $label Tooltip label.
	 * @param array<string,mixed> $options Tooltip options.
	 * @return string
	 */
	public static function get_trigger_attributes( $label, $options = array() ) {
		$label     = (string) $label;
		$placement = self::normalize_placement( isset( $options['placement'] ) ? $options['placement'] : self::PLACEMENT_TOP );
		$surface   = self::normalize_surface( isset( $options['surface'] ) ? $options['surface'] : '' );
		$attrs     = array(
			'data-pdk-tooltip'           => $label,
			'data-pdk-tooltip-placement' => $placement,
		);

		if ( '' !== $surface ) {
			$attrs['data-pdk-tooltip-surface'] = $surface;
		}

		$output = '';
		foreach ( $attrs as $name => $value ) {
			$output .= sprintf( ' %s="%s"', esc_attr( $name ), esc_attr( $value ) );
		}

		return $output;
	}

	/**
	 * Render tooltip markup.
	 *
	 * @param string              $label Tooltip label.
	 * @param array<string,mixed> $options Tooltip options.
	 */
	public static function render( $label, $options = array() ) {
		$label = (string) $label;
		if ( '' === $label ) {
			return;
		}

		$surface   = self::normalize_surface( isset( $options['surface'] ) ? $options['surface'] : '' );
		$placement = self::normalize_placement( isset( $options['placement'] ) ? $options['placement'] : self::PLACEMENT_TOP );
		$classes   = array( 'pdk-tooltip' );

		if ( '' !== $surface ) {
			$classes[] = 'pdk-' . $surface . '-tooltip';
		}

		if ( ! empty( $options['class'] ) ) {
			$classes[] = sanitize_html_class( (string) $options['class'] );
		}

		printf(
			'<span class="%1$s" data-pdk-tooltip-placement="%2$s" aria-hidden="true">%3$s</span>',
			esc_attr( implode( ' ', array_filter( $classes ) ) ),
			esc_attr( $placement ),
			esc_html( $label )
		);
	}

	/**
	 * Normalize supported tooltip placements.
	 *
	 * @param mixed $placement Raw placement.
	 * @return string
	 */
	private static function normalize_placement( $placement ) {
		$placement = sanitize_key( (string) $placement );

		return in_array( $placement, self::get_placement_ids(), true ) ? $placement : self::PLACEMENT_TOP;
	}

	/**
	 * Normalize an optional tooltip visual surface.
	 *
	 * @param mixed $surface Raw surface.
	 * @return string
	 */
	private static function normalize_surface( $surface ) {
		return sanitize_html_class( (string) $surface );
	}
}
