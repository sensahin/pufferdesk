<?php
/**
 * Admin app registry.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the app and folder data consumed by the shell.
 */
final class Admin_OS_Mode_App_Registry {
	/**
	 * App registry for the first shell.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_apps() {
		$apps = array(
			array(
				'id'    => 'dashboard',
				'label' => __( 'Dashboard', 'admin-os-mode' ),
				'url'   => admin_url( 'index.php?admin_os_classic=1' ),
				'icon'  => $this->theme_icon( 'dashboard.svg', 'dashicons-dashboard' ),
				'group' => 'content',
				'cap'   => 'read',
			),
			array(
				'id'    => 'posts',
				'label' => __( 'Posts', 'admin-os-mode' ),
				'url'   => admin_url( 'edit.php' ),
				'icon'  => $this->theme_icon( 'posts.svg', 'dashicons-admin-post' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'pages',
				'label' => __( 'Pages', 'admin-os-mode' ),
				'url'   => admin_url( 'edit.php?post_type=page' ),
				'icon'  => $this->theme_icon( 'pages.svg', 'dashicons-admin-page' ),
				'group' => 'content',
				'cap'   => 'edit_pages',
			),
			array(
				'id'    => 'media',
				'label' => __( 'Media', 'admin-os-mode' ),
				'url'   => admin_url( 'upload.php' ),
				'icon'  => $this->theme_icon( 'media.svg', 'dashicons-admin-media' ),
				'group' => 'content',
				'cap'   => 'upload_files',
			),
			array(
				'id'    => 'comments',
				'label' => __( 'Comments', 'admin-os-mode' ),
				'url'   => admin_url( 'edit-comments.php' ),
				'icon'  => $this->theme_icon( 'comments.svg', 'dashicons-admin-comments' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'appearance',
				'label' => __( 'Appearance', 'admin-os-mode' ),
				'url'   => admin_url( 'themes.php' ),
				'icon'  => $this->theme_icon( 'appearance.svg', 'dashicons-admin-appearance' ),
				'group' => 'site',
				'cap'   => 'switch_themes',
			),
			array(
				'id'    => 'plugins',
				'label' => __( 'Plugins', 'admin-os-mode' ),
				'url'   => admin_url( 'plugins.php' ),
				'icon'  => $this->theme_icon( 'plugins.svg', 'dashicons-admin-plugins' ),
				'group' => 'system',
				'cap'   => 'activate_plugins',
			),
			array(
				'id'    => 'users',
				'label' => __( 'Users', 'admin-os-mode' ),
				'url'   => admin_url( 'users.php' ),
				'icon'  => $this->theme_icon( 'users.svg', 'dashicons-admin-users' ),
				'group' => 'system',
				'cap'   => 'list_users',
			),
			array(
				'id'     => 'os-settings',
				'label'  => __( 'OS Settings', 'admin-os-mode' ),
				'icon'   => $this->theme_icon( 'os-settings.svg', 'dashicons-admin-customizer' ),
				'group'  => 'system',
				'cap'    => 'read',
				'kind'   => 'native',
				'native' => 'settings',
			),
			array(
				'id'    => 'settings',
				'label' => __( 'Settings', 'admin-os-mode' ),
				'url'   => admin_url( 'options-general.php' ),
				'icon'  => $this->theme_icon( 'settings.svg', 'dashicons-admin-settings' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'tools',
				'label' => __( 'Tools', 'admin-os-mode' ),
				'url'   => admin_url( 'tools.php' ),
				'icon'  => $this->theme_icon( 'tools.svg', 'dashicons-admin-tools' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'site-health',
				'label' => __( 'Site Health', 'admin-os-mode' ),
				'url'   => admin_url( 'site-health.php' ),
				'icon'  => $this->theme_icon( 'site-health.svg', 'dashicons-heart' ),
				'group' => 'system',
				'cap'   => 'view_site_health_checks',
			),
		);

		if ( class_exists( 'WooCommerce' ) || current_user_can( 'manage_woocommerce' ) ) {
			$apps[] = array(
				'id'    => 'woocommerce',
				'label' => __( 'WooCommerce', 'admin-os-mode' ),
				'url'   => admin_url( 'admin.php?page=wc-admin' ),
				'icon'  => $this->theme_icon( 'woocommerce.svg', 'dashicons-cart' ),
				'group' => 'site',
				'cap'   => 'manage_woocommerce',
			);
		}

		$apps = array_values(
			array_filter(
				$apps,
				static function ( $app ) {
					return current_user_can( $app['cap'] );
				}
			)
		);

		/**
		 * Filter the shell app registry.
		 *
		 * Each app accepts id, label, url, icon, group, cap, kind, native, and menu.
		 * Icons may be a Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-admin-post' )
		 * array( 'type' => 'image', 'src' => 'themes/adminos/default/icons/posts.svg' )
		 * array( 'type' => 'theme', 'name' => 'posts.svg', 'fallback' => 'dashicons-admin-post' )
		 * Menus use array( 'groups' => array( ... ) ) with command-backed items.
		 *
		 * @param array<int,array<string,mixed>> $apps Registered apps.
		 */
		$apps = apply_filters( 'admin_os_mode_apps', $apps );

