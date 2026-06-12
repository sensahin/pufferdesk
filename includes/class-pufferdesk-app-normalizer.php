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
	const GROUP_CONTENT = 'content';
	const GROUP_SITE = 'site';
	const GROUP_SYSTEM = 'system';
	const KIND_IFRAME = 'iframe';
	const KIND_NATIVE = 'native';
	const WINDOW_PERSISTENCE_WORKSPACE = 'workspace';
	const WINDOW_PERSISTENCE_NONE = 'none';

	/**
	 * App group IDs.
	 *
	 * @return array<string,string>
	 */
	public static function get_group_ids() {
		return array(
			'CONTENT' => self::GROUP_CONTENT,
			'SITE'    => self::GROUP_SITE,
			'SYSTEM'  => self::GROUP_SYSTEM,
		);
	}

	/**
	 * App kind IDs.
	 *
	 * @return array<string,string>
	 */
	public static function get_kind_ids() {
		return array(
			'IFRAME' => self::KIND_IFRAME,
			'NATIVE' => self::KIND_NATIVE,
		);
	}

	/**
	 * App window persistence IDs.
	 *
	 * @return array<string,string>
	 */
	public static function get_window_persistence_ids() {
		return array(
			'NONE'      => self::WINDOW_PERSISTENCE_NONE,
			'WORKSPACE' => self::WINDOW_PERSISTENCE_WORKSPACE,
		);
	}

	/**
	 * Browser-facing app descriptor contract.
	 *
	 * @return array<string,mixed>
	 */
	public static function client_contract() {
		return array(
			'groups'            => self::get_group_ids(),
			'kinds'             => self::get_kind_ids(),
			'windowPersistence' => self::get_window_persistence_ids(),
		);
	}

	/**
	 * Default labels for reusable About metadata.
	 *
	 * @return array<string,string>
	 */
	public static function get_default_about_labels() {
		return array(
			/* translators: %s: version number. */
			'versionFormat' => __( 'Version %s', 'pufferdesk-admin-desktop' ),
			/* translators: %s: author name. */
			'authorFormat'  => __( 'By %s', 'pufferdesk-admin-desktop' ),
			/* translators: %s: current year. */
			'copyright'     => __( 'Copyright (c) %s PufferDesk contributors.', 'pufferdesk-admin-desktop' ),
			'rights'        => __( 'Licensed under GPLv2 or later.', 'pufferdesk-admin-desktop' ),
		);
	}

	/**
	 * Get a default About label.
	 *
	 * @param string $key Label key.
	 * @return string
	 */
	public static function get_default_about_label( $key ) {
		$labels = self::get_default_about_labels();

		return isset( $labels[ $key ] ) ? $labels[ $key ] : '';
	}

	/**
	 * Format an About version line.
	 *
	 * @param string $version Version number.
	 * @return string
	 */
	public static function format_about_version( $version ) {
		return sprintf( self::get_default_about_label( 'versionFormat' ), $version );
	}

	/**
	 * Format an About author line.
	 *
	 * @param string $author Author name.
	 * @return string
	 */
	public static function format_about_author( $author ) {
		return sprintf( self::get_default_about_label( 'authorFormat' ), $author );
	}

	/**
	 * Build About metadata for a WordPress core admin screen.
	 *
	 * @param string $name Screen label.
	 * @return array<string,mixed>
	 */
	public static function get_wordpress_core_about( $name ) {
		$wp_version = get_bloginfo( 'version' );
		$year       = gmdate( 'Y' );
		$name       = sanitize_text_field( (string) $name );
		$version    = '' !== $wp_version
			? sprintf(
				/* translators: %s: WordPress version number. */
				__( 'WordPress Version %s', 'pufferdesk-admin-desktop' ),
				$wp_version
			)
			: __( 'WordPress', 'pufferdesk-admin-desktop' );
		$copyright = sprintf(
			/* translators: %s: current year. */
			__( 'Copyright (c) 2003-%s WordPress contributors.', 'pufferdesk-admin-desktop' ),
			$year
		);
		$rights    = __( 'Licensed under GPLv2 or later.', 'pufferdesk-admin-desktop' );

		return array(
			'name'      => '' !== $name ? $name : __( 'WordPress', 'pufferdesk-admin-desktop' ),
			'version'   => $version,
			'copyright' => $copyright,
			'rights'    => $rights,
			'lines'     => array(
				$version,
				$copyright,
				$rights,
			),
		);
	}

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
			$icon               = isset( $app['icon'] ) ? PufferDesk_Icon_Renderer::normalize( $app['icon'] ) : PufferDesk_Icon_Renderer::normalize( PufferDesk_Icon_Renderer::DEFAULT_DASHICON );
			$group              = isset( $app['group'] ) ? sanitize_key( $app['group'] ) : self::GROUP_SYSTEM;
			$kind               = isset( $app['kind'] ) ? sanitize_key( $app['kind'] ) : self::KIND_IFRAME;
			$window_persistence = isset( $app['window_persistence'] ) ? sanitize_key( (string) $app['window_persistence'] ) : self::WINDOW_PERSISTENCE_WORKSPACE;
			if ( '' === $id || '' === $label ) {
				continue;
			}
			if ( ! in_array( $group, self::get_group_ids(), true ) ) {
				$group = self::GROUP_SYSTEM;
			}
			if ( ! in_array( $kind, self::get_kind_ids(), true ) ) {
				$kind = self::KIND_IFRAME;
			}
			if ( ! in_array( $window_persistence, self::get_window_persistence_ids(), true ) ) {
				$window_persistence = self::WINDOW_PERSISTENCE_WORKSPACE;
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

			if ( self::KIND_IFRAME === $kind && '' === $url ) {
				continue;
			}

			if ( self::KIND_NATIVE === $kind && '' === $native ) {
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
				: self::format_about_version( PUFFERDESK_VERSION ),
			'copyright' => array_key_exists( 'copyright', $about )
				? sanitize_text_field( (string) $about['copyright'] )
				: sprintf(
					self::get_default_about_label( 'copyright' ),
					$year
				),
			'rights'    => array_key_exists( 'rights', $about ) ? sanitize_text_field( (string) $about['rights'] ) : self::get_default_about_label( 'rights' ),
			'lines'     => $lines,
			'icon'      => $icon,
		);
	}
}
