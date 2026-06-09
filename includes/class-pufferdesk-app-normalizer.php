<?php
/**
 * App descriptor normalization.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes app descriptors from built-ins, filters, and WordPress menus.
 */
final class PufferDesk_App_Normalizer {
	const DEFAULT_CAPABILITY = 'read';

	/**
	 * Badge normalizer.
	 *
	 * @var PufferDesk_App_Badge_Normalizer
	 */
	private $badge_normalizer;

	/**
	 * Menu normalizer.
	 *
	 * @var PufferDesk_App_Menu_Normalizer
	 */
	private $menu_normalizer;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_App_Badge_Normalizer $badge_normalizer Badge normalizer.
	 * @param PufferDesk_App_Menu_Normalizer  $menu_normalizer Menu normalizer.
	 */
	public function __construct( PufferDesk_App_Badge_Normalizer $badge_normalizer, PufferDesk_App_Menu_Normalizer $menu_normalizer ) {
		$this->badge_normalizer = $badge_normalizer;
		$this->menu_normalizer  = $menu_normalizer;
	}

	/**
	 * Normalize an app capability key.
	 *
	 * @param mixed $capability Raw capability.
	 * @return string
	 */
	public static function normalize_capability( $capability ) {
		if ( is_array( $capability ) || is_object( $capability ) ) {
			return self::DEFAULT_CAPABILITY;
		}

		$capability = sanitize_key( (string) $capability );

		return '' !== $capability ? $capability : self::DEFAULT_CAPABILITY;
	}

	/**
	 * Check whether the current user can access an app descriptor.
	 *
	 * @param mixed $app App descriptor.
	 * @return bool
	 */
	public function current_user_can_access_app( $app ) {
		if ( ! is_array( $app ) ) {
			return false;
		}

		return current_user_can( self::normalize_capability( isset( $app['cap'] ) ? $app['cap'] : self::DEFAULT_CAPABILITY ) );
	}

	/**
	 * Normalize and permission-check app data.
	 *
	 * @param mixed $apps Raw app data.
	 * @return array<int,array<string,mixed>>
	 */
	public function normalize_apps( $apps ) {
		$normalized = array();

		if ( ! is_array( $apps ) ) {
			return $normalized;
		}

		foreach ( $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) || empty( $app['label'] ) ) {
				continue;
			}

			$cap = self::normalize_capability( isset( $app['cap'] ) ? $app['cap'] : self::DEFAULT_CAPABILITY );
			if ( ! current_user_can( $cap ) ) {
				continue;
			}

			$id                 = sanitize_key( $app['id'] );
			$label              = sanitize_text_field( $app['label'] );
			$icon               = isset( $app['icon'] ) ? PufferDesk_Icon_Renderer::normalize( $app['icon'] ) : PufferDesk_Icon_Renderer::normalize( 'dashicons-admin-generic' );
			$group              = isset( $app['group'] ) ? sanitize_key( $app['group'] ) : 'system';
			$kind               = isset( $app['kind'] ) ? sanitize_key( $app['kind'] ) : 'iframe';
			$window_persistence = isset( $app['window_persistence'] ) ? sanitize_key( (string) $app['window_persistence'] ) : 'workspace';
			if ( '' === $id || '' === $label ) {
				continue;
			}
			if ( ! in_array( $group, array( 'content', 'site', 'system' ), true ) ) {
				$group = 'system';
			}
			if ( ! in_array( $kind, array( 'iframe', 'native' ), true ) ) {
				$kind = 'iframe';
			}
			if ( ! in_array( $window_persistence, array( 'workspace', 'none' ), true ) ) {
				$window_persistence = 'workspace';
			}

			$url    = isset( $app['url'] ) ? esc_url_raw( $app['url'] ) : '';
			$native = isset( $app['native'] ) ? sanitize_key( $app['native'] ) : '';
			$dock   = $this->normalize_dock( isset( $app['dock'] ) ? $app['dock'] : array() );
			$badge  = $this->badge_normalizer->normalize( isset( $app['badge'] ) ? $app['badge'] : array() );