		return $this->normalize_apps( $apps );
	}

	/**
	 * Folder registry derived from visible apps.
	 *
	 * @param array<int,array<string,mixed>> $apps Visible apps.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_folders( $apps ) {
		$counts = array();
		foreach ( $apps as $app ) {
			$group            = isset( $app['group'] ) ? $app['group'] : 'system';
			$counts[ $group ] = isset( $counts[ $group ] ) ? $counts[ $group ] + 1 : 1;
		}

		$folders = array(
			array(
				'id'    => 'content',
				'label' => __( 'Content', 'admin-os-mode' ),
				'icon'  => $this->theme_icon( 'folder-content.svg', 'dashicons-category' ),
			),
			array(
				'id'    => 'site',
				'label' => __( 'Site', 'admin-os-mode' ),
				'icon'  => $this->theme_icon( 'folder-site.svg', 'dashicons-admin-site-alt3' ),
			),
			array(
				'id'    => 'system',
				'label' => __( 'System', 'admin-os-mode' ),
				'icon'  => $this->theme_icon( 'folder-system.svg', 'dashicons-admin-generic' ),
			),
		);

		$folders = array_values(
			array_filter(
				$folders,
				static function ( $folder ) use ( $counts ) {
					return ! empty( $counts[ $folder['id'] ] );
				}
			)
		);

		foreach ( $folders as $index => $folder ) {
			$folders[ $index ]['icon'] = Admin_OS_Mode_Icon_Renderer::normalize( $folder['icon'] );
		}

		return $folders;
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

			if ( ! empty( $app['cap'] ) && ! current_user_can( $app['cap'] ) ) {
				continue;
			}

			$label = sanitize_text_field( $app['label'] );
			$icon  = isset( $app['icon'] ) ? Admin_OS_Mode_Icon_Renderer::normalize( $app['icon'] ) : Admin_OS_Mode_Icon_Renderer::normalize( 'dashicons-admin-generic' );
			$group = isset( $app['group'] ) ? sanitize_key( $app['group'] ) : 'system';
			$kind  = isset( $app['kind'] ) ? sanitize_key( $app['kind'] ) : 'iframe';
			if ( ! in_array( $group, array( 'content', 'site', 'system' ), true ) ) {
				$group = 'system';
			}
			if ( ! in_array( $kind, array( 'iframe', 'native' ), true ) ) {
				$kind = 'iframe';
			}

			$url    = isset( $app['url'] ) ? esc_url_raw( $app['url'] ) : '';
			$native = isset( $app['native'] ) ? sanitize_key( $app['native'] ) : '';

			if ( 'iframe' === $kind && '' === $url ) {
				continue;
			}

			if ( 'native' === $kind && '' === $native ) {
				continue;
			}

			$normalized[] = array(
				'id'     => sanitize_key( $app['id'] ),
				'label'  => $label,
				'url'    => $url,
				'icon'   => $icon,
				'group'  => $group,
				'kind'   => $kind,
				'native' => $native,
				'menu'   => $this->normalize_menu_definition( isset( $app['menu'] ) ? $app['menu'] : array(), $label ),
			);
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
							__( 'About %s', 'admin-os-mode' ),
							$app_label
						),
						'command' => 'noop',
					),
				),
			),
			array(
				'id'    => 'file',
				'label' => __( 'File', 'admin-os-mode' ),
				'items' => array(),
			),
			array(
				'id'    => 'edit',
				'label' => __( 'Edit', 'admin-os-mode' ),
				'items' => array(),
			),
			array(
				'id'    => 'view',
				'label' => __( 'View', 'admin-os-mode' ),
				'items' => array(),
			),
			array(
				'id'    => 'window',
				'label' => __( 'Window', 'admin-os-mode' ),
				'items' => array(
					array(
						'label'   => __( 'Minimize', 'admin-os-mode' ),
						'command' => 'window.minimize',
					),
					array(
						'label'   => __( 'Zoom', 'admin-os-mode' ),
						'command' => 'window.toggle-maximize',
					),
					array(
						'label'   => __( 'Close', 'admin-os-mode' ),
						'command' => 'window.close',
					),
				),
			),
			array(
				'id'    => 'help',
				'label' => __( 'Help', 'admin-os-mode' ),
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
	 * Default menu group label.
	 *
	 * @param string $id Group id.
	 * @param string $fallback_label App label.
	 * @return string
	 */
	private function get_default_menu_group_label( $id, $fallback_label ) {
		$labels = array(
			'app'    => $fallback_label,
			'file'   => __( 'File', 'admin-os-mode' ),
			'edit'   => __( 'Edit', 'admin-os-mode' ),
			'view'   => __( 'View', 'admin-os-mode' ),
			'go'     => __( 'Go', 'admin-os-mode' ),
			'window' => __( 'Window', 'admin-os-mode' ),
			'help'   => __( 'Help', 'admin-os-mode' ),
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
