<?php
/**
 * Notification provider registry and state persistence.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Collects WordPress and PufferDesk notification providers.
 */
final class PufferDesk_Notification_Registry {
	const ACTION_REFRESH       = 'pufferdesk_refresh_notifications';
	const ACTION_MARK_READ     = 'pufferdesk_mark_notification_read';
	const ACTION_MARK_ALL_READ = 'pufferdesk_mark_all_notifications_read';
	const ACTION_DISMISS       = 'pufferdesk_dismiss_notification';
	const META_HISTORY         = 'pufferdesk_notification_history';
	const META_STATE           = 'pufferdesk_notification_state';
	const HISTORY_LIMIT        = 300;
	const STATE_LIMIT          = 300;

	/**
	 * User preferences.
	 *
	 * @var PufferDesk_User_Preferences
	 */
	private $preferences;

	/**
	 * Notification normalizer.
	 *
	 * @var PufferDesk_Notification_Normalizer
	 */
	private $normalizer;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_User_Preferences          $preferences User preferences.
	 * @param PufferDesk_Notification_Normalizer   $normalizer  Notification normalizer.
	 */
	public function __construct( PufferDesk_User_Preferences $preferences, PufferDesk_Notification_Normalizer $normalizer ) {
		$this->preferences = $preferences;
		$this->normalizer  = $normalizer;
	}

	/**
	 * Runtime notification config.
	 *
	 * @return array<string,mixed>
	 */
	public function get_client_config() {
		$preferences   = $this->preferences->get_notifications();
		$notifications = $this->get_notifications( $preferences );

		return array(
			'actions'     => array(
				'refresh'     => self::ACTION_REFRESH,
				'markRead'    => self::ACTION_MARK_READ,
				'markAllRead' => self::ACTION_MARK_ALL_READ,
				'dismiss'     => self::ACTION_DISMISS,
			),
			'sourceIds'   => PufferDesk_User_Preferences::notification_source_ids(),
			'items'       => $notifications,
			'labels'      => array(
				'buttonLabel'     => __( 'Notifications', 'pufferdesk-admin-desktop' ),
				'centerTitle'     => __( 'Notification Center', 'pufferdesk-admin-desktop' ),
				'close'           => __( 'Close', 'pufferdesk-admin-desktop' ),
				'dismiss'         => __( 'Dismiss', 'pufferdesk-admin-desktop' ),
				'empty'           => __( 'No notifications', 'pufferdesk-admin-desktop' ),
				'markAllRead'     => __( 'Mark All as Read', 'pufferdesk-admin-desktop' ),
				'markRead'        => __( 'Mark as Read', 'pufferdesk-admin-desktop' ),
				'newNotification' => __( 'New notification', 'pufferdesk-admin-desktop' ),
				'open'            => __( 'Open Notifications', 'pufferdesk-admin-desktop' ),
				'pufferdeskSource' => __( 'PufferDesk', 'pufferdesk-admin-desktop' ),
				'commandFailedMessage' => __( 'The command could not be completed.', 'pufferdesk-admin-desktop' ),
				'commandFailedTitle' => __( 'PufferDesk command failed.', 'pufferdesk-admin-desktop' ),
				'refresh'         => __( 'Refresh', 'pufferdesk-admin-desktop' ),
				'refreshFailedTitle' => __( 'Notifications could not be updated.', 'pufferdesk-admin-desktop' ),
				'runtimeActionFailedTitle' => __( 'A PufferDesk action failed.', 'pufferdesk-admin-desktop' ),
				'runtimeErrorFallback' => __( 'Unexpected runtime error.', 'pufferdesk-admin-desktop' ),
				'serviceUnavailable' => __( 'Notification service unavailable.', 'pufferdesk-admin-desktop' ),
			),
			'preferences' => $preferences,
			'unreadCount' => $this->count_unread( $notifications ),
		);
	}