			/**
			 * Filter the normalized badge for a shell app.
			 *
			 * Return an empty value to hide the badge. Badge arrays accept text,
			 * optional count, tone, and aria_label fields.
			 *
			 * @param array<string,mixed> $badge Normalized badge data.
			 * @param array<string,mixed> $app Raw app data.
			 */
			$badge = $this->badge_normalizer->normalize( apply_filters( 'pufferdesk_app_badge', $badge, $app ) );

			if ( 'iframe' === $kind && '' === $url ) {
				continue;
			}

			if ( 'native' === $kind && '' === $native ) {
				continue;
			}

			$normalized_app = array(
				'id'                 => $id,
				'label'              => $label,
				'url'                => $url,
				'icon'               => $icon,
				'about'              => $this->normalize_about( isset( $app['about'] ) ? $app['about'] : array(), $label, $icon ),
				'group'              => $group,
				'cap'                => $cap,
				'kind'               => $kind,
				'native'             => $native,
				'dock'               => $dock,
				'window_persistence' => $window_persistence,
				'menu'               => $this->menu_normalizer->normalize_definition( isset( $app['menu'] ) ? $app['menu'] : array(), $label ),
			);

			if ( ! empty( $badge ) ) {
				$normalized_app['badge'] = $badge;
			}

			$normalized[] = $normalized_app;
		}

		return $normalized;
	}

	/**
	 * Normalize optional Dock behavior metadata.
	 *
	 * @param mixed $dock Raw Dock metadata.
	 * @return array<string,mixed>
	 */
	private function normalize_dock( $dock ) {
		if ( ! is_array( $dock ) ) {
			return array();
		}

		$fixed = ! empty( $dock['fixed'] );
		if ( ! $fixed ) {
			return array();
		}

		$placement = isset( $dock['placement'] ) ? sanitize_key( (string) $dock['placement'] ) : 'end';
		if ( ! in_array( $placement, array( 'end' ), true ) ) {
			$placement = 'end';
		}

		return array(
			'fixed'     => true,
			'placement' => $placement,
		);
	}

	/**
	 * Normalize reusable about window metadata.
	 *
	 * @param mixed               $about Raw about metadata.
	 * @param string              $fallback_name App label.
	 * @param array<string,mixed> $fallback_icon Normalized app icon.
	 * @return array<string,mixed>
	 */
	private function normalize_about( $about, $fallback_name, $fallback_icon ) {
		$about = is_array( $about ) ? $about : array();
		$name  = ! empty( $about['name'] ) ? sanitize_text_field( $about['name'] ) : $fallback_name;
		$year  = gmdate( 'Y' );
		$icon  = isset( $about['icon'] ) ? PufferDesk_Icon_Renderer::normalize( $about['icon'] ) : $fallback_icon;
		$lines = array();

		if ( ! empty( $about['lines'] ) && is_array( $about['lines'] ) ) {
			foreach ( $about['lines'] as $line ) {
				$line = sanitize_text_field( (string) $line );
				if ( '' !== $line ) {
					$lines[] = $line;
				}
			}
		}

		return array(
			'name'      => $name,
			'version'   => array_key_exists( 'version', $about )
				? sanitize_text_field( (string) $about['version'] )
				: sprintf(
					/* translators: %s: plugin version. */
					__( 'Version %s', 'pufferdesk-admin-desktop' ),
					PUFFERDESK_VERSION
				),
			'copyright' => array_key_exists( 'copyright', $about )
				? sanitize_text_field( (string) $about['copyright'] )
				: sprintf(
					/* translators: %s: current year. */
					__( 'Copyright (c) %s PufferDesk contributors.', 'pufferdesk-admin-desktop' ),
					$year
				),
			'rights'    => array_key_exists( 'rights', $about ) ? sanitize_text_field( (string) $about['rights'] ) : __( 'Licensed under GPLv2 or later.', 'pufferdesk-admin-desktop' ),
			'lines'     => $lines,
			'icon'      => $icon,
		);
	}
}
