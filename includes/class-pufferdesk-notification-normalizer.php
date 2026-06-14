<?php
/**
 * Notification descriptor normalization.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts provider/runtime notification descriptors into one client schema.
 */
final class PufferDesk_Notification_Normalizer {
	/**
	 * Supported notification tones.
	 *
	 * @var array<int,string>
	 */
	private $types = array( 'info', 'success', 'warning', 'error' );

	/**
	 * Supported priority labels.
	 *
	 * @var array<int,string>
	 */
	private $priorities = array( 'low', 'normal', 'high', 'critical' );

	/**
	 * Supported persistence scopes.
	 *
	 * @var array<int,string>
	 */
	private $persistence = array( 'ephemeral', 'session', 'user', 'site' );

	/**
	 * Normalize a notification.
	 *
	 * @param array<string,mixed> $notification Raw notification descriptor.
	 * @param array<string,mixed> $state        Read/dismissed state.
	 * @return array<string,mixed>
	 */
	public function normalize( $notification, $state = array() ) {
		$notification = is_array( $notification ) ? $notification : array();
		$source       = ! empty( $notification['source'] ) ? sanitize_key( (string) $notification['source'] ) : PufferDesk_User_Preferences::NOTIFICATION_SOURCE_PUFFERDESK;
		$title        = ! empty( $notification['title'] ) ? sanitize_text_field( (string) $notification['title'] ) : '';
		$message      = ! empty( $notification['message'] ) ? sanitize_textarea_field( (string) $notification['message'] ) : '';
		$id           = ! empty( $notification['id'] ) ? sanitize_key( (string) $notification['id'] ) : '';

		if ( '' === $id ) {
			$id = $this->generate_id( $source, $title, $message );
		}

		if ( '' === $title && '' === $message ) {
			return array();
		}

		$type = ! empty( $notification['type'] ) ? sanitize_key( (string) $notification['type'] ) : 'info';
		if ( ! in_array( $type, $this->types, true ) ) {
			$type = 'info';
		}

		$priority = ! empty( $notification['priority'] ) ? sanitize_key( (string) $notification['priority'] ) : $this->get_default_priority( $type );
		if ( ! in_array( $priority, $this->priorities, true ) ) {
			$priority = $this->get_default_priority( $type );
		}

		$persistence = ! empty( $notification['persistence'] ) ? sanitize_key( (string) $notification['persistence'] ) : 'user';
		if ( ! in_array( $persistence, $this->persistence, true ) ) {
			$persistence = 'user';
		}

		$timestamp = isset( $notification['timestamp'] ) ? $this->normalize_timestamp( $notification['timestamp'] ) : time();
		$last_seen = $timestamp;
		if ( isset( $notification['last_seen'] ) ) {
			$last_seen = $this->normalize_timestamp( $notification['last_seen'] );
		} elseif ( isset( $notification['lastSeen'] ) ) {
			$last_seen = $this->normalize_timestamp( $notification['lastSeen'] );
		}
		$read_ids  = isset( $state['read'] ) && is_array( $state['read'] ) ? array_map( 'sanitize_key', $state['read'] ) : array();
		$dismissed_ids = isset( $state['dismissed'] ) && is_array( $state['dismissed'] ) ? array_map( 'sanitize_key', $state['dismissed'] ) : array();
		$source_label  = '';
		if ( ! empty( $notification['source_label'] ) ) {
			$source_label = sanitize_text_field( (string) $notification['source_label'] );
		} elseif ( ! empty( $notification['sourceLabel'] ) ) {
			$source_label = sanitize_text_field( (string) $notification['sourceLabel'] );
		}

		return array(
			'id'          => $id,
			'source'      => $source,
			'sourceLabel' => '' !== $source_label ? $source_label : $this->get_source_label( $source ),
			'type'        => $type,
			'title'       => $title,
			'message'     => $message,
			'timestamp'   => $timestamp,
			'lastSeen'    => $last_seen,
			'read'        => in_array( $id, $read_ids, true ) || ! empty( $notification['read'] ),
			'dismissed'   => in_array( $id, $dismissed_ids, true ) || ! empty( $notification['dismissed'] ),
			'priority'    => $priority,
			'capability'  => ! empty( $notification['capability'] ) ? sanitize_key( (string) $notification['capability'] ) : 'read',
			'actions'     => $this->normalize_actions( isset( $notification['actions'] ) ? $notification['actions'] : array() ),
			'persistence' => $persistence,
			'icon'        => ! empty( $notification['icon'] ) ? sanitize_text_field( (string) $notification['icon'] ) : $this->get_default_icon( $type ),
			'toast'       => isset( $notification['toast'] ) ? (bool) $notification['toast'] : false,
		);
	}

