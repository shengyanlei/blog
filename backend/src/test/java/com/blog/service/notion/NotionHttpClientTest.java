package com.blog.service.notion;

import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class NotionHttpClientTest {

    private final NotionHttpClient client = new NotionHttpClient();

    @Test
    void parseProxyEndpoint_shouldParseHttpUrl() {
        Optional<NotionHttpClient.ProxyEndpoint> endpoint = NotionHttpClient.parseProxyEndpoint("http://127.0.0.1:7890");
        assertTrue(endpoint.isPresent());

        Proxy proxy = endpoint.get().toProxy();
        assertTrue(proxy.address() instanceof InetSocketAddress);
        InetSocketAddress socket = (InetSocketAddress) proxy.address();
        assertEquals("127.0.0.1", socket.getHostString());
        assertEquals(7890, socket.getPort());
    }

    @Test
    void parseProxyEndpoint_shouldParseHostPortWithCredentials() {
        Optional<NotionHttpClient.ProxyEndpoint> endpoint = NotionHttpClient.parseProxyEndpoint("user:pwd@10.0.0.8:8080");
        assertTrue(endpoint.isPresent());

        Proxy proxy = endpoint.get().toProxy();
        InetSocketAddress socket = (InetSocketAddress) proxy.address();
        assertEquals("10.0.0.8", socket.getHostString());
        assertEquals(8080, socket.getPort());
    }

    @Test
    void parseProxyEndpoint_shouldRejectInvalidValue() {
        assertTrue(NotionHttpClient.parseProxyEndpoint("not-a-proxy").isEmpty());
        assertTrue(NotionHttpClient.parseProxyEndpoint("").isEmpty());
        assertTrue(NotionHttpClient.parseProxyEndpoint(null).isEmpty());
    }

    @Test
    void resolveProxyFromEnv_shouldPreferHttpsProxy() {
        Map<String, String> env = Map.of(
                "HTTP_PROXY", "http://10.0.0.1:8080",
                "HTTPS_PROXY", "http://10.0.0.2:8443"
        );

        Optional<NotionHttpClient.ProxyEndpoint> endpoint = client.resolveProxyFromEnv(env);
        assertTrue(endpoint.isPresent());

        InetSocketAddress socket = (InetSocketAddress) endpoint.get().toProxy().address();
        assertEquals("10.0.0.2", socket.getHostString());
        assertEquals(8443, socket.getPort());
    }

    @Test
    void resolveProxyFromEnv_shouldSupportLowercaseKeys() {
        Map<String, String> env = Map.of("https_proxy", "http://127.0.0.1:7897");
        Optional<NotionHttpClient.ProxyEndpoint> endpoint = client.resolveProxyFromEnv(env);

        assertTrue(endpoint.isPresent());
        InetSocketAddress socket = (InetSocketAddress) endpoint.get().toProxy().address();
        assertEquals("127.0.0.1", socket.getHostString());
        assertEquals(7897, socket.getPort());
    }

    @Test
    void resolveAutoRoutes_shouldFollowEnvThenSystemThenDirect() {
        Map<String, String> env = Map.of("HTTPS_PROXY", "http://10.0.0.2:8443");
        Proxy systemProxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress("10.0.0.3", 3128));

        List<NotionHttpClient.NetworkRoute> routes = client.resolveAutoRoutes(env, Optional.of(systemProxy));
        assertEquals(3, routes.size());
        assertEquals("env-proxy:10.0.0.2:8443", routes.get(0).name);
        assertEquals("system-proxy", routes.get(1).name);
        assertSame(Proxy.NO_PROXY, routes.get(2).proxy);
    }

    @Test
    void resolveAutoRoutes_shouldNotDuplicateSameProxy() {
        Map<String, String> env = Map.of("HTTPS_PROXY", "http://10.0.0.2:8443");
        Proxy systemProxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress("10.0.0.2", 8443));

        List<NotionHttpClient.NetworkRoute> routes = client.resolveAutoRoutes(env, Optional.of(systemProxy));
        assertEquals(2, routes.size());
        assertEquals("env-proxy:10.0.0.2:8443", routes.get(0).name);
        assertSame(Proxy.NO_PROXY, routes.get(1).proxy);
    }
}
