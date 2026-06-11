<?php
/**
 * App badge rendering helpers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders normalized app badge descriptors for shell surfaces.
 */
final class PufferDesk_App_Badge_Renderer {
	/**
	 * Build an accessible app label that includes badge context.
	 *
	 * @param string              $label App label.
	 * @param array<string,mixed> $badge Badge descriptor.
	 * @return string
	 */
	public static function get_aria_label( $label, $badge ) {
		$label = (string) $label;
		$badge = self::normalize( $badge );

		if ( '' === $badge['aria_label'] ) {
			return $label;
		}

		return sprintf(
			/* translators: 1: app label, 2: app badge accessibility label. */
			__( '%1$s, %2$s', 'pufferdesk-admin-desktop' ),
			$label,
			$badge['aria_label']
		);
	}

	/**
	 * Render an app badge span when the badge has text.
	 *
	 * @param array<string,mixed> $badge Badge descriptor.
	 */
	public static function render( $badge ) {
		$badge = self::normalize( $badge );

		if ( '' === $badge['text'] ) {
			return;
		}
		?>
		<span class="pdk-app-badge pdk-app-badge-<?php echo esc_attr( $badge['tone'] ); ?>" aria-hidden="true"><?php echo esc_html( $badge['text'] ); ?></span>
		<?php
	}

	/**
	 * Normalize badge fields needed for rendering.
	 *
	 * @param mixed $badge Raw badge descriptor.
	 * @return array{text:string,tone:string,aria_label:string}
	 */
	private static function normalize( $badge ) {
		$badge = is_array( $badge ) ? $badge : array();
		$tone  = isset( $badge['tone'] ) ? sanitize_html_class( (string) $badge['tone'] ) : PufferDesk_App_Badge_Normalizer::TONE_ATTENTION;
		if ( ! in_array( $tone, PufferDesk_App_Badge_Normalizer::get_tone_ids(), true ) ) {
			$tone = PufferDesk_App_Badge_Normalizer::TONE_ATTENTION;
		}

		return array(
			'text'       => isset( $badge['text'] ) ? (string) $badge['text'] : '',
			'tone'       => $tone,
			'aria_label' => isset( $badge['aria_label'] ) ? (string) $badge['aria_label'] : '',
		);
	}
}
