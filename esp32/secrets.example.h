#pragma once

// Copy this file to secrets.h and fill in your values.
// secrets.h is gitignored so real credentials never reach the public repo.

#define WIFI_SSID "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

#define BACKEND_URL "https://dynavolt-api.vercel.app"

// Must match the DEVICE_API_KEY set on the backend once the ingest auth is deployed.
// The currently deployed backend ignores this header, so any value works for now.
#define DEVICE_KEY "set-this-to-match-the-backend-key"
