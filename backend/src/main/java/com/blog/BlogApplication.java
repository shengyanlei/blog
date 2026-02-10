package com.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Locale;
import java.util.Optional;
import java.util.prefs.Preferences;

@SpringBootApplication
@EnableJpaAuditing
public class BlogApplication {

    public static void main(String[] args) {
        // Respect OS proxy settings for outbound HTTPS calls (e.g., Notion API).
        if (System.getProperty("java.net.useSystemProxies") == null) {
            System.setProperty("java.net.useSystemProxies", "true");
        }
        applyWindowsProxyIfNeeded();
        SpringApplication.run(BlogApplication.class, args);
    }

    private static void applyWindowsProxyIfNeeded() {
        if (hasExplicitProxy() || !isWindows()) {
            return;
        }

        try {
            Preferences prefs = Preferences.userRoot()
                    .node("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings");
            if (prefs.getInt("ProxyEnable", 0) != 1) {
                return;
            }

            String rawProxy = prefs.get("ProxyServer", "").trim();
            ProxyEndpoint endpoint = parseProxyEndpoint(rawProxy).orElse(null);
            if (endpoint == null) {
                return;
            }

            System.setProperty("https.proxyHost", endpoint.host);
            System.setProperty("https.proxyPort", String.valueOf(endpoint.port));

            if (System.getProperty("http.proxyHost") == null) {
                System.setProperty("http.proxyHost", endpoint.host);
            }
            if (System.getProperty("http.proxyPort") == null) {
                System.setProperty("http.proxyPort", String.valueOf(endpoint.port));
            }
        } catch (Exception ignored) {
            // Keep startup resilient if registry access is blocked.
        }
    }

    private static boolean hasExplicitProxy() {
        return System.getProperty("https.proxyHost") != null || System.getProperty("http.proxyHost") != null;
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "")
                .toLowerCase(Locale.ROOT)
                .contains("win");
    }

    private static Optional<ProxyEndpoint> parseProxyEndpoint(String rawProxy) {
        if (rawProxy == null || rawProxy.isBlank()) {
            return Optional.empty();
        }

        String candidate = rawProxy;
        if (rawProxy.contains("=")) {
            String[] pairs = rawProxy.split(";");
            String fallback = null;
            for (String pair : pairs) {
                String trimmed = pair.trim();
                if (trimmed.isEmpty()) {
                    continue;
                }
                int idx = trimmed.indexOf('=');
                if (idx <= 0 || idx == trimmed.length() - 1) {
                    continue;
                }
                String key = trimmed.substring(0, idx).trim().toLowerCase(Locale.ROOT);
                String value = trimmed.substring(idx + 1).trim();
                if (fallback == null) {
                    fallback = value;
                }
                if ("https".equals(key) || "http".equals(key)) {
                    candidate = value;
                    break;
                }
            }
            if (candidate.equals(rawProxy) && fallback != null) {
                candidate = fallback;
            }
        }

        int idx = candidate.lastIndexOf(':');
        if (idx <= 0 || idx == candidate.length() - 1) {
            return Optional.empty();
        }

        String host = candidate.substring(0, idx).trim();
        String portText = candidate.substring(idx + 1).trim();
        if (host.isEmpty()) {
            return Optional.empty();
        }

        try {
            int port = Integer.parseInt(portText);
            if (port <= 0 || port > 65535) {
                return Optional.empty();
            }
            return Optional.of(new ProxyEndpoint(host, port));
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    private static class ProxyEndpoint {
        private final String host;
        private final int port;

        private ProxyEndpoint(String host, int port) {
            this.host = host;
            this.port = port;
        }
    }
}
