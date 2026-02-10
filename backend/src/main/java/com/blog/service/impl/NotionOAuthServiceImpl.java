package com.blog.service.impl;

import com.blog.dto.article.NotionConnectionStatusResponse;
import com.blog.dto.article.NotionOAuthExchangeResponse;
import com.blog.dto.article.NotionOAuthUrlResponse;
import com.blog.entity.NotionConnection;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.NotionConnectionRepository;
import com.blog.repository.UserRepository;
import com.blog.service.NotionOAuthService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotionOAuthServiceImpl implements NotionOAuthService {

    private static final String NOTION_OAUTH_AUTHORIZE = "https://api.notion.com/v1/oauth/authorize";
    private static final String NOTION_OAUTH_TOKEN = "https://api.notion.com/v1/oauth/token";
    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final String DEFAULT_FRONTEND_URL = "http://localhost:5173";
    private static final String CALLBACK_PATH = "/admin/notion/callback";

    private final UserRepository userRepository;
    private final NotionConnectionRepository notionConnectionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${notion.oauth.client-id:}")
    private String clientId;

    @Value("${notion.oauth.client-secret:}")
    private String clientSecret;

    @Value("${notion.oauth.redirect-uri:}")
    private String redirectUri;

    @Value("${app.frontend-url:" + DEFAULT_FRONTEND_URL + "}")
    private String frontendUrl;

    @Value("${notion.oauth.success-redirect:/admin/upload}")
    private String successRedirect;

    @Value("${notion.token:}")
    private String notionToken;

    @Value("${notion.publicImportEnabled:false}")
    private boolean publicImportEnabled;

    @Override
    public NotionOAuthUrlResponse buildAuthorizeUrl(String ownerType) {
        ensureOAuthConfigured();

        String owner = normalizeOwner(ownerType);
        String resolvedRedirectUri = resolveRedirectUri();
        String state = createState();

        String url = NOTION_OAUTH_AUTHORIZE
                + "?client_id=" + encode(clientId)
                + "&response_type=code"
                + "&owner=" + encode(owner)
                + "&redirect_uri=" + encode(resolvedRedirectUri)
                + "&state=" + encode(state);

        return new NotionOAuthUrlResponse(url, state);
    }

    @Override
    public NotionOAuthExchangeResponse exchangeCode(String code, String state, String username) {
        ensureOAuthConfigured();
        validateState(state);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found"));

        String resolvedRedirectUri = resolveRedirectUri();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(clientId, clientSecret, StandardCharsets.UTF_8);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            Map<String, Object> payload = Map.of(
                    "grant_type", "authorization_code",
                    "code", code,
                    "redirect_uri", resolvedRedirectUri
            );

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    NOTION_OAUTH_TOKEN,
                    new HttpEntity<>(payload, headers),
                    Map.class
            );

            Map body = response.getBody();
            if (body == null || body.get("access_token") == null) {
                throw new BusinessException("Empty Notion OAuth response");
            }

            String accessToken = String.valueOf(body.get("access_token"));
            String workspaceId = body.get("workspace_id") != null ? String.valueOf(body.get("workspace_id")) : null;
            String workspaceName = body.get("workspace_name") != null ? String.valueOf(body.get("workspace_name")) : null;
            String botId = body.get("bot_id") != null ? String.valueOf(body.get("bot_id")) : null;
            String owner = null;
            Object ownerObj = body.get("owner");
            if (ownerObj instanceof Map) {
                Object type = ((Map) ownerObj).get("type");
                if (type != null) {
                    owner = String.valueOf(type);
                }
            }

            NotionConnection connection = notionConnectionRepository.findByUserId(user.getId())
                    .orElseGet(NotionConnection::new);
            connection.setUserId(user.getId());
            connection.setAccessToken(accessToken);
            connection.setWorkspaceId(workspaceId);
            connection.setWorkspaceName(workspaceName);
            connection.setBotId(botId);
            connection.setOwnerType(owner);

            notionConnectionRepository.save(connection);
            return new NotionOAuthExchangeResponse(successRedirect);
        } catch (HttpClientErrorException ex) {
            String detail = parseNotionErrorMessage(ex);
            log.error("Notion OAuth error {}: {}", ex.getStatusCode(), detail);
            throw new BusinessException("Notion OAuth authorization failed: " + detail);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Notion OAuth exchange failed", ex);
            throw new BusinessException("Notion OAuth authorization failed, please retry later");
        }
    }

    @Override
    public NotionConnectionStatusResponse getConnectionStatus(String username) {
        boolean oauthConfigured = isOAuthConfigured();
        String oauthRedirect = oauthConfigured ? resolveRedirectUri() : null;

        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) {
            return new NotionConnectionStatusResponse(
                    false,
                    null,
                    null,
                    oauthConfigured,
                    oauthRedirect,
                    isIntegrationEnabled(),
                    publicImportEnabled
            );
        }

        Optional<NotionConnection> connection = notionConnectionRepository.findByUserId(user.get().getId());
        if (connection.isPresent()) {
            NotionConnection c = connection.get();
            return new NotionConnectionStatusResponse(
                    true,
                    c.getWorkspaceName(),
                    c.getOwnerType(),
                    oauthConfigured,
                    oauthRedirect,
                    isIntegrationEnabled(),
                    publicImportEnabled
            );
        }

        return new NotionConnectionStatusResponse(
                false,
                null,
                null,
                oauthConfigured,
                oauthRedirect,
                isIntegrationEnabled(),
                publicImportEnabled
        );
    }

    @Override
    public void disconnect(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found"));
        notionConnectionRepository.deleteByUserId(user.getId());
    }

    private void ensureOAuthConfigured() {
        if (isOAuthConfigured()) {
            return;
        }

        StringBuilder missing = new StringBuilder();
        if (!StringUtils.hasText(clientId)) {
            missing.append("NOTION_OAUTH_CLIENT_ID");
        }
        if (!StringUtils.hasText(clientSecret)) {
            if (missing.length() > 0) {
                missing.append(", ");
            }
            missing.append("NOTION_OAUTH_CLIENT_SECRET");
        }

        throw new BusinessException("Notion OAuth is not configured, missing: " + missing);
    }

    private boolean isOAuthConfigured() {
        return StringUtils.hasText(clientId) && StringUtils.hasText(clientSecret);
    }

    private boolean isIntegrationEnabled() {
        return StringUtils.hasText(notionToken);
    }

    private String normalizeOwner(String ownerType) {
        if (!StringUtils.hasText(ownerType)) {
            return "user";
        }

        String owner = ownerType.trim().toLowerCase();
        if (!owner.equals("user") && !owner.equals("workspace")) {
            return "user";
        }
        return owner;
    }

    private String resolveRedirectUri() {
        if (StringUtils.hasText(redirectUri)) {
            return redirectUri.trim();
        }

        String base = StringUtils.hasText(frontendUrl) ? frontendUrl.trim() : DEFAULT_FRONTEND_URL;
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + CALLBACK_PATH;
    }

    private String createState() {
        long issuedAt = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString().replace("-", "");
        String payload = issuedAt + ":" + nonce;
        String signature = signState(payload);
        String token = payload + ":" + signature;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(token.getBytes(StandardCharsets.UTF_8));
    }

    private void validateState(String state) {
        if (!StringUtils.hasText(state)) {
            throw new BusinessException("State must not be empty");
        }

        try {
            byte[] decoded = Base64.getUrlDecoder().decode(state);
            String token = new String(decoded, StandardCharsets.UTF_8);
            String[] parts = token.split(":", 3);
            if (parts.length != 3) {
                throw new BusinessException("Invalid state");
            }

            long issuedAt = Long.parseLong(parts[0]);
            String payload = parts[0] + ":" + parts[1];
            String expected = signState(payload);
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException("State verification failed");
            }

            long now = Instant.now().getEpochSecond();
            if (now - issuedAt > STATE_TTL.getSeconds()) {
                throw new BusinessException("State has expired, please retry authorization");
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("Invalid state");
        }
    }

    private String signState(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (Exception ex) {
            throw new BusinessException("Failed to sign OAuth state");
        }
    }

    private String parseNotionErrorMessage(HttpClientErrorException ex) {
        String body = ex.getResponseBodyAsString();
        if (StringUtils.hasText(body)) {
            try {
                JsonNode node = objectMapper.readTree(body);
                String message = node.path("message").asText();
                if (StringUtils.hasText(message)) {
                    return message;
                }
            } catch (Exception ignore) {
                // fall through to status code
            }
        }
        return ex.getStatusCode().toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