	/**
	 * Get normalized notifications.
	 *
	 * @param array<string,mixed>|null $preferences Optional normalized preferences.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_notifications( $preferences = null ) {
		$preferences = is_array( $preferences ) ? $preferences : $this->preferences->get_notifications();
		$state       = $this->get_state();

		if ( empty( $preferences['enabled'] ) ) {
			return array();
		}

		$history = $this->sync_history( $this->get_provider_notifications( $state, $preferences ), $preferences, $state );
		$notifications = array();
		foreach ( $history as $notification ) {
			$notification = $this->apply_state_to_notification( $notification, $state );
			if ( ! $this->can_show_notification( $notification, $preferences ) ) {
				continue;
			}

			$notifications[] = $notification;
		}

		return $this->sort_notifications( $notifications );
	}

	/**
	 * Get current provider notifications before user visibility filters.
	 *
	 * @param array<string,mixed> $state       Read/dismissed state.
	 * @param array<string,mixed> $preferences Notification preferences.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_provider_notifications( $state, $preferences ) {
		$raw         = array_merge(
			$this->get_update_notifications(),
			$this->get_comment_notifications(),
			$this->get_site_health_notifications()
		);

		/**
		 * Filter provider-backed PufferDesk notifications.
		 *
		 * Providers should return descriptors that match the normalized schema:
		 * id, source, source_label, type, title, message, timestamp, priority,
		 * capability, actions, persistence, icon, and optional toast.
		 *
		 * @param array<int,array<string,mixed>> $raw         Raw notifications.
		 * @param array<string,mixed>            $preferences Current user notification preferences.
		 */
		$raw = apply_filters( 'pufferdesk_notifications', $raw, $preferences );

		$notifications = array();
		foreach ( is_array( $raw ) ? $raw : array() as $notification ) {
			$normalized = $this->normalizer->normalize( is_array( $notification ) ? $notification : array(), $state );
			if ( empty( $normalized ) || ! $this->can_receive_notification( $normalized ) ) {
				continue;
			}

			$notifications[] = $normalized;
		}