	/**
	 * Generate a stable ID when providers omit one.
	 *
	 * @param string $source  Source ID.
	 * @param string $title   Title.
	 * @param string $message Message.
	 * @return string
	 */
	private function generate_id( $source, $title, $message ) {
		return sanitize_key( $source . '-' . substr( md5( $title . '|' . $message ), 0, 12 ) );
	}

	/**
	 * Normalize a timestamp to Unix seconds.
	 *
	 * @param mixed $timestamp Raw timestamp.
	 * @return int
	 */
	private function normalize_timestamp( $timestamp ) {
		if ( is_numeric( $timestamp ) ) {
			return max( 0, (int) $timestamp );
		}

		$parsed = strtotime( (string) $timestamp );

		return false === $parsed ? time() : (int) $parsed;
	}

	/**
	 * Default priority by notification type.
	 *
	 * @param string $type Notification type.
	 * @return string
	 */
	private function get_default_priority( $type ) {
		if ( 'error' === $type ) {
			return 'critical';
		}

		if ( 'warning' === $type ) {
			return 'high';
		}

		return 'normal';
	}

	/**
	 * Default icon by notification type.
	 *
	 * @param string $type Notification type.
	 * @return string
	 */
	private function get_default_icon( $type ) {
		if ( 'error' === $type ) {
			return 'dashicons-warning';
		}

		if ( 'warning' === $type ) {
			return 'dashicons-flag';
		}

		if ( 'success' === $type ) {
			return 'dashicons-yes-alt';
		}

		return 'dashicons-bell';
	}

	/**
	 * Human-readable source label.
	 *
	 * @param string $source Source ID.
	 * @return string
	 */
	private function get_source_label( $source ) {
		switch ( $source ) {
			case PufferDesk_User_Preferences::NOTIFICATION_SOURCE_WORDPRESS_UPDATES:
				return __( 'WordPress Updates', 'pufferdesk' );
			case PufferDesk_User_Preferences::NOTIFICATION_SOURCE_COMMENTS:
				return __( 'Comments', 'pufferdesk' );
			case PufferDesk_User_Preferences::NOTIFICATION_SOURCE_SITE_HEALTH:
				return __( 'Site Health', 'pufferdesk' );
			case PufferDesk_User_Preferences::NOTIFICATION_SOURCE_APPS:
				return __( 'Apps', 'pufferdesk' );
			case PufferDesk_User_Preferences::NOTIFICATION_SOURCE_PUFFERDESK:
			default:
				return PufferDesk_Product_Labels::name();
		}
	}

	/**
	 * Normalize notification actions.
	 *
	 * @param mixed $actions Raw action list.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_actions( $actions ) {
		$normalized = array();

		foreach ( is_array( $actions ) ? $actions : array() as $action ) {
			if ( ! is_array( $action ) || empty( $action['label'] ) ) {
				continue;
			}

			$item = array(
				'label'       => sanitize_text_field( (string) $action['label'] ),
				'command'     => ! empty( $action['command'] ) ? sanitize_key( (string) $action['command'] ) : '',
				'url'         => ! empty( $action['url'] ) ? esc_url_raw( (string) $action['url'] ) : '',
				'target'      => ! empty( $action['target'] ) ? sanitize_text_field( (string) $action['target'] ) : '',
				'title'       => ! empty( $action['title'] ) ? sanitize_text_field( (string) $action['title'] ) : '',
				'icon'        => ! empty( $action['icon'] ) ? sanitize_text_field( (string) $action['icon'] ) : '',
				'destructive' => ! empty( $action['destructive'] ),
				'payload'     => isset( $action['payload'] ) && is_array( $action['payload'] ) ? $this->sanitize_payload( $action['payload'] ) : array(),
			);

			if ( '' === $item['command'] && '' === $item['url'] && '' === $item['target'] ) {
				continue;
			}

			$normalized[] = $item;
		}

		return $normalized;
	}

	/**
	 * Sanitize scalar action payload data.
	 *
	 * @param array<mixed> $payload Raw payload.
	 * @return array<mixed>
	 */
	private function sanitize_payload( $payload ) {
		$sanitized = array();

		foreach ( $payload as $key => $value ) {
			$payload_key = is_string( $key ) ? sanitize_key( $key ) : absint( $key );
			if ( is_array( $value ) ) {
				$sanitized[ $payload_key ] = $this->sanitize_payload( $value );
				continue;
			}

			if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
				$sanitized[ $payload_key ] = $value;
				continue;
			}

			$sanitized[ $payload_key ] = sanitize_text_field( (string) $value );
		}

		return $sanitized;
	}
}
