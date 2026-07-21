#pragma once

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <DNSServer.h>
#include <WebServer.h>

#include "../secrets.h"

#define WIFI_ATTEMPT_TIMEOUT_MS 15000
#define PORTAL_RETRY_MS 180000
#define MAX_NETWORKS 5
#define MAX_SCAN 10

#define PORTAL_AP_SSID "DynaVolt-Setup"

Preferences prefs;

bool configLoaded = false;
uint8_t storedCount = 0;
String storedSsid[MAX_NETWORKS];
String storedPass[MAX_NETWORKS];
String appliedConfigAt;

String portalSsid;
String portalPass;

String currentSsid;
String currentPass;

DNSServer dnsServer;
WebServer server(80);
bool portalSaveRequested = false;

String scannedSsids[MAX_SCAN];
int scannedCount = 0;

void loadConfig() {
  prefs.begin("dynavolt", true);
  storedCount = prefs.getUChar("count", 0);
  if (storedCount > MAX_NETWORKS) storedCount = MAX_NETWORKS;
  for (int i = 0; i < MAX_NETWORKS; i++) {
    String sk = "ssid" + String(i + 1);
    String pk = "pass" + String(i + 1);
    storedSsid[i] = prefs.getString(sk.c_str(), "");
    storedPass[i] = prefs.getString(pk.c_str(), "");
  }
  appliedConfigAt = prefs.getString("cfgAt", "");
  portalSsid = prefs.getString("portalSsid", "");
  portalPass = prefs.getString("portalPass", "");
  prefs.end();
  configLoaded = true;
}

void saveNetworkList() {
  prefs.begin("dynavolt", false);
  prefs.putUChar("count", storedCount);
  for (int i = 0; i < MAX_NETWORKS; i++) {
    String sk = "ssid" + String(i + 1);
    String pk = "pass" + String(i + 1);
    prefs.putString(sk.c_str(), storedSsid[i]);
    prefs.putString(pk.c_str(), storedPass[i]);
  }
  prefs.putString("cfgAt", appliedConfigAt);
  prefs.end();
}

void savePortal() {
  prefs.begin("dynavolt", false);
  prefs.putString("portalSsid", portalSsid);
  prefs.putString("portalPass", portalPass);
  prefs.end();
}

bool connectTo(const String &ssid, const String &pass, unsigned long timeoutMs) {
  if (ssid.length() == 0) return false;

  Serial.print("WiFi trying ");
  Serial.println(ssid);

  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  return WiFi.status() == WL_CONNECTED;
}

/// Walks the whole priority chain: stored networks 1..count, then the compiled
/// default, then any portal-captured credentials. First success wins and becomes
/// the current network, which is what lets "priority 1 down but priority 3 up"
/// recover on its own at power-on.
bool runConnectChain() {
  for (int i = 0; i < storedCount; i++) {
    if (connectTo(storedSsid[i], storedPass[i], WIFI_ATTEMPT_TIMEOUT_MS)) {
      currentSsid = storedSsid[i];
      currentPass = storedPass[i];
      Serial.print("Connected to stored network ");
      Serial.print(i + 1);
      Serial.print(" (");
      Serial.print(currentSsid);
      Serial.print("), IP ");
      Serial.println(WiFi.localIP());
      return true;
    }
  }

  if (connectTo(WIFI_SSID, WIFI_PASSWORD, WIFI_ATTEMPT_TIMEOUT_MS)) {
    currentSsid = WIFI_SSID;
    currentPass = WIFI_PASSWORD;
    Serial.print("Connected to default network (");
    Serial.print(currentSsid);
    Serial.print("), IP ");
    Serial.println(WiFi.localIP());
    return true;
  }

  if (portalSsid.length() > 0 &&
      connectTo(portalSsid, portalPass, WIFI_ATTEMPT_TIMEOUT_MS)) {
    currentSsid = portalSsid;
    currentPass = portalPass;
    Serial.print("Connected to portal network (");
    Serial.print(currentSsid);
    Serial.print("), IP ");
    Serial.println(WiFi.localIP());
    return true;
  }

  return false;
}

