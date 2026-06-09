<?php
/**
 * App menu normalization.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes app menu definitions into the runtime menu schema.
 */
final class PufferDesk_App_Menu_Normalizer {
	/**
	 * Normalize the menu definition for an app.
	 *
	 * @param mixed  $definition Raw menu definition.
	 * @param string $fallback_label App label used for default app menu.
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	public function normalize_definition( $definition, $fallback_label ) {
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
	 * System Settings app menu definition.
	 *
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	public function get_os_settings_menu() {
		return array(
			'groups' => array(
				array(
					'id'    => 'app',
					'label' => __( 'System Settings', 'pufferdesk-admin-desktop' ),
					'items' => array(
						array(
							'label'   => __( 'About System Settings', 'pufferdesk-admin-desktop' ),
							'command' => 'open-about',
							'target'  => 'os-settings',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Hide System Settings', 'pufferdesk-admin-desktop' ),
							'command'  => 'window.hide',
							'icon'     => 'dashicons-hidden',
							'shortcut' => '⌘H',
						),
						array(
							'label'    => __( 'Hide Others', 'pufferdesk-admin-desktop' ),
							'command'  => 'window.hide-others',
							'icon'     => 'dashicons-excerpt-view',
							'shortcut' => '⌥⌘H',
						),
						array(
							'label'   => __( 'Show All', 'pufferdesk-admin-desktop' ),
							'command' => 'window.show-all',
							'icon'    => 'dashicons-visibility',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Quit System Settings', 'pufferdesk-admin-desktop' ),
							'command'  => 'window.close',
							'icon'     => 'dashicons-dismiss',
							'shortcut' => '⌘Q',
						),
					),
				),
				array(
					'id'    => 'edit',
					'label' => __( 'Edit', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
				array(
					'id'    => 'view',
					'label' => __( 'View', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
				array(
					'id'    => 'window',
					'label' => __( 'Window', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
				array(
					'id'    => 'help',
					'label' => __( 'Help', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
			),
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
							__( 'About %s', 'pufferdesk-admin-desktop' ),
							$app_label
						),
						'command' => 'open-about',
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Hide %s', 'pufferdesk-admin-desktop' ),
							$app_label
						),
						'command'  => 'window.hide',
						'shortcut' => '⌘H',
					),
					array(
						'label'    => __( 'Hide Others', 'pufferdesk-admin-desktop' ),
						'command'  => 'window.hide-others',
						'shortcut' => '⌥⌘H',
					),
					array(
						'label'   => __( 'Show All', 'pufferdesk-admin-desktop' ),
						'command' => 'window.show-all',
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Quit %s', 'pufferdesk-admin-desktop' ),
							$app_label
						),
						'command'  => 'window.close',
						'shortcut' => '⌘Q',
					),
				),
			),
			array(
				'id'    => 'file',
				'label' => __( 'File', 'pufferdesk-admin-desktop' ),
				'items' => array(),
			),
			array(
				'id'    => 'edit',
				'label' => __( 'Edit', 'pufferdesk-admin-desktop' ),
				'items' => array(),
			),
			array(
				'id'    => 'view',
				'label' => __( 'View', 'pufferdesk-admin-desktop' ),
				'items' => array(),
			),
			array(
				'id'    => 'window',
				'label' => __( 'Window', 'pufferdesk-admin-desktop' ),
				'items' => array(
					array(
						'label'    => __( 'Minimize', 'pufferdesk-admin-desktop' ),
						'command'  => 'window.minimize',
						'shortcut' => '⌘M',
					),
					array(
						'label'   => __( 'Zoom', 'pufferdesk-admin-desktop' ),
						'command' => 'window.toggle-maximize',
					),
					array(
						'label'    => __( 'Close', 'pufferdesk-admin-desktop' ),
						'command'  => 'window.close',
						'shortcut' => '⌘W',
					),
				),
			),
			array(
				'id'    => 'help',
				'label' => __( 'Help', 'pufferdesk-admin-desktop' ),
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
			'file'   => __( 'File', 'pufferdesk-admin-desktop' ),
			'edit'   => __( 'Edit', 'pufferdesk-admin-desktop' ),
			'view'   => __( 'View', 'pufferdesk-admin-desktop' ),
			'go'     => __( 'Go', 'pufferdesk-admin-desktop' ),
			'window' => __( 'Window', 'pufferdesk-admin-desktop' ),
			'help'   => __( 'Help', 'pufferdesk-admin-desktop' ),
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
		$value      = strtolower( sanitize_text_field( (string) $value ) );
		$normalized = preg_replace( '/[^a-z0-9_.-]/', '', $value );

		return is_string( $normalized ) ? $normalized : '';
	}
}
