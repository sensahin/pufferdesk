<?php
/**
 * Sound event registry.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Centralizes semantic sound events and their default assets.
 */
final class PufferDesk_Sound_Registry {
	const EVENT_NOTIFICATION_DEFAULT  = 'notification.default';
	const EVENT_NOTIFICATION_INFO     = 'notification.info';
	const EVENT_NOTIFICATION_WARNING  = 'notification.warning';
	const EVENT_NOTIFICATION_ERROR    = 'notification.error';
	const EVENT_DIALOG_WARNING        = 'dialog.warning';
	const EVENT_DIALOG_DESTRUCTIVE    = 'dialog.destructive';
	const EVENT_TRASH_EMPTY           = PufferDesk_Command_Ids::TRASH_EMPTY;
	const EVENT_APP_ERROR             = 'app.error';

	/**
	 * Build the browser runtime sound configuration.
	 *
	 * @param array<string,mixed>                  $theme Resolved theme metadata.
	 * @param PufferDesk_User_Preferences|null    $preferences User preference service.
	 * @return array<string,mixed>
	 */
	public function get_client_config( $theme = array(), $preferences = null ) {
		$theme_sounds = isset( $theme['sounds'] ) && is_array( $theme['sounds'] ) ? $theme['sounds'] : array();
		$events       = $this->get_registered_events();
		$config       = array(
			'enabled'            => true,
			'eventIds'           => $this->get_event_id_map(),
			'events'             => array(),
			'notificationEvents' => $this->get_notification_event_map(),
			'preferences'        => $preferences instanceof PufferDesk_User_Preferences ? $preferences->get_sounds() : array(
				'enabled' => true,
				'volume'  => 70,
			),
			'rateLimitMs'        => 700,
		);

		if ( array_key_exists( 'enabled', $theme_sounds ) ) {
			$config['enabled'] = (bool) $theme_sounds['enabled'];
		}

		if ( isset( $theme_sounds['rateLimitMs'] ) && is_numeric( $theme_sounds['rateLimitMs'] ) ) {
			$config['rateLimitMs'] = max( 0, min( 5000, absint( $theme_sounds['rateLimitMs'] ) ) );
		}

		$theme_events = isset( $theme_sounds['events'] ) && is_array( $theme_sounds['events'] ) ? $theme_sounds['events'] : array();

		foreach ( $events as $event_id => $event ) {
			$source = $this->normalize_event_source( isset( $event['source'] ) ? $event['source'] : array() );

			if ( isset( $theme_events[ $event_id ] ) ) {
				$source = array_merge(
					$source,
					$this->normalize_event_source( $theme_events[ $event_id ], $source )
				);
			}

			if ( empty( $source['src'] ) ) {
				continue;
			}

			$config['events'][ $event_id ] = $source;
		}

		foreach ( $theme_events as $event_id => $event ) {
			$event_id = $this->normalize_event_id( $event_id );
			if ( '' === $event_id || isset( $config['events'][ $event_id ] ) ) {
				continue;
			}

			$source = $this->normalize_event_source( $event );
			if ( ! empty( $source['src'] ) ) {
				$config['events'][ $event_id ] = $source;
			}
		}

		return $config;
	}

	/**
	 * Stable client aliases for semantic sound event IDs.
	 *
	 * @return array<string,string>
	 */
	private function get_event_id_map() {
		return array(
			'appError'             => self::EVENT_APP_ERROR,
			'dialogDestructive'    => self::EVENT_DIALOG_DESTRUCTIVE,
			'dialogWarning'        => self::EVENT_DIALOG_WARNING,
			'notificationDefault'  => self::EVENT_NOTIFICATION_DEFAULT,
			'notificationError'    => self::EVENT_NOTIFICATION_ERROR,
			'notificationInfo'     => self::EVENT_NOTIFICATION_INFO,
			'notificationWarning'  => self::EVENT_NOTIFICATION_WARNING,
			'trashEmpty'           => self::EVENT_TRASH_EMPTY,
		);
	}

	/**
	 * Canonical notification type to sound event mapping.
	 *
	 * @return array<string,mixed>
	 */
	private function get_notification_event_map() {
		return array(
			'default' => self::EVENT_NOTIFICATION_DEFAULT,
			'types'   => array(
				'error'   => self::EVENT_NOTIFICATION_ERROR,
				'info'    => self::EVENT_NOTIFICATION_INFO,
				'success' => '',
				'warning' => self::EVENT_NOTIFICATION_WARNING,
			),
		);
	}

