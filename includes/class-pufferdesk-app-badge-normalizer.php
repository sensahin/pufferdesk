<?php
/**
 * App badge normalization.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes badge descriptors from registry data and WordPress admin menu HTML.
 */
final class PufferDesk_App_Badge_Normalizer {
	const TONE_ATTENTION = 'attention';
	const TONE_NEUTRAL   = 'neutral';
	const TONE_UPDATE    = 'update';

	/**
	 * Supported badge tone IDs.
	 *
	 * @return string[]
	 */
	public static function get_tone_ids() {
		return array(
			self::TONE_ATTENTION,
			self::TONE_NEUTRAL,
			self::TONE_UPDATE,
		);
	}

	/**
	 * Extract a notification badge from WordPress admin menu title HTML.
	 *
	 * @param string $menu_title Raw menu title.
	 * @return array<string,mixed>
	 */
	public function from_admin_menu_title( $menu_title ) {
		$menu_title = is_string( $menu_title ) ? $menu_title : '';
		if ( '' === $menu_title || false === stripos( $menu_title, '<span' ) ) {
			return array();
		}

		if ( ! preg_match_all( '#<span\b([^>]*)>(.*?)</span>#is', $menu_title, $matches, PREG_SET_ORDER ) ) {
			return array();
		}

		$aria_label = $this->get_admin_menu_badge_screen_reader_label( $matches );

		foreach ( $matches as $match ) {
			$attributes = isset( $match[1] ) ? (string) $match[1] : '';
			$classes    = $this->get_html_attribute_value( $attributes, 'class' );
			if ( ! $this->is_admin_menu_badge_class( $classes ) ) {
				continue;
			}

			$content = isset( $match[2] ) ? (string) $match[2] : '';
			$count   = $this->get_admin_menu_badge_count( $classes, $content );
			if ( $count <= 0 ) {
				continue;
			}

			return array(
				'text'       => $this->get_admin_menu_badge_text( $content, $count ),
				'count'      => $count,
				'tone'       => $this->get_admin_menu_badge_tone( $classes ),
				'aria_label' => $aria_label,
				'source'     => 'wp-menu',
			);
		}

		return array();
	}

	/**
	 * Normalize an optional app badge descriptor.
	 *
	 * @param mixed $badge Raw badge descriptor.
	 * @return array<string,mixed>
	 */
	public function normalize( $badge ) {
		if ( is_scalar( $badge ) ) {
			$badge = array(
				'text' => $badge,
			);
		}

		if ( ! is_array( $badge ) ) {
			return array();
		}

		$count = isset( $badge['count'] ) ? absint( $badge['count'] ) : 0;
		$text  = isset( $badge['text'] ) ? $this->sanitize_text( $badge['text'] ) : '';
		if ( '' === $text && $count > 0 ) {
			$text = number_format_i18n( $count );
		}

		if ( '' === $text || '0' === $text ) {
			return array();
		}

		if ( 0 === $count ) {
			$digits = preg_replace( '/[^\d]/', '', $text );
			$count  = '' !== $digits && is_string( $digits ) ? absint( $digits ) : 0;
		}

		$tone = isset( $badge['tone'] ) ? sanitize_key( $badge['tone'] ) : self::TONE_ATTENTION;
		if ( ! in_array( $tone, self::get_tone_ids(), true ) ) {
			$tone = self::TONE_ATTENTION;
		}

		$aria_label = isset( $badge['aria_label'] ) ? $this->sanitize_text( $badge['aria_label'] ) : '';
		if ( '' === $aria_label ) {
			$aria_label = $count > 0
				? sprintf(
					/* translators: %s: Notification count. */
					_n( '%s notification', '%s notifications', $count, 'pufferdesk-admin-desktop' ),
					$text
				)
				: sprintf(
					/* translators: %s: Badge text. */
					__( '%s status', 'pufferdesk-admin-desktop' ),
					$text
				);
		}

		$normalized = array(
			'text'       => $text,
			'tone'       => $tone,
			'aria_label' => $aria_label,
		);

		if ( $count > 0 ) {
			$normalized['count'] = $count;
		}

		if ( ! empty( $badge['source'] ) ) {
			$normalized['source'] = sanitize_key( $badge['source'] );
		}

		return $normalized;
	}