		return $notifications;
	}

	/**
	 * Sort notifications for the client.
	 *
	 * @param array<int,array<string,mixed>> $notifications Notifications.
	 * @return array<int,array<string,mixed>>
	 */
	private function sort_notifications( $notifications ) {
		usort(
			$notifications,
			function ( $a, $b ) {
				$priority_order = array(
					'critical' => 4,
					'high'     => 3,
					'normal'   => 2,
					'low'      => 1,
				);
				$a_priority = isset( $priority_order[ $a['priority'] ] ) ? $priority_order[ $a['priority'] ] : 0;
				$b_priority = isset( $priority_order[ $b['priority'] ] ) ? $priority_order[ $b['priority'] ] : 0;

				if ( $a_priority !== $b_priority ) {
					return $b_priority - $a_priority;
				}

				return (int) $b['timestamp'] - (int) $a['timestamp'];
			}
		);

		return $notifications;
	}

	/**
	 * Merge current providers into persisted per-user history.
	 *
	 * @param array<int,array<string,mixed>> $current     Current provider notifications.
	 * @param array<string,mixed>            $preferences Notification preferences.
	 * @param array<string,mixed>            $state       Read/dismissed state.
	 * @return array<int,array<string,mixed>>
	 */
	private function sync_history( $current, $preferences, $state ) {
		$history = $this->get_history( $state );
		$by_id   = array();

		foreach ( $history as $notification ) {
			if ( empty( $notification['id'] ) ) {
				continue;
			}
			$by_id[ (string) $notification['id'] ] = $notification;
		}

		foreach ( $current as $notification ) {
			if ( ! $this->should_persist_notification( $notification ) || empty( $notification['id'] ) ) {
				continue;
			}

			$id      = (string) $notification['id'];
			$by_id[ $id ] = $this->merge_history_notification(
				isset( $by_id[ $id ] ) ? $by_id[ $id ] : array(),
				$notification
			);
		}

		$history = $this->prune_history( array_values( $by_id ), $preferences );
		$this->set_history( $history );

		return $history;
	}

	/**
	 * Current per-user notification history.
	 *
	 * @param array<string,mixed> $state Read/dismissed state.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_history( $state ) {
		$stored = get_user_meta( get_current_user_id(), self::META_HISTORY, true );
		$stored = is_array( $stored ) ? $stored : array();
		$history = array();

		foreach ( $stored as $notification ) {
			$normalized = $this->normalizer->normalize( is_array( $notification ) ? $notification : array(), $state );
			if ( empty( $normalized ) || ! $this->can_receive_notification( $normalized ) ) {
				continue;
			}

			$history[] = $normalized;
		}

		return $history;
	}

	/**
	 * Persist per-user notification history.
	 *
	 * @param array<int,array<string,mixed>> $history Notification history.
	 */
	private function set_history( $history ) {
		$records = array();

		foreach ( $this->prune_history( $history, $this->preferences->get_notifications() ) as $notification ) {
			$record = $this->prepare_history_record( $notification );
			if ( empty( $record ) ) {
				continue;
			}

			$records[] = $record;
		}

		if ( empty( $records ) ) {
			delete_user_meta( get_current_user_id(), self::META_HISTORY );
			return;
		}

		update_user_meta( get_current_user_id(), self::META_HISTORY, $records );
	}

	/**
	 * Prepare a normalized notification for history storage.
	 *
	 * @param array<string,mixed> $notification Notification.
	 * @return array<string,mixed>
	 */
	private function prepare_history_record( $notification ) {
		$record = $this->normalizer->normalize( is_array( $notification ) ? $notification : array(), array() );
		if ( empty( $record ) ) {
			return array();
		}

		unset( $record['read'], $record['dismissed'] );

		return $record;
	}

	/**
	 * Merge a current notification into an existing history record.
	 *
	 * @param array<string,mixed> $existing Existing history notification.
	 * @param array<string,mixed> $current  Current provider notification.
	 * @return array<string,mixed>
	 */
	private function merge_history_notification( $existing, $current ) {
		$merged = $current;

		if ( ! empty( $existing['timestamp'] ) ) {
			$merged['timestamp'] = (int) $existing['timestamp'];
		}

		$merged['lastSeen'] = time();

		return $merged;
	}

	/**
	 * Prune notification history by retention preference and maximum size.
	 *
	 * @param array<int,array<string,mixed>> $history     Notification history.
	 * @param array<string,mixed>            $preferences Notification preferences.
	 * @return array<int,array<string,mixed>>
	 */
	private function prune_history( $history, $preferences ) {
		$cutoff = time() - ( $this->get_history_days( $preferences ) * DAY_IN_SECONDS );
		$history = array_values(
			array_filter(
				$history,
				function ( $notification ) use ( $cutoff ) {
					return $this->get_last_seen( $notification ) >= $cutoff;
				}
			)
		);

		usort(
			$history,
			function ( $a, $b ) {
				return $this->get_last_seen( $b ) - $this->get_last_seen( $a );
			}
		);

		return array_slice( $history, 0, self::HISTORY_LIMIT );
	}

	/**
	 * Retention days from preferences.
	 *
	 * @param array<string,mixed> $preferences Notification preferences.
	 * @return int
	 */
	private function get_history_days( $preferences ) {
		$days = isset( $preferences['history_days'] ) ? absint( $preferences['history_days'] ) : 30;

		return max( 1, min( 90, $days ) );
	}

	/**
	 * Last-seen timestamp for retention pruning.
	 *
	 * @param array<string,mixed> $notification Notification.
	 * @return int
	 */
	private function get_last_seen( $notification ) {
		if ( isset( $notification['lastSeen'] ) ) {
			return max( 0, (int) $notification['lastSeen'] );
		}

		if ( isset( $notification['last_seen'] ) ) {
			return max( 0, (int) $notification['last_seen'] );
		}

		return isset( $notification['timestamp'] ) ? max( 0, (int) $notification['timestamp'] ) : 0;
	}

	/**
	 * Apply current read/dismiss state to a notification record.
	 *
	 * @param array<string,mixed> $notification Notification.
	 * @param array<string,mixed> $state        Read/dismissed state.
	 * @return array<string,mixed>
	 */
	private function apply_state_to_notification( $notification, $state ) {
		$read_ids      = isset( $state['read'] ) && is_array( $state['read'] ) ? array_map( 'sanitize_key', $state['read'] ) : array();
		$dismissed_ids = isset( $state['dismissed'] ) && is_array( $state['dismissed'] ) ? array_map( 'sanitize_key', $state['dismissed'] ) : array();
		$id            = isset( $notification['id'] ) ? sanitize_key( (string) $notification['id'] ) : '';

		$notification['read']      = '' !== $id && in_array( $id, $read_ids, true );
		$notification['dismissed'] = '' !== $id && in_array( $id, $dismissed_ids, true );

		return $notification;
	}

	/**
	 * Mark one or more notifications read.
	 *
	 * @param array<int,string> $ids Notification IDs.
	 * @return array<string,mixed>
	 */
	public function mark_read( $ids ) {
		$state = $this->get_state();
		$ids   = $this->sanitize_ids( $ids );

		$state['read'] = $this->trim_ids( array_merge( $state['read'], $ids ) );
		$this->set_state( $state );

		return $this->get_client_config();
	}

	/**
	 * Mark all current notifications read.
	 *
	 * @return array<string,mixed>
	 */
	public function mark_all_read() {
		$ids = array();
		foreach ( $this->get_notifications() as $notification ) {
			$ids[] = isset( $notification['id'] ) ? (string) $notification['id'] : '';
		}

		return $this->mark_read( $ids );
	}

	/**
	 * Dismiss one or more notifications.
	 *
	 * @param array<int,string> $ids Notification IDs.
	 * @return array<string,mixed>
	 */
	public function dismiss( $ids ) {
		$state = $this->get_state();
		$ids   = $this->sanitize_ids( $ids );

		$state['dismissed'] = $this->trim_ids( array_merge( $state['dismissed'], $ids ) );
		$state['read']      = $this->trim_ids( array_merge( $state['read'], $ids ) );
		$this->set_state( $state );

		return $this->get_client_config();
	}

	/**
	 * Current user read/dismissed notification state.
	 *
	 * @return array{read:array<int,string>,dismissed:array<int,string>}
	 */
	private function get_state() {
		$state = get_user_meta( get_current_user_id(), self::META_STATE, true );
		$state = is_array( $state ) ? $state : array();

		return array(
			'read'      => $this->sanitize_ids( isset( $state['read'] ) ? $state['read'] : array() ),
			'dismissed' => $this->sanitize_ids( isset( $state['dismissed'] ) ? $state['dismissed'] : array() ),
		);
	}

	/**
	 * Persist current user notification state.
	 *
	 * @param array<string,mixed> $state Notification state.
	 */
	private function set_state( $state ) {
		$state = array(
			'read'      => $this->trim_ids( isset( $state['read'] ) ? $state['read'] : array() ),
			'dismissed' => $this->trim_ids( isset( $state['dismissed'] ) ? $state['dismissed'] : array() ),
		);

		if ( empty( $state['read'] ) && empty( $state['dismissed'] ) ) {
			delete_user_meta( get_current_user_id(), self::META_STATE );
			return;
		}

		update_user_meta( get_current_user_id(), self::META_STATE, $state );
	}

	/**
	 * Whether a normalized notification can be shown.
	 *
	 * @param array<string,mixed> $notification Normalized notification.
	 * @param array<string,mixed> $preferences  Notification preferences.
	 * @return bool
	 */
	private function can_show_notification( $notification, $preferences ) {
		if ( empty( $preferences['enabled'] ) || ! empty( $notification['dismissed'] ) ) {
			return false;
		}

		if ( ! $this->can_receive_notification( $notification ) ) {
			return false;
		}

		$source  = isset( $notification['source'] ) ? sanitize_key( (string) $notification['source'] ) : '';
		$sources = isset( $preferences['sources'] ) && is_array( $preferences['sources'] ) ? $preferences['sources'] : array();
		if ( isset( $sources[ $source ] ) && false === (bool) $sources[ $source ] ) {
			return false;
		}

		$severity = isset( $preferences['severity'] ) ? sanitize_key( (string) $preferences['severity'] ) : 'all';
		if ( 'critical' === $severity ) {
			return 'error' === $notification['type'] || 'critical' === $notification['priority'];
		}

		if ( 'warnings' === $severity ) {
			return in_array( $notification['type'], array( 'warning', 'error' ), true )
				|| in_array( $notification['priority'], array( 'high', 'critical' ), true );
		}

		return true;
	}

	/**
	 * Whether the current user can receive a notification at all.
	 *
	 * @param array<string,mixed> $notification Normalized notification.
	 * @return bool
	 */
	private function can_receive_notification( $notification ) {
		$capability = ! empty( $notification['capability'] ) ? sanitize_key( (string) $notification['capability'] ) : 'read';

		return current_user_can( $capability );
	}

	/**
	 * Whether a notification belongs in retained history.
	 *
	 * @param array<string,mixed> $notification Normalized notification.
	 * @return bool
	 */
	private function should_persist_notification( $notification ) {
		$persistence = ! empty( $notification['persistence'] ) ? sanitize_key( (string) $notification['persistence'] ) : 'user';

		return in_array( $persistence, array( 'user', 'site' ), true );
	}

	/**
	 * WordPress update provider.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_update_notifications() {
		if ( ! current_user_can( 'update_core' ) && ! current_user_can( 'update_plugins' ) && ! current_user_can( 'update_themes' ) ) {
			return array();
		}

		require_once ABSPATH . 'wp-admin/includes/update.php';

		$update_data = wp_get_update_data();
		$counts      = isset( $update_data['counts'] ) && is_array( $update_data['counts'] ) ? $update_data['counts'] : array();
		$total       = isset( $counts['total'] ) ? absint( $counts['total'] ) : 0;
		if ( $total <= 0 ) {
			return array();
		}

		$core    = isset( $counts['wordpress'] ) ? absint( $counts['wordpress'] ) : 0;
		$plugins = isset( $counts['plugins'] ) ? absint( $counts['plugins'] ) : 0;
		$themes  = isset( $counts['themes'] ) ? absint( $counts['themes'] ) : 0;
		$details = array();

		if ( $core > 0 ) {
			$details[] = sprintf(
				/* translators: %d: WordPress core update count. */
				_n( '%d WordPress update', '%d WordPress updates', $core, 'pufferdesk-admin-desktop' ),
				$core
			);
		}
		if ( $plugins > 0 ) {
			$details[] = sprintf(
				/* translators: %d: plugin update count. */
				_n( '%d plugin update', '%d plugin updates', $plugins, 'pufferdesk-admin-desktop' ),
				$plugins
			);
		}
		if ( $themes > 0 ) {
			$details[] = sprintf(
				/* translators: %d: theme update count. */
				_n( '%d theme update', '%d theme updates', $themes, 'pufferdesk-admin-desktop' ),
				$themes
			);
		}

		return array(
			array(
				'id'           => sanitize_key( sprintf( 'wordpress-updates-%d-%d-%d-%d', $total, $core, $plugins, $themes ) ),
				'source'       => PufferDesk_User_Preferences::NOTIFICATION_SOURCE_WORDPRESS_UPDATES,
				'source_label' => __( 'WordPress Updates', 'pufferdesk-admin-desktop' ),
				'type'         => 'warning',
				'title'        => sprintf(
					/* translators: %d: total update count. */
					_n( '%d update is available', '%d updates are available', $total, 'pufferdesk-admin-desktop' ),
					$total
				),
				'message'      => implode( ', ', $details ),
				'timestamp'    => time(),
				'priority'     => $core > 0 ? 'critical' : 'high',
				'capability'   => 'read',
				'icon'         => 'dashicons-update',
				'actions'      => array(
					array(
						'label'   => __( 'Open Updates', 'pufferdesk-admin-desktop' ),
						'command' => PufferDesk_Command_Ids::OPEN_URL,
						'url'     => admin_url( 'update-core.php' ),
						'title'   => __( 'WordPress Updates', 'pufferdesk-admin-desktop' ),
						'icon'    => 'dashicons-update',
					),
				),
			),
		);
	}

	/**
	 * Pending comment moderation provider.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_comment_notifications() {
		if ( ! current_user_can( 'moderate_comments' ) ) {
			return array();
		}

		$counts  = wp_count_comments();
		$pending = isset( $counts->moderated ) ? absint( $counts->moderated ) : 0;
		if ( $pending <= 0 ) {
			return array();
		}

		return array(
			array(
				'id'           => sanitize_key( 'comments-moderation-' . $pending ),
				'source'       => PufferDesk_User_Preferences::NOTIFICATION_SOURCE_COMMENTS,
				'source_label' => __( 'Comments', 'pufferdesk-admin-desktop' ),
				'type'         => 'info',
				'title'        => sprintf(
					/* translators: %d: pending comment count. */
					_n( '%d comment is waiting', '%d comments are waiting', $pending, 'pufferdesk-admin-desktop' ),
					$pending
				),
				'message'      => __( 'Review comments in the moderation queue.', 'pufferdesk-admin-desktop' ),
				'timestamp'    => time(),
				'priority'     => 'normal',
				'capability'   => 'moderate_comments',
				'icon'         => 'dashicons-admin-comments',
				'actions'      => array(
					array(
						'label'   => __( 'Review Comments', 'pufferdesk-admin-desktop' ),
						'command' => PufferDesk_Command_Ids::OPEN_URL,
						'url'     => admin_url( 'edit-comments.php?comment_status=moderated' ),
						'title'   => __( 'Comments', 'pufferdesk-admin-desktop' ),
						'icon'    => 'dashicons-admin-comments',
					),
				),
			),
		);
	}

	/**
	 * Cached Site Health issue provider.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_site_health_notifications() {
		if ( ! current_user_can( 'view_site_health_checks' ) ) {
			return array();
		}

		$raw_counts = get_transient( 'health-check-site-status-result' );
		$counts     = false !== $raw_counts ? json_decode( $raw_counts, true ) : array();
		$counts     = is_array( $counts ) ? $counts : array();
		$critical   = isset( $counts['critical'] ) ? absint( $counts['critical'] ) : 0;
		$recommended = isset( $counts['recommended'] ) ? absint( $counts['recommended'] ) : 0;
		$total      = $critical + $recommended;

		if ( $total <= 0 ) {
			return array();
		}

		$type = $critical > 0 ? 'error' : 'warning';

		return array(
			array(
				'id'           => sanitize_key( sprintf( 'site-health-%d-%d', $critical, $recommended ) ),
				'source'       => PufferDesk_User_Preferences::NOTIFICATION_SOURCE_SITE_HEALTH,
				'source_label' => __( 'Site Health', 'pufferdesk-admin-desktop' ),
				'type'         => $type,
				'title'        => $critical > 0
					? sprintf(
						/* translators: %d: critical issue count. */
						_n( '%d critical Site Health issue', '%d critical Site Health issues', $critical, 'pufferdesk-admin-desktop' ),
						$critical
					)
					: sprintf(
						/* translators: %d: recommended issue count. */
						_n( '%d Site Health recommendation', '%d Site Health recommendations', $recommended, 'pufferdesk-admin-desktop' ),
						$recommended
					),
				'message'      => sprintf(
					/* translators: 1: critical issue count, 2: recommended issue count. */
					__( '%1$d critical, %2$d recommended.', 'pufferdesk-admin-desktop' ),
					$critical,
					$recommended
				),
				'timestamp'    => time(),
				'priority'     => $critical > 0 ? 'critical' : 'high',
				'capability'   => 'view_site_health_checks',
				'icon'         => 'dashicons-heart',
				'actions'      => array(
					array(
						'label'   => __( 'Open Site Health', 'pufferdesk-admin-desktop' ),
						'command' => PufferDesk_Command_Ids::OPEN_URL,
						'url'     => admin_url( 'site-health.php' ),
						'title'   => __( 'Site Health', 'pufferdesk-admin-desktop' ),
						'icon'    => 'dashicons-heart',
					),
				),
			),
		);
	}

	/**
	 * Count unread notifications.
	 *
	 * @param array<int,array<string,mixed>> $notifications Notifications.
	 * @return int
	 */
	private function count_unread( $notifications ) {
		$count = 0;
		foreach ( $notifications as $notification ) {
			if ( empty( $notification['read'] ) && empty( $notification['dismissed'] ) ) {
				$count++;
			}
		}

		return $count;
	}

	/**
	 * Sanitize notification IDs.
	 *
	 * @param mixed $ids Raw IDs.
	 * @return array<int,string>
	 */
	private function sanitize_ids( $ids ) {
		$sanitized = array();
		foreach ( is_array( $ids ) ? $ids : array() as $id ) {
			$id = sanitize_key( (string) $id );
			if ( '' !== $id ) {
				$sanitized[] = $id;
			}
		}

		return array_values( array_unique( $sanitized ) );
	}

	/**
	 * Trim stored IDs.
	 *
	 * @param array<int,string> $ids Notification IDs.
	 * @return array<int,string>
	 */
	private function trim_ids( $ids ) {
		return array_slice( $this->sanitize_ids( $ids ), -1 * self::STATE_LIMIT );
	}
}