	/**
	 * Registered semantic sound events.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private function get_registered_events() {
		$notice = esc_url_raw( PUFFERDESK_URL . 'assets/media/shared/sounds/notification.wav' );
		$alert  = esc_url_raw( PUFFERDESK_URL . 'assets/media/shared/sounds/notification-alert.wav' );
		$events = array(
			self::EVENT_NOTIFICATION_DEFAULT => array(
				'description' => __( 'Fallback notification sound.', 'pufferdesk' ),
				'group'       => 'notifications',
				'label'       => __( 'Default notification', 'pufferdesk' ),
				'source'      => array(
					'src'    => $notice,
					'volume' => 0.34,
				),
			),
			self::EVENT_NOTIFICATION_INFO    => array(
				'description' => __( 'Used for standard notifications.', 'pufferdesk' ),
				'group'       => 'notifications',
				'label'       => __( 'Notification', 'pufferdesk' ),
				'source'      => array(
					'src'    => $notice,
					'volume' => 0.34,
				),
			),
			self::EVENT_NOTIFICATION_WARNING => array(
				'description' => __( 'Used for warning notifications.', 'pufferdesk' ),
				'group'       => 'notifications',
				'label'       => __( 'Warning notification', 'pufferdesk' ),
				'source'      => array(
					'src'    => $alert,
					'volume' => 0.36,
				),
			),
			self::EVENT_NOTIFICATION_ERROR   => array(
				'description' => __( 'Used for critical notifications.', 'pufferdesk' ),
				'group'       => 'notifications',
				'label'       => __( 'Critical notification', 'pufferdesk' ),
				'source'      => array(
					'src'    => $alert,
					'volume' => 0.4,
				),
			),
			self::EVENT_DIALOG_WARNING       => array(
				'description' => __( 'Reserved for warning dialogs.', 'pufferdesk' ),
				'group'       => 'dialogs',
				'label'       => __( 'Warning dialog', 'pufferdesk' ),
				'source'      => array(
					'src'    => $alert,
					'volume' => 0.38,
				),
			),
			self::EVENT_DIALOG_DESTRUCTIVE   => array(
				'description' => __( 'Reserved for destructive confirmations.', 'pufferdesk' ),
				'group'       => 'dialogs',
				'label'       => __( 'Destructive action', 'pufferdesk' ),
				'source'      => array(
					'src'    => $alert,
					'volume' => 0.4,
				),
			),
			self::EVENT_TRASH_EMPTY          => array(
				'description' => __( 'Reserved for emptying Trash or Recycle Bin.', 'pufferdesk' ),
				'group'       => 'system',
				'label'       => __( 'Empty Trash', 'pufferdesk' ),
				'source'      => array(
					'src'    => $alert,
					'volume' => 0.38,
				),
			),
			self::EVENT_APP_ERROR            => array(
				'description' => __( 'Reserved for app and plugin errors.', 'pufferdesk' ),
				'group'       => 'apps',
				'label'       => __( 'App error', 'pufferdesk' ),
				'source'      => array(
					'src'    => $alert,
					'volume' => 0.4,
				),
			),
		);

		/**
		 * Filter registered PufferDesk sound events.
		 *
		 * Event keys are semantic IDs such as "notification.warning". Each event
		 * may define label, description, group, and source fields.
		 *
		 * @param array<string,array<string,mixed>> $events Registered sound events.
		 */
		$events = apply_filters( 'pufferdesk_sound_events', $events );

		return $this->normalize_registered_events( is_array( $events ) ? $events : array() );
	}

	/**
	 * Normalize registered event metadata.
	 *
	 * @param array<string,mixed> $events Raw event definitions.
	 * @return array<string,array<string,mixed>>
	 */
	private function normalize_registered_events( $events ) {
		$normalized = array();

		foreach ( $events as $event_id => $event ) {
			$event_id = $this->normalize_event_id( $event_id );
			if ( '' === $event_id || ! is_array( $event ) ) {
				continue;
			}

			$label       = isset( $event['label'] ) && is_scalar( $event['label'] ) ? sanitize_text_field( (string) $event['label'] ) : $event_id;
			$description = isset( $event['description'] ) && is_scalar( $event['description'] ) ? sanitize_text_field( (string) $event['description'] ) : '';
			$group       = isset( $event['group'] ) && is_scalar( $event['group'] ) ? sanitize_key( (string) $event['group'] ) : 'system';

			$normalized[ $event_id ] = array(
				'description' => $description,
				'group'       => '' !== $group ? $group : 'system',
				'label'       => $label,
				'source'      => isset( $event['source'] ) ? $event['source'] : array(),
			);
		}

		return $normalized;
	}

	/**
	 * Normalize one event source descriptor.
	 *
	 * @param mixed               $event Raw source descriptor.
	 * @param array<string,mixed> $fallback Existing source values.
	 * @return array<string,mixed>
	 */
	private function normalize_event_source( $event, $fallback = array() ) {
		$descriptor = is_array( $event ) ? $event : array( 'src' => $event );
		$src        = isset( $fallback['src'] ) && is_string( $fallback['src'] ) ? $fallback['src'] : '';

		if ( isset( $descriptor['src'] ) && is_scalar( $descriptor['src'] ) ) {
			$src = esc_url_raw( (string) $descriptor['src'] );
		}

		if ( '' === $src && isset( $descriptor['url'] ) && is_scalar( $descriptor['url'] ) ) {
			$src = esc_url_raw( (string) $descriptor['url'] );
		}

		if ( '' === $src ) {
			return array();
		}

		$source = array(
			'src'    => $src,
			'volume' => isset( $fallback['volume'] ) && is_numeric( $fallback['volume'] ) ? max( 0, min( 1, (float) $fallback['volume'] ) ) : 0.35,
		);

		if ( isset( $descriptor['volume'] ) && is_numeric( $descriptor['volume'] ) ) {
			$source['volume'] = max( 0, min( 1, (float) $descriptor['volume'] ) );
		}

		if ( isset( $fallback['playbackRate'] ) && is_numeric( $fallback['playbackRate'] ) ) {
			$source['playbackRate'] = max( 0.5, min( 2, (float) $fallback['playbackRate'] ) );
		}

		if ( isset( $descriptor['playbackRate'] ) && is_numeric( $descriptor['playbackRate'] ) ) {
			$source['playbackRate'] = max( 0.5, min( 2, (float) $descriptor['playbackRate'] ) );
		}

		return $source;
	}

	/**
	 * Normalize a semantic sound event ID.
	 *
	 * @param mixed $event_id Raw event ID.
	 * @return string
	 */
	private function normalize_event_id( $event_id ) {
		return strtolower( preg_replace( '/[^a-zA-Z0-9_.:-]/', '', (string) $event_id ) );
	}
}
