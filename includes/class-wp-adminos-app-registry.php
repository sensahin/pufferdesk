<?php
/**
 * Admin app registry.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the app and folder data consumed by the shell.
 */
final class WP_AdminOS_App_Registry {
	const DEFAULT_CAPABILITY = 'read';

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
	 * App registry for the first shell.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_apps() {
		$apps = array(
			array(
				'id'    => 'dashboard',
				'label' => __( 'Dashboard', 'wp-adminos' ),
				'url'   => admin_url( 'index.php?wp_adminos_classic=1' ),
				'icon'  => $this->theme_icon( 'dashboard.svg', 'dashicons-dashboard' ),
				'group' => 'content',
				'cap'   => self::DEFAULT_CAPABILITY,
			),
			array(
				'id'    => 'posts',
				'label' => __( 'Posts', 'wp-adminos' ),
				'url'   => admin_url( 'edit.php' ),
				'icon'  => $this->theme_icon( 'posts.svg', 'dashicons-admin-post' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'pages',
				'label' => __( 'Pages', 'wp-adminos' ),
				'url'   => admin_url( 'edit.php?post_type=page' ),
				'icon'  => $this->theme_icon( 'pages.svg', 'dashicons-admin-page' ),
				'group' => 'content',
				'cap'   => 'edit_pages',
			),
			array(
				'id'    => 'media',
				'label' => __( 'Media', 'wp-adminos' ),
				'url'   => admin_url( 'upload.php' ),
				'icon'  => $this->theme_icon( 'media.svg', 'dashicons-admin-media' ),
				'group' => 'content',
				'cap'   => 'upload_files',
			),
			array(
				'id'    => 'comments',
				'label' => __( 'Comments', 'wp-adminos' ),
				'url'   => admin_url( 'edit-comments.php' ),
				'icon'  => $this->theme_icon( 'comments.svg', 'dashicons-admin-comments' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'appearance',
				'label' => __( 'Appearance', 'wp-adminos' ),
				'url'   => admin_url( 'themes.php' ),
				'icon'  => $this->theme_icon( 'appearance.svg', 'dashicons-admin-appearance' ),
				'group' => 'site',
				'cap'   => 'switch_themes',
			),
			array(
				'id'    => 'plugins',
				'label' => __( 'Plugins', 'wp-adminos' ),
				'url'   => admin_url( 'plugins.php' ),
				'icon'  => $this->theme_icon( 'plugins.svg', 'dashicons-admin-plugins' ),
				'group' => 'system',
				'cap'   => 'activate_plugins',
			),
			array(
				'id'    => 'users',
				'label' => __( 'Users', 'wp-adminos' ),
				'url'   => admin_url( 'users.php' ),
				'icon'  => $this->theme_icon( 'users.svg', 'dashicons-admin-users' ),
				'group' => 'system',
				'cap'   => 'list_users',
			),
			array(
				'id'     => 'os-settings',
				'label'  => __( 'System Settings', 'wp-adminos' ),
				'icon'   => $this->theme_icon( 'os-settings.svg', 'dashicons-admin-customizer' ),
				'group'  => 'system',
				'cap'    => self::DEFAULT_CAPABILITY,
				'kind'   => 'native',
				'native' => 'settings',
				'menu'   => $this->get_os_settings_menu(),
			),
			array(
				'id'    => 'settings',
				'label' => __( 'Settings', 'wp-adminos' ),
				'url'   => admin_url( 'options-general.php' ),
				'icon'  => $this->theme_icon( 'settings.svg', 'dashicons-admin-settings' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'tools',
				'label' => __( 'Tools', 'wp-adminos' ),
				'url'   => admin_url( 'tools.php' ),
				'icon'  => $this->theme_icon( 'tools.svg', 'dashicons-admin-tools' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'site-health',
				'label' => __( 'Site Health', 'wp-adminos' ),
				'url'   => admin_url( 'site-health.php' ),
				'icon'  => $this->theme_icon( 'site-health.svg', 'dashicons-heart' ),
				'group' => 'system',
				'cap'   => 'view_site_health_checks',
			),
		);

		if ( class_exists( 'WooCommerce' ) || current_user_can( 'manage_woocommerce' ) ) {
			$apps[] = array(
				'id'    => 'woocommerce',
				'label' => __( 'WooCommerce', 'wp-adminos' ),
				'url'   => admin_url( 'admin.php?page=wc-admin' ),
				'icon'  => $this->theme_icon( 'woocommerce.svg', 'dashicons-cart' ),
				'group' => 'site',
				'cap'   => 'manage_woocommerce',
			);
		}

		$apps = $this->merge_admin_menu_apps( $apps );

		$apps = array_values( array_filter( $apps, array( $this, 'current_user_can_access_app' ) ) );

		/**
		 * Filter the shell app registry.
		 *
		 * Each app accepts id, label, url, icon, group, cap, kind, native, and menu.
		 * Missing, empty, or non-scalar cap values default to read during normalization.
		 * Icons may be a Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-admin-post' )
		 * array( 'type' => 'image', 'src' => 'themes/adminos/default/icons/posts.svg' )
		 * array( 'type' => 'theme', 'name' => 'posts.svg', 'fallback' => 'dashicons-admin-post' )
		 * About windows may define about name, version, copyright, rights, and icon.
		 * Menus use array( 'groups' => array( ... ) ) with command-backed items.
		 *
		 * @param array<int,array<string,mixed>> $apps Registered apps.
		 */
		$apps = apply_filters( 'wp_adminos_apps', $apps );

		return $this->normalize_apps( $apps );
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
	private function merge_admin_menu_apps( $apps ) {
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

			$cap = $this->normalize_capability( isset( $item[1] ) ? $item[1] : self::DEFAULT_CAPABILITY );
			if ( ! current_user_can( $cap ) ) {
				continue;
			}

			$menu_title = isset( $item[0] ) ? (string) $item[0] : '';
			$id         = $this->get_admin_menu_app_id( $slug );
			$url        = $this->get_admin_menu_url( $slug );
			$label      = $this->get_admin_menu_label( $menu_title );
			$badge      = $this->get_admin_menu_badge( $menu_title );
			if ( '' === $id || '' === $url || '' === $label ) {
				continue;
			}

			$url_key      = $this->get_url_key( $url );
			$plugin_about = $this->get_admin_menu_plugin_about( $slug );
			$index        = isset( $by_id[ $id ] )
				? $by_id[ $id ]
				: ( isset( $by_url[ $url_key ] ) ? $by_url[ $url_key ] : null );

			if ( null !== $index ) {
				if ( ! isset( $used[ $index ] ) ) {
					$matched_app        = $apps[ $index ];
					$matched_app['cap'] = $cap;
					if ( ! empty( $plugin_about ) && empty( $matched_app['about'] ) ) {
						$matched_app['about'] = $plugin_about;
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
				'group'  => 'site',
				'cap'    => $cap,
				'source' => 'wp-menu',
			);

			if ( ! empty( $plugin_about ) ) {
				$menu_app['about'] = $plugin_about;
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
	 * Check whether the current user can access an app descriptor.
	 *
	 * @param mixed $app App descriptor.
	 * @return bool
	 */
	private function current_user_can_access_app( $app ) {
		if ( ! is_array( $app ) ) {
			return false;
		}

		return current_user_can( $this->normalize_capability( isset( $app['cap'] ) ? $app['cap'] : self::DEFAULT_CAPABILITY ) );
	}

	/**
	 * Normalize an app capability key.
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
	 * Get WordPress admin menu items, building an AJAX-safe snapshot when needed.
	 *
	 * WordPress does not normally populate the top-level $menu array during
	 * admin-ajax.php requests, but the settings save endpoint still needs the same
	 * plugin-derived app IDs that the shell rendered on the full admin page.
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

		$menu                 = is_array( $menu ) ? $menu : array();
		$submenu              = is_array( $submenu ) ? $submenu : array();
		$_wp_menu_nopriv     = is_array( $_wp_menu_nopriv ) ? $_wp_menu_nopriv : array();
		$_wp_submenu_nopriv  = is_array( $_wp_submenu_nopriv ) ? $_wp_submenu_nopriv : array();
		$_registered_pages   = is_array( $_registered_pages ) ? $_registered_pages : array();
		$_parent_pages       = is_array( $_parent_pages ) ? $_parent_pages : array();
		$_wp_real_parent_file = is_array( $_wp_real_parent_file ) ? $_wp_real_parent_file : array();

		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WordPress core hook used to build an admin menu snapshot for AJAX saves.
		do_action( 'admin_menu', '' );

		return $this->cache_admin_menu_items( is_array( $menu ) ? $menu : array() );
	}

	/**
	 * Whether WP adminOS should build a WordPress admin menu snapshot.
	 *
	 * @return bool
	 */
	private function should_build_admin_menu_snapshot() {
		$doing_ajax = function_exists( 'wp_doing_ajax' ) && wp_doing_ajax();

		if ( ! is_admin() || ! $doing_ajax || did_action( 'admin_menu' ) || doing_action( 'admin_menu' ) ) {
			return false;
		}

		/**
		 * Filter whether WP adminOS should build a fallback admin menu snapshot.
		 *
		 * The fallback is only considered during admin-ajax.php requests where
		 * WordPress has not populated the global admin menu. Disabling this avoids
		 * firing the core admin_menu hook during AJAX, but plugin-derived app IDs
		 * may no longer be available for settings saves in that request.
		 *
		 * @param bool $build Whether to build the snapshot.
		 */
		return (bool) apply_filters( 'wp_adminos_build_admin_menu_snapshot', true );
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
	 * Whether a WordPress admin menu item should not become a WP adminOS app.
	 *
	 * @param string             $slug Menu slug.
	 * @param array<int,mixed>   $item Raw menu item.
	 * @return bool
	 */
	private function is_skipped_admin_menu_item( $slug, $item ) {
		if ( WP_AdminOS_Router::PAGE_SLUG === $slug ) {
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
			'edit-comments.php'           => 'comments',
			'edit.php'                    => 'posts',
			'edit.php?post_type=page'     => 'pages',
			'index.php'                   => 'dashboard',
			'options-general.php'         => 'settings',
			'plugins.php'                 => 'plugins',
			'themes.php'                  => 'appearance',
			'tools.php'                   => 'tools',
			'upload.php'                  => 'media',
			'users.php'                   => 'users',
			'admin.php?page=wc-admin'     => 'woocommerce',
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
	 * Extract a notification badge from WordPress admin menu title HTML.
	 *
	 * WordPress stores admin menu counters as markup in the title string rather
	 * than as a dedicated menu field. WP adminOS keeps the visual surfaces clean
	 * by normalizing common count spans into app badge data.
	 *
	 * @param string $menu_title Raw menu title.
	 * @return array<string,mixed>
	 */
	private function get_admin_menu_badge( $menu_title ) {
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

			$label = $this->sanitize_admin_menu_badge_text( isset( $span[2] ) ? $span[2] : '' );
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

		$text   = $this->sanitize_admin_menu_badge_text( $content );
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
		$text = $this->sanitize_admin_menu_badge_text( $content );

		return '' !== $text ? $text : number_format_i18n( $count );
	}

	/**
	 * Map WordPress menu badge classes to a stable WP adminOS tone.
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
			return 'attention';
		}

		return 'update';
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

	/**
	 * Sanitize text extracted from admin menu badge HTML.
	 *
	 * @param mixed $text Raw text.
	 * @return string
	 */
	private function sanitize_admin_menu_badge_text( $text ) {
		$text = html_entity_decode( (string) $text, ENT_QUOTES );
		$text = wp_strip_all_tags( $text );
		$text = preg_replace( '/\s+/', ' ', $text );

		return sanitize_text_field( trim( is_string( $text ) ? $text : '' ) );
	}

	/**
	 * Normalize a WordPress admin menu icon.
	 *
	 * @param string $icon       Raw menu icon.
	 * @param string $menu_title Raw menu title.
	 * @return string|array<string,string>
	 */
	private function get_admin_menu_icon( $icon, $menu_title = '' ) {
		$icon = trim( $icon );
		if ( '' === $icon || 'none' === $icon ) {
			$title_icon = $this->get_admin_menu_title_icon( $menu_title );

			return $title_icon ? $title_icon : 'dashicons-admin-generic';
		}

		if ( 'dashicons-admin-generic' === $icon ) {
			$title_icon = $this->get_admin_menu_title_icon( $menu_title );

			return $title_icon ? $title_icon : $icon;
		}

		if ( 0 === strpos( $icon, 'dashicons-' ) ) {
			return $icon;
		}

		$url = $this->get_admin_menu_image_url( $icon );

		return $url ? array(
			'type' => 'image',
			'url'  => $url,
		) : 'dashicons-admin-generic';
	}

	/**
	 * Extract an image icon from plugin menu title HTML.
	 *
	 * Some plugins embed an image inside the menu title instead of using
	 * add_menu_page()'s icon argument to avoid WordPress SVG color filtering.
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

		return array(
			'type' => 'image',
			'url'  => $url,
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
			$lines[] = sprintf(
				/* translators: %s: plugin version. */
				__( 'Version %s', 'wp-adminos' ),
				$version
			);
		}

		if ( '' !== $author ) {
			$lines[] = sprintf(
				/* translators: %s: plugin author name. */
				__( 'By %s', 'wp-adminos' ),
				$author
			);
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
	 * This is a narrow fallback for plugins that use a product slug unrelated to
	 * their directory, text domain, or visible name.
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
	 * @param string $path       Source path.
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

	/**
	 * Built-in folder registry.
	 *
	 * User-created desktop folders are stored separately in user preferences.
	 *
	 * @param array<int,array<string,mixed>> $apps Visible apps.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_folders( $apps ) {
		return array();
	}

	/**
	 * Normalize and permission-check app data.
	 *
	 * @param mixed $apps Raw app data.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_apps( $apps ) {
		$normalized = array();

		if ( ! is_array( $apps ) ) {
			return $normalized;
		}

		foreach ( $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) || empty( $app['label'] ) ) {
				continue;
			}

			$cap = $this->normalize_capability( isset( $app['cap'] ) ? $app['cap'] : self::DEFAULT_CAPABILITY );
			if ( ! current_user_can( $cap ) ) {
				continue;
			}

			$id    = sanitize_key( $app['id'] );
			$label = sanitize_text_field( $app['label'] );
			$icon  = isset( $app['icon'] ) ? WP_AdminOS_Icon_Renderer::normalize( $app['icon'] ) : WP_AdminOS_Icon_Renderer::normalize( 'dashicons-admin-generic' );
			$group = isset( $app['group'] ) ? sanitize_key( $app['group'] ) : 'system';
			$kind  = isset( $app['kind'] ) ? sanitize_key( $app['kind'] ) : 'iframe';
			if ( '' === $id || '' === $label ) {
				continue;
			}
			if ( ! in_array( $group, array( 'content', 'site', 'system' ), true ) ) {
				$group = 'system';
			}
			if ( ! in_array( $kind, array( 'iframe', 'native' ), true ) ) {
				$kind = 'iframe';
			}

			$url    = isset( $app['url'] ) ? esc_url_raw( $app['url'] ) : '';
			$native = isset( $app['native'] ) ? sanitize_key( $app['native'] ) : '';
			$badge  = $this->normalize_badge( isset( $app['badge'] ) ? $app['badge'] : array() );

			/**
			 * Filter the normalized badge for a shell app.
			 *
			 * Return an empty value to hide the badge. Badge arrays accept text,
			 * optional count, tone, and aria_label fields.
			 *
			 * @param array<string,mixed> $badge Normalized badge data.
			 * @param array<string,mixed> $app Raw app data.
			 */
			$badge = $this->normalize_badge( apply_filters( 'wp_adminos_app_badge', $badge, $app ) );

			if ( 'iframe' === $kind && '' === $url ) {
				continue;
			}

			if ( 'native' === $kind && '' === $native ) {
				continue;
			}

			$normalized_app = array(
				'id'     => $id,
				'label'  => $label,
				'url'    => $url,
				'icon'   => $icon,
				'about'  => $this->normalize_about( isset( $app['about'] ) ? $app['about'] : array(), $label, $icon ),
				'group'  => $group,
				'cap'    => $cap,
				'kind'   => $kind,
				'native' => $native,
				'menu'   => $this->normalize_menu_definition( isset( $app['menu'] ) ? $app['menu'] : array(), $label ),
			);

			if ( ! empty( $badge ) ) {
				$normalized_app['badge'] = $badge;
			}

			$normalized[] = $normalized_app;
		}

		return $normalized;
	}

	/**
	 * Normalize an optional app badge descriptor.
	 *
	 * @param mixed $badge Raw badge descriptor.
	 * @return array<string,mixed>
	 */
	private function normalize_badge( $badge ) {
		if ( is_scalar( $badge ) ) {
			$badge = array(
				'text' => $badge,
			);
		}

		if ( ! is_array( $badge ) ) {
			return array();
		}

		$count = isset( $badge['count'] ) ? absint( $badge['count'] ) : 0;
		$text  = isset( $badge['text'] ) ? $this->sanitize_admin_menu_badge_text( $badge['text'] ) : '';
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

		$tone = isset( $badge['tone'] ) ? sanitize_key( $badge['tone'] ) : 'attention';
		if ( ! in_array( $tone, array( 'attention', 'neutral', 'update' ), true ) ) {
			$tone = 'attention';
		}

		$aria_label = isset( $badge['aria_label'] ) ? $this->sanitize_admin_menu_badge_text( $badge['aria_label'] ) : '';
		if ( '' === $aria_label ) {
			$aria_label = $count > 0
				? sprintf(
					/* translators: %s: Notification count. */
					_n( '%s notification', '%s notifications', $count, 'wp-adminos' ),
					$text
				)
				: sprintf(
					/* translators: %s: Badge text. */
					__( '%s status', 'wp-adminos' ),
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
	 * Normalize the menu definition for an app.
	 *
	 * @param mixed  $definition Raw menu definition.
	 * @param string $fallback_label App label used for default app menu.
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function normalize_menu_definition( $definition, $fallback_label ) {
		$groups = array();

		if ( is_array( $definition ) ) {
			if ( isset( $definition['groups'] ) && is_array( $definition['groups'] ) ) {
				$groups = $definition['groups'];
			} elseif ( array_values( $definition ) === $definition ) {
				$groups = $definition;
			} else {
				foreach ( $this->get_default_menu_group_ids() as $id ) {
					if ( isset( $definition[ $id ] ) && is_array( $definition[ $id ] ) ) {
						$groups[] = array_merge(
							$definition[ $id ],
							array( 'id' => $id )
						);
					}
				}
			}
		}

		$normalized_groups = $this->normalize_menu_groups( $groups, $fallback_label );

		return array(
			'groups' => $normalized_groups ? $normalized_groups : $this->get_default_app_menu_groups( $fallback_label ),
		);
	}

	/**
	 * Normalize menu groups.
	 *
	 * @param array<int,mixed> $groups Raw menu groups.
	 * @param string           $fallback_label App label used for default app menu.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_menu_groups( $groups, $fallback_label ) {
		$normalized = array();

		foreach ( $groups as $index => $group ) {
			if ( is_string( $group ) ) {
				$label = sanitize_text_field( $group );
				if ( '' !== $label ) {
					$normalized[] = array(
						'id'    => $this->get_default_menu_group_id( $index ),
						'label' => $label,
						'items' => array(),
					);
				}
				continue;
			}

			if ( ! is_array( $group ) ) {
				continue;
			}

			$id    = ! empty( $group['id'] ) ? $this->normalize_command_id( $group['id'] ) : $this->get_default_menu_group_id( $index );
			$label = ! empty( $group['label'] ) ? sanitize_text_field( $group['label'] ) : $this->get_default_menu_group_label( $id, $fallback_label );
			if ( '' === $id || '' === $label ) {
				continue;
			}

			$normalized_group = array(
				'id'    => $id,
				'label' => $label,
				'items' => $this->normalize_menu_command_items( isset( $group['items'] ) ? $group['items'] : array() ),
			);

			if ( ! empty( $group['disabled'] ) ) {
				$normalized_group['disabled'] = true;
			}

			if ( ! empty( $group['command'] ) ) {
				$normalized_group['command'] = $this->normalize_command_id( $group['command'] );
			}

			if ( ! empty( $group['icon'] ) ) {
				$normalized_group['icon'] = sanitize_text_field( $group['icon'] );
			}

			if ( ! empty( $group['payload'] ) ) {
				$normalized_group['payload'] = $this->normalize_menu_payload( $group['payload'] );
			}

			if ( ! empty( $group['target'] ) ) {
				$normalized_group['target'] = sanitize_text_field( $group['target'] );
			}

			if ( ! empty( $group['title'] ) ) {
				$normalized_group['title'] = sanitize_text_field( $group['title'] );
			}

			if ( ! empty( $group['url'] ) ) {
				$normalized_group['url'] = esc_url_raw( $group['url'] );
			}

			$normalized[] = $normalized_group;
		}

		return $normalized;
	}

	/**
	 * Normalize command-backed menu items.
	 *
	 * @param mixed $items Raw command items.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_menu_command_items( $items ) {
		$normalized = array();

		if ( ! is_array( $items ) ) {
			return $normalized;
		}

		foreach ( $items as $item ) {
			if ( is_string( $item ) ) {
				$label = sanitize_text_field( $item );
				if ( '' !== $label ) {
					$normalized[] = array( 'label' => $label );
				}
				continue;
			}

			if ( ! is_array( $item ) ) {
				continue;
			}

			if ( ! empty( $item['separator'] ) || ( isset( $item['type'] ) && 'separator' === $item['type'] ) ) {
				$normalized[] = array( 'type' => 'separator' );
				continue;
			}

			if ( empty( $item['label'] ) ) {
				continue;
			}

			$menu_item = array(
				'label' => sanitize_text_field( $item['label'] ),
			);

			if ( ! empty( $item['id'] ) ) {
				$menu_item['id'] = $this->normalize_command_id( $item['id'] );
			}

			if ( ! empty( $item['command'] ) ) {
				$menu_item['command'] = $this->normalize_command_id( $item['command'] );
			}

			if ( ! empty( $item['icon'] ) ) {
				$menu_item['icon'] = sanitize_text_field( $item['icon'] );
			}

			if ( ! empty( $item['payload'] ) ) {
				$menu_item['payload'] = $this->normalize_menu_payload( $item['payload'] );
			}

			if ( ! empty( $item['shortcut'] ) ) {
				$shortcut = $this->normalize_menu_shortcut( $item['shortcut'] );
				if ( ! empty( $shortcut ) ) {
					$menu_item['shortcut'] = $shortcut;
				}
			}

			if ( ! empty( $item['target'] ) ) {
				$menu_item['target'] = sanitize_text_field( $item['target'] );
			}

			if ( ! empty( $item['title'] ) ) {
				$menu_item['title'] = sanitize_text_field( $item['title'] );
			}

			if ( ! empty( $item['url'] ) ) {
				$menu_item['url'] = esc_url_raw( $item['url'] );
			}

			if ( ! empty( $item['disabled'] ) ) {
				$menu_item['disabled'] = true;
			}

			if ( '' !== $menu_item['label'] ) {
				$normalized[] = $menu_item;
			}
		}

		return $normalized;
	}

	/**
	 * System Settings app menu definition.
	 *
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function get_os_settings_menu() {
		return array(
			'groups' => array(
				array(
					'id'    => 'app',
					'label' => __( 'System Settings', 'wp-adminos' ),
					'items' => array(
						array(
							'label'   => __( 'About System Settings', 'wp-adminos' ),
							'command' => 'open-about',
							'target'  => 'os-settings',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Hide System Settings', 'wp-adminos' ),
							'command'  => 'window.hide',
							'icon'     => 'dashicons-hidden',
							'shortcut' => '⌘H',
						),
						array(
							'label'    => __( 'Hide Others', 'wp-adminos' ),
							'command'  => 'window.hide-others',
							'icon'     => 'dashicons-excerpt-view',
							'shortcut' => '⌥⌘H',
						),
						array(
							'label'   => __( 'Show All', 'wp-adminos' ),
							'command' => 'window.show-all',
							'icon'    => 'dashicons-visibility',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Quit System Settings', 'wp-adminos' ),
							'command'  => 'window.close',
							'icon'     => 'dashicons-dismiss',
							'shortcut' => '⌘Q',
						),
					),
				),
				array(
					'id'    => 'edit',
					'label' => __( 'Edit', 'wp-adminos' ),
					'items' => array(),
				),
				array(
					'id'    => 'view',
					'label' => __( 'View', 'wp-adminos' ),
					'items' => array(),
				),
				array(
					'id'    => 'window',
					'label' => __( 'Window', 'wp-adminos' ),
					'items' => array(),
				),
				array(
					'id'    => 'help',
					'label' => __( 'Help', 'wp-adminos' ),
					'items' => array(),
				),
			),
		);
	}

	/**
	 * Normalize command payload data.
	 *
	 * @param mixed $payload Raw payload data.
	 * @return array<string,mixed>
	 */
	private function normalize_menu_payload( $payload ) {
		$normalized = array();

		if ( ! is_array( $payload ) ) {
			return $normalized;
		}

		foreach ( $payload as $key => $value ) {
			$key = sanitize_key( $key );
			if ( '' === $key ) {
				continue;
			}

			if ( is_array( $value ) ) {
				$normalized[ $key ] = $this->normalize_menu_payload( $value );
			} elseif ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
				$normalized[ $key ] = $value;
			} elseif ( is_scalar( $value ) ) {
				$normalized[ $key ] = sanitize_text_field( (string) $value );
			}
		}

		return $normalized;
	}

	/**
	 * Normalize a keyboard shortcut descriptor.
	 *
	 * Shortcuts may be plain display strings like "⌘W" or structured arrays
	 * with key/modifiers for future platform-specific expansion.
	 *
	 * @param mixed $shortcut Raw shortcut descriptor.
	 * @return string|array<string,mixed>
	 */
	private function normalize_menu_shortcut( $shortcut ) {
		if ( is_string( $shortcut ) ) {
			return sanitize_text_field( $shortcut );
		}

		if ( ! is_array( $shortcut ) ) {
			return '';
		}

		$normalized = array();

		if ( ! empty( $shortcut['label'] ) && is_string( $shortcut['label'] ) ) {
			$normalized['label'] = sanitize_text_field( $shortcut['label'] );
		}

		if ( ! empty( $shortcut['key'] ) && is_string( $shortcut['key'] ) ) {
			$normalized['key'] = sanitize_text_field( $shortcut['key'] );
		}

		if ( ! empty( $shortcut['keyLabel'] ) && is_string( $shortcut['keyLabel'] ) ) {
			$normalized['keyLabel'] = sanitize_text_field( $shortcut['keyLabel'] );
		}

		if ( ! empty( $shortcut['modifiers'] ) && is_array( $shortcut['modifiers'] ) ) {
			$allowed_modifiers = array( 'alt', 'ctrl', 'meta', 'shift' );
			$modifiers         = array();

			foreach ( $shortcut['modifiers'] as $modifier ) {
				$modifier = sanitize_key( (string) $modifier );
				if ( in_array( $modifier, $allowed_modifiers, true ) && ! in_array( $modifier, $modifiers, true ) ) {
					$modifiers[] = $modifier;
				}
			}

			if ( ! empty( $modifiers ) ) {
				$normalized['modifiers'] = $modifiers;
			}
		}

		if ( ! empty( $shortcut['allowInTextFields'] ) ) {
			$normalized['allowInTextFields'] = true;
		}

		if ( isset( $shortcut['preventDefault'] ) && false === (bool) $shortcut['preventDefault'] ) {
			$normalized['preventDefault'] = false;
		}

		return empty( $normalized['label'] ) && empty( $normalized['key'] ) ? '' : $normalized;
	}

	/**
	 * Default app menu groups.
	 *
	 * @param string $app_label Active app label.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_default_app_menu_groups( $app_label ) {
		return array(
			array(
				'id'    => 'app',
				'label' => $app_label,
				'items' => array(
					array(
						'label'   => sprintf(
							/* translators: %s: app label. */
							__( 'About %s', 'wp-adminos' ),
							$app_label
						),
						'command' => 'open-about',
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Hide %s', 'wp-adminos' ),
							$app_label
						),
						'command'  => 'window.hide',
						'shortcut' => '⌘H',
					),
					array(
						'label'    => __( 'Hide Others', 'wp-adminos' ),
						'command'  => 'window.hide-others',
						'shortcut' => '⌥⌘H',
					),
					array(
						'label'   => __( 'Show All', 'wp-adminos' ),
						'command' => 'window.show-all',
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Quit %s', 'wp-adminos' ),
							$app_label
						),
						'command'  => 'window.close',
						'shortcut' => '⌘Q',
					),
				),
			),
			array(
				'id'    => 'file',
				'label' => __( 'File', 'wp-adminos' ),
				'items' => array(),
			),
			array(
				'id'    => 'edit',
				'label' => __( 'Edit', 'wp-adminos' ),
				'items' => array(),
			),
			array(
				'id'    => 'view',
				'label' => __( 'View', 'wp-adminos' ),
				'items' => array(),
			),
			array(
				'id'    => 'window',
				'label' => __( 'Window', 'wp-adminos' ),
				'items' => array(
					array(
						'label'    => __( 'Minimize', 'wp-adminos' ),
						'command'  => 'window.minimize',
						'shortcut' => '⌘M',
					),
					array(
						'label'   => __( 'Zoom', 'wp-adminos' ),
						'command' => 'window.toggle-maximize',
					),
					array(
						'label'    => __( 'Close', 'wp-adminos' ),
						'command'  => 'window.close',
						'shortcut' => '⌘W',
					),
				),
			),
			array(
				'id'    => 'help',
				'label' => __( 'Help', 'wp-adminos' ),
				'items' => array(),
			),
		);
	}

	/**
	 * Default menu group id by position.
	 *
	 * @param int $index Group position.
	 * @return string
	 */
	private function get_default_menu_group_id( $index ) {
		$ids = $this->get_default_menu_group_ids();

		return isset( $ids[ $index ] ) ? $ids[ $index ] : 'menu-' . ( $index + 1 );
	}

	/**
	 * Default menu group ids.
	 *
	 * @return array<int,string>
	 */
	private function get_default_menu_group_ids() {
		return array( 'app', 'file', 'edit', 'view', 'go', 'window', 'help' );
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
		$icon  = isset( $about['icon'] ) ? WP_AdminOS_Icon_Renderer::normalize( $about['icon'] ) : $fallback_icon;
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
					__( 'Version %s', 'wp-adminos' ),
					WP_ADMINOS_VERSION
				),
			'copyright' => array_key_exists( 'copyright', $about )
				? sanitize_text_field( (string) $about['copyright'] )
				: sprintf(
					/* translators: %s: current year. */
					__( 'Copyright (c) %s WP adminOS contributors.', 'wp-adminos' ),
					$year
				),
			'rights'    => array_key_exists( 'rights', $about ) ? sanitize_text_field( (string) $about['rights'] ) : __( 'Licensed under GPLv2 or later.', 'wp-adminos' ),
			'lines'     => $lines,
			'icon'      => $icon,
		);
	}

	/**
	 * Default menu group label.
	 *
	 * @param string $id Group id.
	 * @param string $fallback_label App label.
	 * @return string
	 */
	private function get_default_menu_group_label( $id, $fallback_label ) {
		$labels = array(
			'app'    => $fallback_label,
			'file'   => __( 'File', 'wp-adminos' ),
			'edit'   => __( 'Edit', 'wp-adminos' ),
			'view'   => __( 'View', 'wp-adminos' ),
			'go'     => __( 'Go', 'wp-adminos' ),
			'window' => __( 'Window', 'wp-adminos' ),
			'help'   => __( 'Help', 'wp-adminos' ),
		);

		return isset( $labels[ $id ] ) ? $labels[ $id ] : sanitize_text_field( $id );
	}

	/**
	 * Normalize command and group identifiers.
	 *
	 * @param mixed $value Raw id.
	 * @return string
	 */
	private function normalize_command_id( $value ) {
		$value = strtolower( sanitize_text_field( (string) $value ) );
		$normalized = preg_replace( '/[^a-z0-9_.-]/', '', $value );

		return is_string( $normalized ) ? $normalized : '';
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