void sendPortalHead() {
  server.sendContent(F(
    "<!DOCTYPE html><html><head>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>DynaVolt Setup</title>"
    "<style>"
    "*{box-sizing:border-box}"
    "body{margin:0;background:#0a0a0a;color:#fafafa;"
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:16px}"
    ".wrap{max-width:380px;margin:0 auto}"
    ".title{font-size:20px;font-weight:700}"
    ".sub{color:#a1a1aa;font-size:13px;margin-top:2px}"
    ".card{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px;margin-top:16px}"
    "label{display:block;color:#a1a1aa;font-size:13px;margin-bottom:6px}"
    "input{width:100%;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;"
    "padding:10px 12px;color:#fafafa;font-size:16px;margin-bottom:14px}"
    "button{width:100%;background:#22c55e;color:#fff;font-weight:700;border:0;"
    "border-radius:8px;padding:12px;font-size:15px}"
    ".seclabel{color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px}"
    ".netrow{display:block;background:#18181b;border:1px solid #27272a;border-radius:8px;"
    "padding:10px 12px;margin-bottom:6px;color:#fafafa;text-decoration:none}"
    "</style></head><body><div class='wrap'>"
    "<div class='title'>DynaVolt</div><div class='sub'>WiFi setup</div>"));
}

void handleRoot() {
  String prefill = server.hasArg("ssid") ? server.arg("ssid") : String();

  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "text/html", "");
  sendPortalHead();
  server.sendContent(F(
    "<div class='card'>"
    "<form action='/save' method='post'>"
    "<label>Network</label>"
    "<input id='ssid' name='ssid' value='"));
  server.sendContent(prefill);
  server.sendContent(F(
    "'>"
    "<label>Password</label>"
    "<input name='pass' type='password'>"
    "<button type='submit'>Save</button>"
    "</form></div>"
    "<div class='seclabel'>Nearby networks</div>"));

  for (int i = 0; i < scannedCount; i++) {
    String item = "<a class='netrow' href='#' onclick=\"document.getElementById('ssid').value='";
    item += scannedSsids[i];
    item += "';return false;\">";
    item += scannedSsids[i];
    item += "</a>";
    server.sendContent(item);
  }

  server.sendContent(F("</div></body></html>"));
  server.sendContent("");
}

void handleSave() {
  portalSsid = server.arg("ssid");
  portalPass = server.arg("pass");
  savePortal();

  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "text/html", "");
  sendPortalHead();
  server.sendContent(F(
    "<div class='card'>"
    "<p style='margin:0;color:#fafafa'>Saved. The board will now try to connect.</p>"
    "</div></div></body></html>"));
  server.sendContent("");

  portalSaveRequested = true;
}

void handleNotFound() {
  server.sendHeader("Location", "http://192.168.4.1/", true);
  server.send(302, "text/plain", "");
}

void stopPortal() {
  server.stop();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
}

/// Last-resort setup portal. This is a blocking loop by design: when no known
/// network is reachable there is nothing else for the board to do, so it owns the
/// main loop until either the operator submits credentials or a background retry
/// (allowed by AP_STA) brings the chain back up.
void startPortal() {
  Serial.println("Starting captive portal " PORTAL_AP_SSID);

  WiFi.mode(WIFI_AP_STA);
  IPAddress apIP(192, 168, 4, 1);
  IPAddress netMask(255, 255, 255, 0);
  WiFi.softAPConfig(apIP, apIP, netMask);
  WiFi.softAP(PORTAL_AP_SSID);
  delay(200);

  scannedCount = WiFi.scanNetworks();
  if (scannedCount > MAX_SCAN) scannedCount = MAX_SCAN;
  for (int i = 0; i < scannedCount; i++) {
    scannedSsids[i] = WiFi.SSID(i);
  }
  WiFi.scanDelete();

  dnsServer.start(53, "*", WiFi.softAPIP());
  server.on("/", handleRoot);
  server.on("/save", handleSave);
  server.onNotFound(handleNotFound);
  server.begin();

  portalSaveRequested = false;
  unsigned long lastRetry = millis();

  for (;;) {
    dnsServer.processNextRequest();
    server.handleClient();

    bool tryNow = portalSaveRequested || (millis() - lastRetry >= PORTAL_RETRY_MS);
    if (tryNow) {
      portalSaveRequested = false;
      lastRetry = millis();
      if (runConnectChain()) {
        stopPortal();
        return;
      }
    }

    delay(10);
  }
}

void netConnect() {
  if (WiFi.status() == WL_CONNECTED) return;

  if (!configLoaded) loadConfig();

  WiFi.mode(WIFI_STA);
  if (runConnectChain()) return;

  Serial.println("All known networks failed, starting captive portal.");
  startPortal();
}

