<?php
/**
 * WordPress admin menu app provider.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts visible WordPress top-level admin menu items into PufferDesk apps.
 */
final class PufferDesk_Admin_Menu_App_Provider {
	/**
	 * Badge normalizer.
	 *
	 * @var PufferDesk_App_Badge_Normalizer
	 */
	private $badge_normalizer;

	/**
	 * Installed plugin headers, keyed by plugin basename.
	 *
	 * @var array<string,array<string,mixed>>|null
	 */
	private $installed_plugins = null;

	/**
	 * Runtime cache for resolved plugin headers.
	 *
	 * @var array<string,array<string,mixed>>
	 */
	private $plugin_header_cache = array();

	/**
	 * Runtime cache for admin menu slug owner lookups.
	 *
	 * @var array<string,string>
	 */
	private $plugin_owner_cache = array();

	/**
	 * Runtime cache for WordPress admin menu items.
	 *
	 * @var array<int,array<int,mixed>>|null
	 */
	private $admin_menu_items = null;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_App_Badge_Normalizer $badge_normalizer Badge normalizer.
	 */
	public function __construct( PufferDesk_App_Badge_Normalizer $badge_normalizer ) {
		$this->badge_normalizer = $badge_normalizer;
	}

	/**
	 * Merge visible WordPress top-level admin menu items into the app registry.
	 *
	 * Curated built-in apps are retained as overrides while the final order follows
	 * the WordPress admin menu where possible.
	 *
	 * @param array<int,array<string,mixed>> $apps Curated apps.
	 * @return array<int,array<string,mixed>>
	 */
	public function merge( $apps ) {
		$menu_items = $this->get_admin_menu_items();

		if ( empty( $menu_items ) ) {
			return $apps;
		}

		$by_id  = array();
		$by_url = array();
		foreach ( $apps as $index => $app ) {
			if ( ! is_array( $app ) ) {
				continue;
			}

			if ( ! empty( $app['id'] ) ) {
				$by_id[ sanitize_key( (string) $app['id'] ) ] = $index;
			}
			if ( ! empty( $app['url'] ) ) {
				$by_url[ $this->get_url_key( (string) $app['url'] ) ] = $index;
			}
		}

		$ordered = array();
		$used    = array();

		foreach ( $menu_items as $item ) {
			if ( ! is_array( $item ) || empty( $item[2] ) ) {
				continue;
			}

			$slug = (string) $item[2];
			if ( $this->is_skipped_admin_menu_item( $slug, $item ) ) {
				continue;
			}

			$cap = PufferDesk_App_Normalizer::normalize_capability( isset( $item[1] ) ? $item[1] : PufferDesk_App_Normalizer::DEFAULT_CAPABILITY );
			if ( ! current_user_can( $cap ) ) {
				continue;
			}

			$menu_title = isset( $item[0] ) ? (string) $item[0] : '';
			$id         = $this->get_admin_menu_app_id( $slug );
			$url        = $this->get_admin_menu_url( $slug );
			$label      = $this->get_admin_menu_label( $menu_title );
			$badge      = $this->badge_normalizer->from_admin_menu_title( $menu_title );
			if ( '' === $id || '' === $url || '' === $label ) {
				continue;
			}

			$url_key = $this->get_url_key( $url );
			$about   = $this->get_admin_menu_about( $slug, $label );
			$index   = isset( $by_id[ $id ] )
				? $by_id[ $id ]
				: ( isset( $by_url[ $url_key ] ) ? $by_url[ $url_key ] : null );

			if ( null !== $index ) {
				if ( ! isset( $used[ $index ] ) ) {
					$matched_app        = $apps[ $index ];
					$matched_app['cap'] = $cap;
					if ( ! empty( $about ) && empty( $matched_app['about'] ) ) {
						$matched_app['about'] = $about;
					}
					if ( ! empty( $badge ) ) {
						$matched_app['badge'] = $badge;
					}

					$ordered[]      = $matched_app;
					$used[ $index ] = true;
				}
				continue;
			}

			$menu_app = array(
				'id'     => $id,
				'label'  => $label,
				'url'    => $url,
				'icon'   => $this->get_admin_menu_icon( isset( $item[6] ) ? (string) $item[6] : '', $menu_title ),
				'group'  => PufferDesk_App_Normalizer::GROUP_SITE,
				'cap'    => $cap,
				'source' => 'wp-menu',
			);

			if ( ! empty( $about ) ) {
				$menu_app['about'] = $about;
			}
			if ( ! empty( $badge ) ) {
				$menu_app['badge'] = $badge;
			}

			$ordered[] = $menu_app;
		}

		foreach ( $apps as $index => $app ) {
			if ( ! isset( $used[ $index ] ) ) {
				$ordered[] = $app;
			}
		}

		return $ordered;
	}

