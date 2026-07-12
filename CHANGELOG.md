# Changelog

All notable changes to Lumend will be documented in this file.

## v0.2.0

### Features
- HTTP Digest authentication support for TVHeadend servers
- Credentials embedded in stream URLs for reliable video playback
- Stream retry logic with 8-second timeout fallback and "No signal" overlay
- EPG: Left/Right navigates between events, OK directly switches channel
- Channel info overlay with auto-hide and opacity-only animation
- Settings persistence without deleting localStorage on reconfiguration

### Fixes
- Fixed 401 error when entering valid username/password
- Fixed video element unable to send HTTP auth headers
- Fixed URL field preventing Enter key from inserting newlines on webOS
- Fixed settings dialog not rendering on error/no-channels screens
- Fixed Input component cursor position with Left/Right navigation

### Improvements
- Compact channel list with hidden scrollbar and accent bar
- Scroll offset in EPG for better channel visibility
- GitHub Actions upgraded to Node 24
- IPK renamed to Lumend-<version>.ipk
- CHANGELOG-based release notes

## v0.1.0

### Features
- Initial release of Lumend
- Settings screen with connection test and server info
- Channel list with current programme info
- Full-screen EPG grid with time axis and current-time indicator
- HTML5 video player with channel-info overlay
- Remote-first navigation: D-pad, OK, Back, Channel +/-, Page Up/Down
- webOS app packaging and simulator support
