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
	const GROUP_SITE   = 'site';
	const GROUP_APP    = 'app';
	const GROUP_FILE   = 'file';
	const GROUP_EDIT   = 'edit';
	const GROUP_VIEW   = 'view';
	const GROUP_GO     = 'go';
	const GROUP_WINDOW = 'window';
	const GROUP_HELP   = 'help';

	/**
	 * Standard app menu group ids.
	 *
	 * @return array<int,string>
	 */
	public static function get_standard_group_ids() {
		return array(
			self::GROUP_APP,
			self::GROUP_FILE,
			self::GROUP_EDIT,
			self::GROUP_VIEW,
			self::GROUP_GO,
			self::GROUP_WINDOW,
			self::GROUP_HELP,
		);
	}

	/**
	 * Recognized app menu group ids.
	 *
	 * @return array<int,string>
	 */
	public static function get_recognized_group_ids() {
		return array_merge( array( self::GROUP_SITE ), self::get_standard_group_ids() );
	}

	/**
	 * Browser menu group contract.
	 *
	 * @return array<string,mixed>
	 */
	public static function client_contract() {
		return array(
			'ids'        => array(
				'SITE'   => self::GROUP_SITE,
				'APP'    => self::GROUP_APP,
				'FILE'   => self::GROUP_FILE,
				'EDIT'   => self::GROUP_EDIT,
				'VIEW'   => self::GROUP_VIEW,
				'GO'     => self::GROUP_GO,
				'WINDOW' => self::GROUP_WINDOW,
				'HELP'   => self::GROUP_HELP,
			),
			'standard'  => self::get_standard_group_ids(),
			'recognized' => self::get_recognized_group_ids(),
		);
	}

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
					'id'    => self::GROUP_APP,
					'label' => __( 'System Settings', 'pufferdesk-admin-desktop' ),
					'items' => array(
						array(
							'label'   => __( 'About System Settings', 'pufferdesk-admin-desktop' ),
							'command' => PufferDesk_Command_Ids::OPEN_ABOUT,
							'target'  => PufferDesk_App_Ids::OS_SETTINGS,
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Hide System Settings', 'pufferdesk-admin-desktop' ),
							'command'  => PufferDesk_Command_Ids::WINDOW_HIDE,
							'icon'     => 'dashicons-hidden',
						),
						array(
							'label'    => __( 'Hide Others', 'pufferdesk-admin-desktop' ),
							'command'  => PufferDesk_Command_Ids::WINDOW_HIDE_OTHERS,
							'icon'     => 'dashicons-excerpt-view',
						),
						array(
							'label'   => __( 'Show All', 'pufferdesk-admin-desktop' ),
							'command' => PufferDesk_Command_Ids::WINDOW_SHOW_ALL,
							'icon'    => 'dashicons-visibility',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Quit System Settings', 'pufferdesk-admin-desktop' ),
							'command'  => PufferDesk_Command_Ids::WINDOW_CLOSE,
							'icon'     => 'dashicons-dismiss',
						),
					),
				),
				array(
					'id'    => self::GROUP_EDIT,
					'label' => __( 'Edit', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
				array(
					'id'    => self::GROUP_VIEW,
					'label' => __( 'View', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
				array(
					'id'    => self::GROUP_WINDOW,
					'label' => __( 'Window', 'pufferdesk-admin-desktop' ),
					'items' => array(),
				),
				array(
					'id'    => self::GROUP_HELP,
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

		foreach ( array( 'combo', 'macCombo', 'winCombo', 'linuxCombo' ) as $combo_key ) {
			if ( ! empty( $shortcut[ $combo_key ] ) && is_string( $shortcut[ $combo_key ] ) ) {
				$normalized[ $combo_key ] = sanitize_text_field( $shortcut[ $combo_key ] );
			}
		}

		if ( ! empty( $shortcut['modifiers'] ) && is_array( $shortcut['modifiers'] ) ) {
			$allowed_modifiers = array( 'alt', 'ctrl', 'meta', 'primary', 'secondary', 'shift' );
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

		if ( ! empty( $shortcut['keys'] ) && is_array( $shortcut['keys'] ) ) {
			$keys = array();

			foreach ( $shortcut['keys'] as $key ) {
				if ( is_scalar( $key ) ) {
					$key = sanitize_text_field( (string) $key );
					if ( '' !== $key ) {
						$keys[] = $key;
					}
				}
			}

			if ( ! empty( $keys ) ) {
				$normalized['keys'] = $keys;
			}
		}

		if ( ! empty( $shortcut['context'] ) && is_string( $shortcut['context'] ) ) {
			$normalized['context'] = sanitize_key( $shortcut['context'] );
		}

		if ( ! empty( $shortcut['contexts'] ) && is_array( $shortcut['contexts'] ) ) {
			$contexts = array();

			foreach ( $shortcut['contexts'] as $context ) {
				$context = sanitize_key( (string) $context );
				if ( '' !== $context && ! in_array( $context, $contexts, true ) ) {
					$contexts[] = $context;
				}
			}

			if ( ! empty( $contexts ) ) {
				$normalized['contexts'] = $contexts;
			}
		}

		if ( ! empty( $shortcut['allowInTextFields'] ) ) {
			$normalized['allowInTextFields'] = true;
		}

		if ( isset( $shortcut['preventDefault'] ) && false === (bool) $shortcut['preventDefault'] ) {
			$normalized['preventDefault'] = false;
		}

		if ( ! empty( $shortcut['allowReserved'] ) ) {
			$normalized['allowReserved'] = true;
		}

		if ( ! empty( $shortcut['reservedReason'] ) && is_string( $shortcut['reservedReason'] ) ) {
			$normalized['reservedReason'] = sanitize_text_field( $shortcut['reservedReason'] );
		}

		return empty( $normalized['label'] ) && empty( $normalized['key'] ) && empty( $normalized['combo'] ) && empty( $normalized['keys'] ) ? '' : $normalized;
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
				'id'    => self::GROUP_APP,
				'label' => $app_label,
				'items' => array(
					array(
						'label'   => sprintf(
							/* translators: %s: app label. */
							__( 'About %s', 'pufferdesk-admin-desktop' ),
							$app_label
						),
						'command' => PufferDesk_Command_Ids::OPEN_ABOUT,
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Hide %s', 'pufferdesk-admin-desktop' ),
							$app_label
						),
						'command'  => PufferDesk_Command_Ids::WINDOW_HIDE,
					),
					array(
						'label'    => __( 'Hide Others', 'pufferdesk-admin-desktop' ),
						'command'  => PufferDesk_Command_Ids::WINDOW_HIDE_OTHERS,
					),
					array(
						'label'   => __( 'Show All', 'pufferdesk-admin-desktop' ),
						'command' => PufferDesk_Command_Ids::WINDOW_SHOW_ALL,
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Quit %s', 'pufferdesk-admin-desktop' ),
							$app_label
						),
						'command'  => PufferDesk_Command_Ids::WINDOW_CLOSE,
					),
				),
			),
			array(
				'id'    => self::GROUP_FILE,
				'label' => __( 'File', 'pufferdesk-admin-desktop' ),
				'items' => array(),
			),
			array(
				'id'    => self::GROUP_EDIT,
				'label' => __( 'Edit', 'pufferdesk-admin-desktop' ),
				'items' => array(),
			),
			array(
				'id'    => self::GROUP_VIEW,
				'label' => __( 'View', 'pufferdesk-admin-desktop' ),
				'items' => array(),
			),
			array(
				'id'    => self::GROUP_WINDOW,
				'label' => __( 'Window', 'pufferdesk-admin-desktop' ),
				'items' => array(
					array(
						'label'    => __( 'Minimize', 'pufferdesk-admin-desktop' ),
						'command'  => PufferDesk_Command_Ids::WINDOW_MINIMIZE,
						'shortcut' => array(
							'allowReserved'  => true,
							'combo'          => 'primary+m',
							'contexts'       => array( 'window' ),
							'reservedReason' => __( 'Scoped to PufferDesk windows.', 'pufferdesk-admin-desktop' ),
						),
					),
					array(
						'label'   => __( 'Zoom', 'pufferdesk-admin-desktop' ),
						'command' => PufferDesk_Command_Ids::WINDOW_TOGGLE_MAXIMIZE,
					),
					array(
						'label'    => __( 'Close', 'pufferdesk-admin-desktop' ),
						'command'  => PufferDesk_Command_Ids::WINDOW_CLOSE,
						'shortcut' => array(
							'combo'    => 'primary+w',
							'contexts' => array( 'window' ),
						),
					),
				),
			),
			array(
				'id'    => self::GROUP_HELP,
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
		return self::get_standard_group_ids();
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
			self::GROUP_APP    => $fallback_label,
			self::GROUP_FILE   => __( 'File', 'pufferdesk-admin-desktop' ),
			self::GROUP_EDIT   => __( 'Edit', 'pufferdesk-admin-desktop' ),
			self::GROUP_VIEW   => __( 'View', 'pufferdesk-admin-desktop' ),
			self::GROUP_GO     => __( 'Go', 'pufferdesk-admin-desktop' ),
			self::GROUP_WINDOW => __( 'Window', 'pufferdesk-admin-desktop' ),
			self::GROUP_HELP   => __( 'Help', 'pufferdesk-admin-desktop' ),
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