	/**
	 * Get WordPress admin menu items, building an AJAX-safe snapshot when needed.
	 *
	 * @return array<int,array<int,mixed>>
	 */
	private function get_admin_menu_items() {
		global $menu, $submenu, $_wp_menu_nopriv, $_wp_submenu_nopriv, $_registered_pages, $_parent_pages, $_wp_real_parent_file;

		if ( null !== $this->admin_menu_items ) {
			return $this->admin_menu_items;
		}

		if ( is_array( $menu ) && ! empty( $menu ) ) {
			return $this->cache_admin_menu_items( $menu );
		}

		if ( ! $this->should_build_admin_menu_snapshot() ) {
			return is_array( $menu ) && did_action( 'admin_menu' )
				? $this->cache_admin_menu_items( $menu )
				: ( is_array( $menu ) ? $menu : array() );
		}

		if ( ! function_exists( 'add_menu_page' ) && file_exists( ABSPATH . 'wp-admin/includes/plugin.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'add_menu_page' ) ) {
			return $this->cache_admin_menu_items( array() );
		}

		$menu                  = is_array( $menu ) ? $menu : array();
		$submenu               = is_array( $submenu ) ? $submenu : array();
		$_wp_menu_nopriv      = is_array( $_wp_menu_nopriv ) ? $_wp_menu_nopriv : array();
		$_wp_submenu_nopriv   = is_array( $_wp_submenu_nopriv ) ? $_wp_submenu_nopriv : array();
		$_registered_pages    = is_array( $_registered_pages ) ? $_registered_pages : array();
		$_parent_pages        = is_array( $_parent_pages ) ? $_parent_pages : array();
		$_wp_real_parent_file = is_array( $_wp_real_parent_file ) ? $_wp_real_parent_file : array();

		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WordPress core hook used to build an admin menu snapshot for AJAX saves.
		do_action( 'admin_menu', '' );

		return $this->cache_admin_menu_items( is_array( $menu ) ? $menu : array() );
	}

	/**
	 * Whether PufferDesk should build a WordPress admin menu snapshot.
	 *
	 * @return bool
	 */
	private function should_build_admin_menu_snapshot() {
		$doing_ajax = function_exists( 'wp_doing_ajax' ) && wp_doing_ajax();

		if ( ! is_admin() || ! $doing_ajax || did_action( 'admin_menu' ) || doing_action( 'admin_menu' ) ) {
			return false;
		}

		/**
		 * Filter whether PufferDesk should build a fallback admin menu snapshot.
		 *
		 * @param bool $build Whether to build the snapshot.
		 */
		return (bool) apply_filters( 'pufferdesk_build_admin_menu_snapshot', true );
	}

	/**
	 * Cache WordPress admin menu items for this request.
	 *
	 * @param array<int,array<int,mixed>> $items Admin menu items.
	 * @return array<int,array<int,mixed>>
	 */
	private function cache_admin_menu_items( $items ) {
		$this->admin_menu_items = is_array( $items ) ? $items : array();

		return $this->admin_menu_items;
	}

	/**
	 * Whether a WordPress admin menu item should not become a PufferDesk app.
	 *
	 * @param string           $slug Menu slug.
	 * @param array<int,mixed> $item Raw menu item.
	 * @return bool
	 */
	private function is_skipped_admin_menu_item( $slug, $item ) {
		if ( PufferDesk_Router::PAGE_SLUG === $slug ) {
			return true;
		}

		if ( false !== strpos( $slug, 'separator' ) ) {
			return true;
		}

		$classes = isset( $item[4] ) ? (string) $item[4] : '';

		return false !== strpos( $classes, 'wp-menu-separator' );
	}

	/**
	 * Build a stable app ID for a WordPress admin menu slug.
	 *
	 * @param string $slug Menu slug.
	 * @return string
	 */
	private function get_admin_menu_app_id( $slug ) {
		$core_ids = array(
			'edit-comments.php'       => PufferDesk_App_Ids::COMMENTS,
			'edit.php'                => PufferDesk_App_Ids::POSTS,
			'edit.php?post_type=page' => PufferDesk_App_Ids::PAGES,
			'index.php'               => PufferDesk_App_Ids::DASHBOARD,
			'options-general.php'     => PufferDesk_App_Ids::SETTINGS,
			'plugins.php'             => PufferDesk_App_Ids::PLUGINS,
			'themes.php'              => PufferDesk_App_Ids::APPEARANCE,
			'tools.php'               => PufferDesk_App_Ids::TOOLS,
			'upload.php'              => PufferDesk_App_Ids::MEDIA,
			'users.php'               => PufferDesk_App_Ids::USERS,
			'admin.php?page=wc-admin' => PufferDesk_App_Ids::WOOCOMMERCE,
		);

		if ( isset( $core_ids[ $slug ] ) ) {
			return $core_ids[ $slug ];
		}

		$id = preg_replace( '/[^a-z0-9]+/', '-', strtolower( $slug ) );
		$id = is_string( $id ) ? trim( $id, '-' ) : '';

		return $id ? 'wp-admin-' . sanitize_key( $id ) : '';
	}

	/**
	 * Get a WordPress admin URL for a menu slug.
	 *
	 * @param string $slug Menu slug.
	 * @return string
	 */
	private function get_admin_menu_url( $slug ) {
		if ( preg_match( '#^https?://#i', $slug ) ) {
			return esc_url_raw( $slug );
		}

		if ( false !== strpos( $slug, '.php' ) ) {
			return admin_url( $slug );
		}

		return admin_url( 'admin.php?page=' . rawurlencode( $slug ) );
	}

	/**
	 * Normalize a WordPress admin menu label.
	 *
	 * @param string $label Raw menu title.
	 * @return string
	 */
	private function get_admin_menu_label( $label ) {
		$label = preg_replace( '#<span[^>]*>.*?</span>#is', '', $label );
		$label = wp_strip_all_tags( is_string( $label ) ? $label : '' );

		return sanitize_text_field( trim( $label ) );
	}

	/**
	 * Normalize a WordPress admin menu icon.
	 *
	 * @param string $icon Raw menu icon.
	 * @param string $menu_title Raw menu title.
	 * @return string|array<string,string>
	 */
	private function get_admin_menu_icon( $icon, $menu_title = '' ) {
		$icon = trim( $icon );
		if ( '' === $icon || 'none' === $icon ) {
			$title_icon = $this->get_admin_menu_title_icon( $menu_title );

			return $title_icon ? $title_icon : PufferDesk_Icon_Renderer::DEFAULT_DASHICON;
		}

		if ( PufferDesk_Icon_Renderer::DEFAULT_DASHICON === $icon ) {
			$title_icon = $this->get_admin_menu_title_icon( $menu_title );

			return $title_icon ? $title_icon : $icon;
		}

		if ( 0 === strpos( $icon, 'dashicons-' ) ) {
			return $icon;
		}

		$url = $this->get_admin_menu_image_url( $icon );

		return $url ? $this->build_admin_menu_image_icon( $url ) : PufferDesk_Icon_Renderer::DEFAULT_DASHICON;
	}

	/**
	 * Extract an image icon from plugin menu title HTML.
	 *
	 * @param string $menu_title Raw menu title.
	 * @return array<string,string>|null
	 */
	private function get_admin_menu_title_icon( $menu_title ) {
		if ( '' === $menu_title || false === stripos( $menu_title, '<img' ) ) {
			return null;
		}

		if ( ! preg_match( '#<img[^>]+src=[\'"]([^\'"]+)[\'"][^>]*>#i', $menu_title, $matches ) ) {
			return null;
		}

		$url = $this->get_admin_menu_image_url( html_entity_decode( $matches[1], ENT_QUOTES ) );
		if ( '' === $url ) {
			return null;
		}

		return $this->build_admin_menu_image_icon( $url );
	}

	/**
	 * Build an icon descriptor for an admin menu image.
	 *
	 * @param string $url Normalized image URL.
	 * @return array<string,string>
	 */
	private function build_admin_menu_image_icon( $url ) {
		return array(
			'type'       => PufferDesk_Icon_Renderer::TYPE_IMAGE,
			'url'        => $url,
			'appearance' => $this->is_admin_menu_monochrome_svg_icon( $url )
				? PufferDesk_Icon_Renderer::APPEARANCE_MONOCHROME
				: PufferDesk_Icon_Renderer::APPEARANCE_BRAND,
		);
	}

	/**
	 * Normalize an image URL found in WordPress admin menu metadata.
	 *
	 * @param string $url Raw image URL.
	 * @return string
	 */
	private function get_admin_menu_image_url( $url ) {
		$url = trim( html_entity_decode( (string) $url, ENT_QUOTES ) );
		if ( $this->is_admin_menu_data_image_url( $url ) ) {
			return $url;
		}

		return esc_url_raw( $url );
	}

	/**
	 * Check whether a data URI is a narrow image-only admin menu icon.
	 *
	 * @param string $url Raw image URL.
	 * @return bool
	 */
	private function is_admin_menu_data_image_url( $url ) {
		return (bool) preg_match( '#^data:image/(?:png|gif|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$#', $url );
	}

	/**
	 * Check whether an admin menu SVG data URI is intended to be tinted.
	 *
	 * @param string $url Raw image URL.
	 * @return bool
	 */
	private function is_admin_menu_monochrome_svg_icon( $url ) {
		if ( ! preg_match( '#^data:image/svg\+xml;base64,([A-Za-z0-9+/=]+)$#', $url, $matches ) ) {
			return false;
		}

		$svg = base64_decode( $matches[1], true );
		if ( ! is_string( $svg ) || false === stripos( $svg, '<svg' ) ) {
			return false;
		}

		if ( false !== stripos( $svg, 'currentColor' ) ) {
			return true;
		}

		$colors = $this->get_svg_color_values( $svg );
		if ( empty( $colors ) ) {
			return true;
		}

		foreach ( $colors as $color ) {
			if ( ! $this->is_svg_color_value_neutral( $color ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Extract color values from simple SVG attributes and style declarations.
	 *
	 * @param string $svg SVG markup.
	 * @return array<int,string>
	 */
	private function get_svg_color_values( $svg ) {
		$colors = array();

		if ( preg_match_all( '/(?:fill|stroke|color)\s*=\s*([\'"])(.*?)\1/i', $svg, $matches ) ) {
			$colors = array_merge( $colors, $matches[2] );
		}

		if ( preg_match_all( '/(?:fill|stroke|color)\s*:\s*([^;"\'}]+)/i', $svg, $matches ) ) {
			$colors = array_merge( $colors, $matches[1] );
		}

		if ( preg_match_all( '/#[0-9a-f]{3,8}\b/i', $svg, $matches ) ) {
			$colors = array_merge( $colors, $matches[0] );
		}

		$colors = array_map(
			static function ( $color ) {
				return strtolower( trim( (string) $color ) );
			},
			$colors
		);

		return array_values( array_unique( array_filter( $colors ) ) );
	}

	/**
	 * Determine whether a simple SVG color value is neutral enough to tint.
	 *
	 * @param string $color SVG color value.
	 * @return bool
	 */
	private function is_svg_color_value_neutral( $color ) {
		$color = strtolower( trim( $color ) );
		if ( '' === $color || in_array( $color, array( 'none', 'transparent', 'currentcolor', 'inherit' ), true ) ) {
			return true;
		}

		if ( 0 === strpos( $color, 'var(' ) ) {
			return true;
		}

		if ( in_array( $color, array( 'black', 'white', 'gray', 'grey', 'silver', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey', 'dimgray', 'dimgrey' ), true ) ) {
			return true;
		}

		if ( preg_match( '/^#([0-9a-f]{3,8})$/i', $color, $matches ) ) {
			$hex = strtolower( $matches[1] );
			if ( 3 === strlen( $hex ) || 4 === strlen( $hex ) ) {
				$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
			} else {
				$hex = substr( $hex, 0, 6 );
			}

			if ( 6 !== strlen( $hex ) ) {
				return false;
			}

			$rgb = array(
				hexdec( substr( $hex, 0, 2 ) ),
				hexdec( substr( $hex, 2, 2 ) ),
				hexdec( substr( $hex, 4, 2 ) ),
			);

			return max( $rgb ) - min( $rgb ) <= 18;
		}

		if ( preg_match( '/^rgba?\(([^)]+)\)$/i', $color, $matches ) ) {
			$parts = array_map( 'trim', explode( ',', $matches[1] ) );
			if ( count( $parts ) < 3 ) {
				return false;
			}

			$rgb = array_slice( array_map( 'intval', $parts ), 0, 3 );

			return max( $rgb ) - min( $rgb ) <= 18;
		}

		return false;
	}

	/**
	 * Normalize URL values for registry matching.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private function get_url_key( $url ) {
		return untrailingslashit( esc_url_raw( $url ) );
	}

	/**
	 * Build About metadata for a WordPress admin menu item backed by a plugin.
	 *
	 * @param string $slug Menu slug.
	 * @return array<string,mixed>
	 */
	private function get_admin_menu_plugin_about( $slug ) {
		$plugin_file = $this->get_admin_menu_plugin_file( $slug );
		if ( '' === $plugin_file ) {
			return array();
		}

		$plugin = $this->get_plugin_headers( $plugin_file );
		$name   = isset( $plugin['Name'] ) ? $this->sanitize_plugin_header( $plugin['Name'] ) : '';
		if ( '' === $name ) {
			return array();
		}

		$version = isset( $plugin['Version'] ) ? $this->sanitize_plugin_header( $plugin['Version'] ) : '';
		$author  = isset( $plugin['AuthorName'] ) && '' !== $plugin['AuthorName']
			? $this->sanitize_plugin_header( $plugin['AuthorName'] )
			: ( isset( $plugin['Author'] ) ? $this->sanitize_plugin_header( $plugin['Author'] ) : '' );
		$lines   = array();

		if ( '' !== $version ) {
			$lines[] = PufferDesk_App_Normalizer::format_about_version( $version );
		}

		if ( '' !== $author ) {
			$lines[] = PufferDesk_App_Normalizer::format_about_author( $author );
		}

		return array(
			'name'      => $name,
			'version'   => isset( $lines[0] ) ? $lines[0] : '',
			'copyright' => isset( $lines[1] ) ? $lines[1] : '',
			'rights'    => '',
			'lines'     => $lines,
		);
	}

	/**
	 * Build About metadata for a WordPress admin menu item.
	 *
	 * Plugin-owned screens use their plugin headers. WordPress core screens use
	 * WordPress core metadata instead of the PufferDesk product fallback.
	 *
	 * @param string $slug Menu slug.
	 * @param string $label Menu label.
	 * @return array<string,mixed>
	 */
	private function get_admin_menu_about( $slug, $label ) {
		$plugin_about = $this->get_admin_menu_plugin_about( $slug );
		if ( ! empty( $plugin_about ) ) {
			return $plugin_about;
		}

		return $this->is_wordpress_core_menu_slug( $slug )
			? PufferDesk_App_Normalizer::get_wordpress_core_about( $label )
			: array();
	}

	/**
	 * Whether a top-level admin menu slug belongs to WordPress core.
	 *
	 * @param string $slug Menu slug.
	 * @return bool
	 */
	private function is_wordpress_core_menu_slug( $slug ) {
		return in_array(
			$slug,
			array(
				'edit-comments.php',
				'edit.php',
				'edit.php?post_type=page',
				'index.php',
				'options-general.php',
				'plugins.php',
				'site-health.php',
				'themes.php',
				'tools.php',
				'upload.php',
				'users.php',
			),
			true
		);
	}

	/**
	 * Resolve the plugin file that owns a WordPress admin menu slug.
	 *
	 * @param string $slug Menu slug.
	 * @return string Plugin basename, or empty string when unknown.
	 */
	private function get_admin_menu_plugin_file( $slug ) {
		$cache_key = md5( $slug );
		if ( isset( $this->plugin_owner_cache[ $cache_key ] ) ) {
			return $this->plugin_owner_cache[ $cache_key ];
		}

		$plugin_file = $this->get_admin_menu_callback_plugin_file( $slug );
		if ( '' === $plugin_file ) {
			$plugin_file = $this->get_admin_menu_slug_plugin_file( $slug );
		}

		$this->plugin_owner_cache[ $cache_key ] = $plugin_file;

		return $plugin_file;
	}

	/**
	 * Resolve a plugin owner from the admin page callback registered by WordPress.
	 *
	 * @param string $slug Menu slug.
	 * @return string Plugin basename, or empty string when unknown.
	 */
	private function get_admin_menu_callback_plugin_file( $slug ) {
		global $wp_filter;

		$this->load_plugin_functions();

		if ( ! function_exists( 'get_plugin_page_hookname' ) ) {
			return '';
		}

		$page_slug = function_exists( 'plugin_basename' ) ? plugin_basename( $slug ) : $slug;
		$hook_name = get_plugin_page_hookname( $page_slug, '' );
		if ( '' === $hook_name || empty( $wp_filter[ $hook_name ] ) ) {
			return '';
		}

		$hook      = $wp_filter[ $hook_name ];
		$callbacks = is_object( $hook ) && isset( $hook->callbacks ) && is_array( $hook->callbacks )
			? $hook->callbacks
			: ( is_array( $hook ) ? $hook : array() );

		foreach ( $callbacks as $priority_callbacks ) {
			if ( ! is_array( $priority_callbacks ) ) {
				continue;
			}

			foreach ( $priority_callbacks as $callback ) {
				if ( ! is_array( $callback ) || empty( $callback['function'] ) ) {
					continue;
				}

				$source_file = $this->get_callback_source_file( $callback['function'] );
				$plugin_file = $this->get_plugin_file_from_source_file( $source_file );
				if ( '' !== $plugin_file ) {
					return $plugin_file;
				}
			}
		}

		return '';
	}

	/**
	 * Resolve a plugin owner from direct slug/header matches.
	 *
	 * @param string $slug Menu slug.
	 * @return string Plugin basename, or empty string when unknown.
	 */
	private function get_admin_menu_slug_plugin_file( $slug ) {
		$this->load_plugin_functions();

		$page_slug = function_exists( 'plugin_basename' ) ? plugin_basename( $slug ) : $slug;
		$plugins   = $this->get_installed_plugins();

		if ( isset( $plugins[ $page_slug ] ) ) {
			return $page_slug;
		}

		$slug_token = $this->normalize_plugin_lookup_token( $page_slug );
		if ( '' === $slug_token ) {
			return '';
		}

		foreach ( $plugins as $plugin_file => $plugin ) {
			$candidates = array(
				dirname( $plugin_file ),
				basename( $plugin_file, '.php' ),
				isset( $plugin['TextDomain'] ) ? $plugin['TextDomain'] : '',
				isset( $plugin['Name'] ) ? $plugin['Name'] : '',
			);

			foreach ( $candidates as $candidate ) {
				if ( $slug_token === $this->normalize_plugin_lookup_token( $candidate ) ) {
					return $plugin_file;
				}
			}
		}

		return preg_match( '/^[a-z0-9_-]+$/i', $page_slug )
			? $this->get_plugin_file_from_menu_slug_source( $slug_token )
			: '';
	}

	/**
	 * Resolve a plugin owner by scanning active plugin entry files for a menu slug.
	 *
	 * @param string $slug_token Normalized menu slug token.
	 * @return string Plugin basename, or empty string when unknown.
	 */
	private function get_plugin_file_from_menu_slug_source( $slug_token ) {
		if ( strlen( $slug_token ) < 4 || ! defined( 'WP_PLUGIN_DIR' ) ) {
			return '';
		}

		foreach ( $this->get_installed_plugins() as $plugin_file => $plugin ) {
			if ( ! $this->is_plugin_active_for_about_lookup( $plugin_file ) ) {
				continue;
			}

			if ( $this->plugin_source_contains_menu_slug( $plugin_file, $slug_token ) ) {
				return $plugin_file;
			}
		}

		return '';
	}

	/**
	 * Whether a plugin source tree contains a plain menu slug.
	 *
	 * @param string $plugin_file Plugin basename.
	 * @param string $slug_token  Normalized menu slug token.
	 * @return bool
	 */
	private function plugin_source_contains_menu_slug( $plugin_file, $slug_token ) {
		$plugin_root = trailingslashit( WP_PLUGIN_DIR );
		$main_path   = $plugin_root . $plugin_file;
		if ( $this->source_file_contains_menu_slug( $main_path, $slug_token ) ) {
			return true;
		}

		$plugin_dir = dirname( $plugin_file );
		if ( '.' === $plugin_dir || '' === $plugin_dir ) {
			return false;
		}

		$root = $plugin_root . $plugin_dir;
		if ( ! is_dir( $root ) || ! is_readable( $root ) ) {
			return false;
		}

		$scanned_files = 0;
		$scanned_bytes = 0;
		try {
			$iterator = new RecursiveIteratorIterator(
				new RecursiveDirectoryIterator( $root, FilesystemIterator::SKIP_DOTS )
			);
		} catch ( Exception $e ) {
			return false;
		}

		foreach ( $iterator as $file ) {
			if ( $scanned_files >= 200 || $scanned_bytes >= 4194304 ) {
				break;
			}

			if ( ! $file->isFile() || 'php' !== strtolower( $file->getExtension() ) ) {
				continue;
			}

			$path = $file->getPathname();
			if ( wp_normalize_path( $path ) === wp_normalize_path( $main_path ) ) {
				continue;
			}

			$relative = ltrim( str_replace( wp_normalize_path( $root ), '', wp_normalize_path( $path ) ), '/' );
			if ( preg_match( '#(^|/)(?:node_modules|tests?|vendor)(/|$)#i', $relative ) ) {
				continue;
			}

			$size = $file->getSize();
			if ( $size <= 0 || $size > 262144 || $scanned_bytes + $size > 4194304 ) {
				continue;
			}

			++$scanned_files;
			$scanned_bytes += $size;
			if ( $this->source_file_contains_menu_slug( $path, $slug_token ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether a source file contains a normalized menu slug.
	 *
	 * @param string $path Source path.
	 * @param string $slug_token Normalized menu slug token.
	 * @return bool
	 */
	private function source_file_contains_menu_slug( $path, $slug_token ) {
		if ( ! is_file( $path ) || ! is_readable( $path ) || filesize( $path ) > 262144 ) {
			return false;
		}

		$contents = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin source is needed for bounded menu ownership discovery.
		if ( ! is_string( $contents ) ) {
			return false;
		}

		$lower_contents = strtolower( $contents );
		return false !== strpos( $lower_contents, $slug_token )
			|| false !== strpos( $this->normalize_plugin_lookup_token( $contents ), $slug_token );
	}

	/**
	 * Get the source filename for a callable.
	 *
	 * @param mixed $callback Callback value.
	 * @return string
	 */
	private function get_callback_source_file( $callback ) {
		try {
			if ( is_array( $callback ) && 2 === count( $callback ) ) {
				$reflection = new ReflectionMethod( $callback[0], $callback[1] );

				return (string) $reflection->getFileName();
			}

			if ( is_string( $callback ) && function_exists( $callback ) ) {
				$reflection = new ReflectionFunction( $callback );

				return (string) $reflection->getFileName();
			}

			if ( $callback instanceof Closure ) {
				$reflection = new ReflectionFunction( $callback );

				return (string) $reflection->getFileName();
			}

			if ( is_object( $callback ) && method_exists( $callback, '__invoke' ) ) {
				$reflection = new ReflectionMethod( $callback, '__invoke' );

				return (string) $reflection->getFileName();
			}
		} catch ( Exception $e ) {
			return '';
		}

		return '';
	}

	/**
	 * Resolve a plugin basename from a source file inside WP_PLUGIN_DIR.
	 *
	 * @param string $source_file Source file path.
	 * @return string Plugin basename, or empty string when unknown.
	 */
	private function get_plugin_file_from_source_file( $source_file ) {
		if ( '' === $source_file || ! defined( 'WP_PLUGIN_DIR' ) ) {
			return '';
		}

		$source_file = wp_normalize_path( $source_file );
		$plugin_dir  = trailingslashit( wp_normalize_path( WP_PLUGIN_DIR ) );
		if ( 0 !== strpos( $source_file, $plugin_dir ) ) {
			return '';
		}

		$relative = ltrim( substr( $source_file, strlen( $plugin_dir ) ), '/' );

		return $this->get_plugin_file_from_relative_path( $relative );
	}

	/**
	 * Resolve a plugin basename from a file path relative to WP_PLUGIN_DIR.
	 *
	 * @param string $relative_path Relative path.
	 * @return string Plugin basename, or empty string when unknown.
	 */
	private function get_plugin_file_from_relative_path( $relative_path ) {
		$plugins = $this->get_installed_plugins();
		if ( isset( $plugins[ $relative_path ] ) ) {
			return $relative_path;
		}

		$parts = explode( '/', $relative_path );
		if ( empty( $parts[0] ) ) {
			return '';
		}

		$plugin_dir = $parts[0] . '/';
		foreach ( $plugins as $plugin_file => $plugin ) {
			if ( 0 === strpos( $plugin_file, $plugin_dir ) ) {
				return $plugin_file;
			}
		}

		return '';
	}

	/**
	 * Load WordPress plugin helper functions when needed.
	 *
	 * @return void
	 */
	private function load_plugin_functions() {
		if ( ( ! function_exists( 'get_plugins' ) || ! function_exists( 'get_plugin_data' ) ) && file_exists( ABSPATH . 'wp-admin/includes/plugin.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
	}

	/**
	 * Get installed plugin headers from WordPress.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private function get_installed_plugins() {
		$this->load_plugin_functions();

		if ( null === $this->installed_plugins ) {
			$this->installed_plugins = function_exists( 'get_plugins' ) ? get_plugins() : array();
		}

		return is_array( $this->installed_plugins ) ? $this->installed_plugins : array();
	}

	/**
	 * Get translated plugin headers for one plugin file.
	 *
	 * @param string $plugin_file Plugin basename.
	 * @return array<string,mixed>
	 */
	private function get_plugin_headers( $plugin_file ) {
		$this->load_plugin_functions();

		if ( isset( $this->plugin_header_cache[ $plugin_file ] ) ) {
			return $this->plugin_header_cache[ $plugin_file ];
		}

		$path = defined( 'WP_PLUGIN_DIR' ) ? trailingslashit( WP_PLUGIN_DIR ) . $plugin_file : '';
		if ( '' === $path || ! is_readable( $path ) || ! function_exists( 'get_plugin_data' ) ) {
			$this->plugin_header_cache[ $plugin_file ] = array();

			return array();
		}

		$headers = get_plugin_data( $path, false, true );
		$this->plugin_header_cache[ $plugin_file ] = is_array( $headers ) ? $headers : array();

		return $this->plugin_header_cache[ $plugin_file ];
	}

	/**
	 * Whether a plugin is active enough to use for fallback source lookup.
	 *
	 * @param string $plugin_file Plugin basename.
	 * @return bool
	 */
	private function is_plugin_active_for_about_lookup( $plugin_file ) {
		$this->load_plugin_functions();

		if ( function_exists( 'is_plugin_active' ) && is_plugin_active( $plugin_file ) ) {
			return true;
		}

		return function_exists( 'is_plugin_active_for_network' ) && is_plugin_active_for_network( $plugin_file );
	}

	/**
	 * Normalize plugin lookup strings for loose slug comparisons.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	private function normalize_plugin_lookup_token( $value ) {
		$value = strtolower( wp_strip_all_tags( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9]+/', '-', $value );

		return is_string( $value ) ? trim( $value, '-' ) : '';
	}

	/**
	 * Sanitize a plugin header value for the shell runtime payload.
	 *
	 * @param mixed $value Raw header value.
	 * @return string
	 */
	private function sanitize_plugin_header( $value ) {
		return sanitize_text_field( trim( wp_strip_all_tags( html_entity_decode( (string) $value, ENT_QUOTES ) ) ) );
	}
}
