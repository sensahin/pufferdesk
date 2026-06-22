<?php
/**
 * Smoke test for renderer-scoped shell templates.
 *
 * @package PufferDesk
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

const PUFFERDESK_DIR = __DIR__ . '/../../';
const PUFFERDESK_VERSION = '0.1.3';

/**
 * Minimal translation stub for isolated template rendering.
 *
 * @param string $text Text to translate.
 * @return string
 */
function __( $text ) {
	return $text;
}

/**
 * Minimal attribute escaping stub.
 *
 * @param mixed $value Value to escape.
 * @return string
 */
function esc_attr( $value ) {
	return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

/**
 * Minimal HTML escaping stub.
 *
 * @param mixed $value Value to escape.
 * @return string
 */
function esc_html( $value ) {
	return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

/**
 * Minimal wp_parse_args() stub.
 *
 * @param mixed $args Arguments.
 * @param array $defaults Defaults.
 * @return array
 */
function wp_parse_args( $args, $defaults = array() ) {
	return array_merge( $defaults, is_array( $args ) ? $args : array() );
}

/**
 * Minimal inline script tag stub.
 *
 * @param string $script Inline script body.
 * @return void
 */
function wp_print_inline_script_tag( $script ) {
	echo '<script>' . esc_html( $script ) . '</script>';
}

/**
 * Minimal sanitize_key() stub.
 *
 * @param mixed $key Key to sanitize.
 * @return string
 */
function sanitize_key( $key ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
}

/**
 * Minimal sanitize_file_name() stub.
 *
 * @param mixed $name File name.
 * @return string
 */
function sanitize_file_name( $name ) {
	return preg_replace( '/[^A-Za-z0-9._\-]/', '', (string) $name );
}

/**
 * Minimal get_bloginfo() stub.
 *
 * @return string
 */
function get_bloginfo() {
	return 'PufferDesk Smoke';
}

/**
 * Minimal current_time() stub.
 *
 * @return int
 */
function current_time() {
	return time(); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested
}

/**
 * Minimal wp_date() stub.
 *
 * @param string   $format Date format.
 * @param int|null $timestamp Timestamp.
 * @return string
 */
function wp_date( $format, $timestamp = null ) {
	return gmdate( $format, $timestamp ? $timestamp : time() );
}

/**
 * Minimal date_i18n() stub.
 *
 * @param string    $format Date format.
 * @param int|false $timestamp Timestamp.
 * @return string
 */
function date_i18n( $format, $timestamp = false ) {
	return gmdate( $format, $timestamp ? $timestamp : time() );
}

/**
 * Minimal get_option() stub.
 *
 * @return string
 */
function get_option() {
	return 'H:i';
}

require PUFFERDESK_DIR . 'includes/class-pufferdesk-product-labels.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-path-normalizer.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-app-menu-normalizer.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-window-chrome-contracts.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-context-menu-contracts.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-notification-registry.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-runtime-config.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-theme-token-renderer.php';
require PUFFERDESK_DIR . 'includes/class-pufferdesk-shell-renderer.php';

/**
 * Enable private reflection access only on PHP versions that still require it.
 *
 * @param ReflectionProperty|ReflectionMethod $reflection Reflection target.
 * @return void
 */
function pufferdesk_smoke_enable_reflection_access( $reflection ) {
	if ( PHP_VERSION_ID < 80100 ) {
		$reflection->setAccessible( true );
	}
}

/**
 * Fail the smoke test.
 *
 * @param string $message Failure message.
 * @return void
 */
function pufferdesk_smoke_fail( $message ) {
	throw new RuntimeException( esc_html( $message ) );
}

$reflection = new ReflectionClass( 'PufferDesk_Shell_Renderer' );
$renderer   = $reflection->newInstanceWithoutConstructor();
$theme      = array(
	'id'            => 'default',
	'family'        => 'default',
	'version'       => 'default',
	'shell'         => array(),
	'window_chrome' => array(),
);

$current_theme = $reflection->getProperty( 'current_theme' );
pufferdesk_smoke_enable_reflection_access( $current_theme );
$current_theme->setValue( $renderer, $theme );

$render_template = $reflection->getMethod( 'render_template' );
pufferdesk_smoke_enable_reflection_access( $render_template );

ob_start();
$render_template->invoke(
	$renderer,
	'shell/shell.php',
	array(
		'appearance'           => array(),
		'apps'                 => array(),
		'desktop_apps'         => array(),
		'desktop_dock'         => array(),
		'desktop_icon_folders' => array(),
		'dock_apps'            => array(),
		'folders'              => array(),
		'menu_bar'             => array(),
		'site_name'            => 'PufferDesk Smoke',
		'theme'                => $theme,
		'wallpaper'            => array( 'preference' => array() ),
		'widgets'              => array(),
		'workspace_state'      => array(),
	)
);
$html = ob_get_clean();

if ( false === strpos( $html, 'data-pufferdesk-shell' ) ) {
	pufferdesk_smoke_fail( 'Shell marker missing.' );
}

if ( false === strpos( $html, 'pdk-desktop' ) ) {
	pufferdesk_smoke_fail( 'Desktop marker missing.' );
}

echo "Shell renderer template smoke passed.\n";