	/**
	 * Sanitize text extracted from admin menu badge HTML.
	 *
	 * @param mixed $text Raw text.
	 * @return string
	 */
	public function sanitize_text( $text ) {
		$text = html_entity_decode( (string) $text, ENT_QUOTES );
		$text = wp_strip_all_tags( $text );
		$text = preg_replace( '/\s+/', ' ', $text );

		return sanitize_text_field( trim( is_string( $text ) ? $text : '' ) );
	}

	/**
	 * Extract screen-reader copy bundled with a menu badge.
	 *
	 * @param array<int,array<int,string>> $spans Parsed span matches.
	 * @return string
	 */
	private function get_admin_menu_badge_screen_reader_label( $spans ) {
		foreach ( $spans as $span ) {
			$attributes = isset( $span[1] ) ? (string) $span[1] : '';
			$classes    = $this->get_html_attribute_value( $attributes, 'class' );
			if ( ! $this->has_html_class( $classes, 'screen-reader-text' ) ) {
				continue;
			}

			$label = $this->sanitize_text( isset( $span[2] ) ? $span[2] : '' );
			if ( '' !== $label ) {
				return $label;
			}
		}

		return '';
	}

	/**
	 * Check whether a span class list represents a WordPress menu counter.
	 *
	 * @param string $classes Class attribute value.
	 * @return bool
	 */
	private function is_admin_menu_badge_class( $classes ) {
		if ( '' === $classes ) {
			return false;
		}

		$badge_classes = array(
			'awaiting-mod',
			'menu-counter',
			'pending-count',
			'plugin-count',
			'site-health-counter',
			'theme-count',
			'update-count',
			'update-plugins',
		);

		foreach ( $badge_classes as $badge_class ) {
			if ( $this->has_html_class( $classes, $badge_class ) ) {
				return true;
			}
		}

		return (bool) preg_match( '/(?:^|\s)count-\d+(?:\s|$)/', $classes );
	}

	/**
	 * Extract a numeric count from menu badge classes or content.
	 *
	 * @param string $classes Badge class list.
	 * @param string $content Badge content.
	 * @return int
	 */
	private function get_admin_menu_badge_count( $classes, $content ) {
		if ( preg_match( '/(?:^|\s)count-(\d+)(?:\s|$)/', $classes, $matches ) ) {
			return absint( $matches[1] );
		}

		$text   = $this->sanitize_text( $content );
		$digits = preg_replace( '/[^\d]/', '', $text );

		return '' !== $digits && is_string( $digits ) ? absint( $digits ) : 0;
	}

	/**
	 * Get the display text for a normalized admin menu badge.
	 *
	 * @param string $content Badge content.
	 * @param int    $count Numeric count.
	 * @return string
	 */
	private function get_admin_menu_badge_text( $content, $count ) {
		$text = $this->sanitize_text( $content );

		return '' !== $text ? $text : number_format_i18n( $count );
	}

	/**
	 * Map WordPress menu badge classes to a stable PufferDesk tone.
	 *
	 * @param string $classes Badge class list.
	 * @return string
	 */
	private function get_admin_menu_badge_tone( $classes ) {
		if (
			$this->has_html_class( $classes, 'awaiting-mod' )
			|| $this->has_html_class( $classes, 'pending-count' )
			|| $this->has_html_class( $classes, 'site-health-counter' )
			|| $this->has_html_class( $classes, 'menu-counter' )
		) {
			return self::TONE_ATTENTION;
		}

		return self::TONE_UPDATE;
	}

	/**
	 * Read a simple HTML attribute from a tag attribute string.
	 *
	 * @param string $attributes Raw tag attributes.
	 * @param string $name Attribute name.
	 * @return string
	 */
	private function get_html_attribute_value( $attributes, $name ) {
		$name = preg_quote( $name, '#' );
		if ( preg_match( '#\b' . $name . '\s*=\s*([\'"])(.*?)\1#is', $attributes, $matches ) ) {
			return html_entity_decode( $matches[2], ENT_QUOTES );
		}

		if ( preg_match( '#\b' . $name . '\s*=\s*([^\s>]+)#is', $attributes, $matches ) ) {
			return html_entity_decode( $matches[1], ENT_QUOTES );
		}

		return '';
	}

	/**
	 * Check for a class token in an HTML class attribute value.
	 *
	 * @param string $classes Class attribute value.
	 * @param string $class Class token.
	 * @return bool
	 */
	private function has_html_class( $classes, $class ) {
		return (bool) preg_match( '/(?:^|\s)' . preg_quote( $class, '/' ) . '(?:\s|$)/', $classes );
	}
}