String jsonField(const String &body, const char *key) {
  String needle = String("\"") + key + "\":\"";
  int start = body.indexOf(needle);
  if (start < 0) return String();
  start += needle.length();
  int end = body.indexOf('"', start);
  if (end < 0) return String();
  return body.substring(start, end);
}

/// Registers the compiled default network with the backend exactly once per boot.
/// The guard only latches on a 204/200 so a failed POST is retried on the next
/// sync cycle rather than silently dropped.
void registerDefaultNetwork() {
  static bool registered = false;
  if (registered) return;
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, String(BACKEND_URL) + "/api/v1/device/networks/register-default");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  String body = String("{\"ssid\":\"") + WIFI_SSID +
                "\",\"password\":\"" + WIFI_PASSWORD + "\"}";
  int code = http.POST(body);
  http.end();

  Serial.print("POST /register-default -> ");
  Serial.println(code);
  if (code == 204 || code == 200) registered = true;
}

/// Pulls the priority-ordered network list from the backend and adopts it. The
/// list is persisted (with its timestamp) unconditionally so a dead priority-1 is
/// not re-tried every minute; re-selecting in the app bumps updatedAt and triggers
/// a fresh attempt. If the new priority-1 differs from the working network we try
/// it with try-then-revert semantics, falling back to the network already up.
void syncWifiConfig() {
  if (WiFi.status() != WL_CONNECTED) return;

  registerDefaultNetwork();

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, String(BACKEND_URL) + "/api/v1/device/config");
  http.addHeader("x-device-key", DEVICE_KEY);

  int code = http.GET();
  if (code != 200) {
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  String cfgAt = jsonField(body, "updatedAt");
  if (cfgAt.length() == 0 || cfgAt == appliedConfigAt) return;

  int count = jsonField(body, "count").toInt();
  if (count < 0) count = 0;
  if (count > MAX_NETWORKS) count = MAX_NETWORKS;

  for (int i = 0; i < MAX_NETWORKS; i++) {
    if (i < count) {
      String sk = "ssid" + String(i + 1);
      String pk = "pass" + String(i + 1);
      storedSsid[i] = jsonField(body, sk.c_str());
      storedPass[i] = jsonField(body, pk.c_str());
    } else {
      storedSsid[i] = "";
      storedPass[i] = "";
    }
  }
  storedCount = (uint8_t)count;
  appliedConfigAt = cfgAt;
  saveNetworkList();

  if (storedCount == 0) {
    Serial.println("Config cleared, keeping current network.");
    return;
  }

  String topSsid = storedSsid[0];
  String topPass = storedPass[0];
  if (topSsid.length() == 0 || topSsid == currentSsid) return;

  Serial.print("New priority network: ");
  Serial.println(topSsid);

  String prevSsid = currentSsid;
  String prevPass = currentPass;

  if (connectTo(topSsid, topPass, WIFI_ATTEMPT_TIMEOUT_MS)) {
    Serial.println("Priority network connected, keeping it.");
    currentSsid = topSsid;
    currentPass = topPass;
  } else {
    Serial.println("Priority network failed, reverting to the previous network.");
    connectTo(prevSsid, prevPass, WIFI_ATTEMPT_TIMEOUT_MS);
    currentSsid = prevSsid;
    currentPass = prevPass;
  }
}

void appendField(String &body, bool &first, const char *key, float value, int digits) {
  if (isnan(value)) return;
  if (!first) body += ",";
  body += "\"";
  body += key;
  body += "\":";
  body += String(value, digits);
  first = false;
}

bool postReading(float voltage, float current, float temperature,
                 float power, float pf, float frequency, float energy, float humidity) {
  netConnect();
  if (WiFi.status() != WL_CONNECTED) return false;

  String body = "{";
  bool first = true;
  appendField(body, first, "voltageV", voltage, 1);
  appendField(body, first, "currentA", current, 3);
  appendField(body, first, "temperatureC", temperature, 2);
  appendField(body, first, "powerW", power, 1);
  appendField(body, first, "powerFactor", pf, 2);
  appendField(body, first, "frequencyHz", frequency, 1);
  appendField(body, first, "energyKwh", energy, 3);
  appendField(body, first, "humidityPct", humidity, 1);
  body += "}";

  if (first) {
    Serial.println("no readings to send, skipping post.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, String(BACKEND_URL) + "/api/v1/readings");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  int code = http.POST(body);
  Serial.print("POST /readings -> ");
  Serial.println(code);
  if (code > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println(http.errorToString(code));
  }
  http.end();

  return code >= 200 && code < 300;
}
