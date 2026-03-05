package com.blog.service.notion;

import com.blog.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.ProxySelector;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
public class NotionHttpClient {

    private static final String NOTION_BASE_URL = "https://api.notion.com";

    @Value("${notion.connect-timeout-ms:5000}")
    private int notionConnectTimeoutMs;

    @Value("${notion.read-timeout-ms:45000}")
    private int notionReadTimeoutMs;

    @Value("${notion.max-retries:3}")
    private int notionMaxRetries;

    @Value("${notion.network-mode:AUTO}")
    private String notionNetworkMode;

    @Value("${notion.proxy.host:}")
    private String notionProxyHost;

    @Value("${notion.proxy.port:0}")
    private int notionProxyPort;

    public <T> ResponseEntity<T> exchange(
            String operationName,
            String url,
            HttpMethod method,
            HttpEntity<?> entity,
            Class<T> responseType
    ) {
        List<NetworkRoute> routes = resolveRoutes();
        int maxAttempts = Math.max(1, notionMaxRetries + 1);
        BusinessException lastNetworkException = null;

        for (int routeIndex = 0; routeIndex < routes.size(); routeIndex++) {
            NetworkRoute route = routes.get(routeIndex);
            boolean hasNextRoute = routeIndex < routes.size() - 1;
            RestTemplate restTemplate = createRestTemplate(route.proxy);
            log.debug("{} using notion network route: {}", operationName, route.name);

            for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return restTemplate.exchange(url, method, entity, responseType);
                } catch (HttpStatusCodeException ex) {
                    HttpStatus status = ex.getStatusCode();
                    if (attempt < maxAttempts && isRetryableStatus(status)) {
                        long backoffMs = calculateBackoffMs(attempt);
                        log.warn("{} transient HTTP status {} (attempt {}/{}), retry in {}ms",
                                operationName, status.value(), attempt, maxAttempts, backoffMs);
                        sleepQuietly(backoffMs);
                        continue;
                    }
                    throw ex;
                } catch (ResourceAccessException ex) {
                    if (hasNextRoute) {
                        String message = buildNetworkFailureMessage(ex);
                        log.warn("{} route {} failed on attempt {}, fallback to next route. reason={}",
                                operationName, route.name, attempt, message);
                        lastNetworkException = new BusinessException(message, HttpStatus.BAD_GATEWAY);
                        break;
                    }

                    if (attempt < maxAttempts && isRetryableNetworkError(ex)) {
                        long backoffMs = calculateBackoffMs(attempt);
                        log.warn("{} transient network error on route {} (attempt {}/{}), retry in {}ms: {}",
                                operationName, route.name, attempt, maxAttempts, backoffMs, ex.getMessage());
                        sleepQuietly(backoffMs);
                        continue;
                    }
                    throw new BusinessException(buildNetworkFailureMessage(ex), HttpStatus.BAD_GATEWAY);
                } catch (BusinessException ex) {
                    throw ex;
                } catch (Exception ex) {
                    log.error("{} failed unexpectedly: {} {}", operationName, method, url, ex);
                    throw new BusinessException("Notion request failed, please retry later", HttpStatus.BAD_GATEWAY);
                }
            }
        }

        if (lastNetworkException != null) {
            throw lastNetworkException;
        }
        throw new BusinessException("Notion request failed, please retry later", HttpStatus.BAD_GATEWAY);
    }

    RestTemplate createRestTemplate(Proxy proxy) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1000, notionConnectTimeoutMs));
        requestFactory.setReadTimeout(Math.max(1000, notionReadTimeoutMs));

        if (proxy == Proxy.NO_PROXY) {
            requestFactory.setProxy(Proxy.NO_PROXY);
        } else if (proxy != null) {
            requestFactory.setProxy(proxy);
        }

        return new RestTemplate(requestFactory);
    }

    List<NetworkRoute> resolveRoutes() {
        String mode = notionNetworkMode == null ? "AUTO" : notionNetworkMode.trim().toUpperCase(Locale.ROOT);
        switch (mode) {
            case "DIRECT":
                return List.of(NetworkRoute.direct());
            case "CUSTOM":
                if (StringUtils.hasText(notionProxyHost) && notionProxyPort > 0) {
                    Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(notionProxyHost.trim(), notionProxyPort));
                    return List.of(NetworkRoute.withProxy("custom-proxy:" + notionProxyHost.trim() + ":" + notionProxyPort, proxy));
                }
                log.warn("NOTION_NETWORK_MODE=CUSTOM but notion.proxy.host/port is invalid, fallback to AUTO");
                return resolveAutoRoutes(System.getenv(), resolveProxyFromSystem());
            case "AUTO":
            default:
                return resolveAutoRoutes(System.getenv(), resolveProxyFromSystem());
        }
    }

    Optional<Proxy> resolveAutoProxy() {
        List<NetworkRoute> routes = resolveAutoRoutes(System.getenv(), resolveProxyFromSystem());
        for (NetworkRoute route : routes) {
            if (route.proxy != null && route.proxy != Proxy.NO_PROXY && route.proxy.type() != Proxy.Type.DIRECT) {
                return Optional.of(route.proxy);
            }
        }
        return Optional.empty();
    }

    List<NetworkRoute> resolveAutoRoutes(Map<String, String> env, Optional<Proxy> systemProxy) {
        List<NetworkRoute> routes = new ArrayList<>();

        Optional<ProxyEndpoint> envProxy = resolveProxyFromEnv(env);
        if (envProxy.isPresent()) {
            ProxyEndpoint endpoint = envProxy.get();
            routes.add(NetworkRoute.withProxy("env-proxy:" + endpoint.host + ":" + endpoint.port, endpoint.toProxy()));
        }

        if (systemProxy.isPresent() && !containsEquivalentProxy(routes, systemProxy.get())) {
            routes.add(NetworkRoute.withProxy("system-proxy", systemProxy.get()));
        }

        routes.add(NetworkRoute.direct());
        return routes;
    }

    private boolean containsEquivalentProxy(List<NetworkRoute> routes, Proxy proxy) {
        String expected = proxySignature(proxy);
        for (NetworkRoute route : routes) {
            if (expected.equals(proxySignature(route.proxy))) {
                return true;
            }
        }
        return false;
    }

    private String proxySignature(Proxy proxy) {
        if (proxy == null || proxy == Proxy.NO_PROXY || proxy.type() == Proxy.Type.DIRECT) {
            return "DIRECT";
        }
        if (proxy.address() instanceof InetSocketAddress) {
            InetSocketAddress address = (InetSocketAddress) proxy.address();
            return proxy.type().name() + ":" + address.getHostString() + ":" + address.getPort();
        }
        return proxy.type().name() + ":" + String.valueOf(proxy.address());
    }

    Optional<ProxyEndpoint> resolveProxyFromEnv(Map<String, String> env) {
        if (env == null || env.isEmpty()) {
            return Optional.empty();
        }

        return readEnv(env, "HTTPS_PROXY")
                .or(() -> readEnv(env, "https_proxy"))
                .or(() -> readEnv(env, "HTTP_PROXY"))
                .or(() -> readEnv(env, "http_proxy"))
                .flatMap(NotionHttpClient::parseProxyEndpoint);
    }

    private Optional<String> readEnv(Map<String, String> env, String key) {
        String value = env.get(key);
        if (!StringUtils.hasText(value)) {
            return Optional.empty();
        }
        return Optional.of(value.trim());
    }

    Optional<Proxy> resolveProxyFromSystem() {
        try {
            ProxySelector selector = ProxySelector.getDefault();
            if (selector == null) {
                return Optional.empty();
            }

            List<Proxy> proxies = selector.select(URI.create(NOTION_BASE_URL));
            if (proxies == null || proxies.isEmpty()) {
                return Optional.empty();
            }

            for (Proxy proxy : proxies) {
                if (proxy == null || proxy == Proxy.NO_PROXY || proxy.type() == Proxy.Type.DIRECT) {
                    continue;
                }
                if (proxy.address() instanceof InetSocketAddress) {
                    return Optional.of(proxy);
                }
            }
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to resolve system proxy for Notion AUTO mode: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    static Optional<ProxyEndpoint> parseProxyEndpoint(String raw) {
        if (!StringUtils.hasText(raw)) {
            return Optional.empty();
        }

        String candidate = raw.trim();
        if (candidate.contains("://")) {
            try {
                URI uri = URI.create(candidate);
                String host = uri.getHost();
                int port = uri.getPort();
                if (StringUtils.hasText(host) && port > 0 && port <= 65535) {
                    return Optional.of(new ProxyEndpoint(host, port));
                }
            } catch (Exception ignored) {
                // Fallback to host:port parsing below.
            }
        }

        int index = candidate.lastIndexOf(':');
        if (index <= 0 || index == candidate.length() - 1) {
            return Optional.empty();
        }

        String hostPart = candidate.substring(0, index).trim();
        String portPart = candidate.substring(index + 1).trim();

        if (hostPart.contains("@")) {
            hostPart = hostPart.substring(hostPart.lastIndexOf('@') + 1);
        }

        if (hostPart.startsWith("//")) {
            hostPart = hostPart.substring(2);
        }

        if (hostPart.startsWith("[") && hostPart.endsWith("]")) {
            hostPart = hostPart.substring(1, hostPart.length() - 1);
        }

        try {
            int port = Integer.parseInt(portPart);
            if (!StringUtils.hasText(hostPart) || port <= 0 || port > 65535) {
                return Optional.empty();
            }
            return Optional.of(new ProxyEndpoint(hostPart, port));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    private boolean isRetryableStatus(HttpStatus status) {
        return status == HttpStatus.TOO_MANY_REQUESTS || status.is5xxServerError();
    }

    private boolean isRetryableNetworkError(ResourceAccessException ex) {
        String message = ex.getMessage();
        if (message == null) {
            return true;
        }
        String normalized = message.toLowerCase(Locale.ROOT);
        return normalized.contains("connection reset")
                || normalized.contains("timed out")
                || normalized.contains("timeout")
                || normalized.contains("connection aborted")
                || normalized.contains("broken pipe")
                || normalized.contains("connection refused")
                || normalized.contains("unable to tunnel")
                || normalized.contains("unexpected end of stream")
                || normalized.contains("remote host terminated")
                || normalized.contains("sslhandshakeexception");
    }

    private String buildNetworkFailureMessage(ResourceAccessException ex) {
        String detail = null;
        Throwable root = ex.getMostSpecificCause();
        if (root != null && root.getMessage() != null) {
            detail = root.getMessage().trim();
        }
        if (!StringUtils.hasText(detail) && ex.getMessage() != null) {
            detail = ex.getMessage().trim();
        }
        String normalized = detail == null ? "" : detail.toLowerCase(Locale.ROOT);

        if (normalized.contains("pkix") || normalized.contains("certificate")
                || normalized.contains("ssl") || normalized.contains("handshake")) {
            return "Notion API TLS handshake failed, please check proxy certificate or HTTPS interception";
        }
        if (normalized.contains("timed out") || normalized.contains("timeout")) {
            return "Notion API request timed out, please check network or proxy";
        }
        if (normalized.contains("unknownhost") || normalized.contains("name or service not known")) {
            return "Cannot resolve Notion domain, please check DNS or proxy config";
        }
        if (normalized.contains("connection refused") || normalized.contains("unable to tunnel")) {
            return "Cannot connect to Notion API, please check proxy availability";
        }

        if (StringUtils.hasText(detail)) {
            String compact = detail.replaceAll("\\s+", " ");
            if (compact.length() > 160) {
                compact = compact.substring(0, 160);
            }
            return "Notion API request failed: " + compact;
        }
        return "Notion API request failed, please check network/proxy/TLS settings";
    }

    private long calculateBackoffMs(int attempt) {
        long base = 300L;
        long delay = base * (1L << Math.max(0, attempt - 1));
        return Math.min(delay, 2000L);
    }

    private void sleepQuietly(long milliseconds) {
        try {
            Thread.sleep(milliseconds);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
        }
    }

    static class ProxyEndpoint {
        private final String host;
        private final int port;

        ProxyEndpoint(String host, int port) {
            this.host = host;
            this.port = port;
        }

        Proxy toProxy() {
            return new Proxy(Proxy.Type.HTTP, new InetSocketAddress(host, port));
        }
    }

    static class NetworkRoute {
        final String name;
        final Proxy proxy;

        private NetworkRoute(String name, Proxy proxy) {
            this.name = name;
            this.proxy = proxy;
        }

        static NetworkRoute withProxy(String name, Proxy proxy) {
            return new NetworkRoute(name, proxy);
        }

        static NetworkRoute direct() {
            return new NetworkRoute("direct", Proxy.NO_PROXY);
        }
    }
}
