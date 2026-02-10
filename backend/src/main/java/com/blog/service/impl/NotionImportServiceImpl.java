package com.blog.service.impl;

import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.NotionImportPreviewResponse;
import com.blog.dto.article.NotionImportRequest;
import com.blog.entity.NotionConnection;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.NotionConnectionRepository;
import com.blog.repository.UserRepository;
import com.blog.service.ArticleService;
import com.blog.service.NotionImportService;
import com.blog.service.notion.NotionAuthMode;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Notion 导入实现。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotionImportServiceImpl implements NotionImportService {

    private static final String NOTION_API_BASE = "https://api.notion.com/v1";
    private static final String NOTION_PUBLIC_API = "https://www.notion.so/api/v3/getPublicPageData";
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "([0-9a-fA-F]{32})|([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})");

    private final ArticleService articleService;
    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final NotionConnectionRepository notionConnectionRepository;

    @Value("${notion.token:}")
    private String notionToken;

    @Value("${notion.version:2025-09-03}")
    private String notionVersion;

    @Value("${notion.publicImportEnabled:false}")
    private boolean publicImportEnabled;

    @Override
    public NotionImportPreviewResponse preview(NotionImportRequest request, String username) {
        try {
            ImportContext context = resolveContext(request, username);
            PageIds pageIds = extractPageIds(request.getShareUrl());

            if (context.mode == NotionAuthMode.PUBLIC) {
                JsonNode recordMap = fetchPublicRecordMap(pageIds.raw);
                String title = extractPublicTitle(recordMap, pageIds);
                String content = renderPublicBlocks(recordMap, pageIds);
                String summary = generateSummary(content);
                return new NotionImportPreviewResponse(title, summary, content);
            }

            JsonNode page = fetchPage(pageIds.uuid, context.token);
            String title = extractTitleFromPage(page);
            List<JsonNode> blocks = fetchBlocks(pageIds.uuid, context.token);
            String content = renderBlocks(blocks, 0, context.token).trim();
            String summary = generateSummary(content);
            return new NotionImportPreviewResponse(title, summary, content);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Throwable ex) {
            log.error("Notion preview failed unexpectedly", ex);
            throw new BusinessException("Notion 预览失败: " + ex.getClass().getSimpleName());
        }
    }

    @Override
    public Long importFromShareUrl(NotionImportRequest request, String username) {
        NotionImportPreviewResponse preview = preview(request, username);

        String title = trimToNull(request.getTitleOverride());
        String summary = trimToNull(request.getSummaryOverride());

        if (title == null) {
            title = preview.getTitle();
        }
        if (summary == null) {
            summary = preview.getSummary();
        }

        String slug = ensureUniqueSlug(slugify(title));

        ArticleCreateRequest createRequest = new ArticleCreateRequest();
        createRequest.setTitle(title);
        createRequest.setSlug(slug);
        createRequest.setContent(preview.getContent());
        createRequest.setSummary(summary);
        createRequest.setCategoryId(request.getCategoryId());
        createRequest.setTagIds(request.getTagIds());

        Long articleId = articleService.createArticle(createRequest, username);

        if (Boolean.TRUE.equals(request.getPublish())) {
            articleService.publishArticle(articleId, true);
        }

        return articleId;
    }

    private ImportContext resolveContext(NotionImportRequest request, String username) {
        NotionAuthMode mode = NotionAuthMode.from(request.getAuthMode());
        String tokenOverride = trimToNull(request.getTokenOverride());

        if (mode == NotionAuthMode.PUBLIC) {
            ensurePublicEnabled();
            return new ImportContext(NotionAuthMode.PUBLIC, null);
        }

        if (mode == NotionAuthMode.OAUTH) {
            NotionConnection connection = requireOAuthConnection(username);
            return new ImportContext(NotionAuthMode.OAUTH, connection.getAccessToken());
        }

        if (mode == NotionAuthMode.INTEGRATION) {
            String token = resolveIntegrationToken(tokenOverride);
            return new ImportContext(NotionAuthMode.INTEGRATION, token);
        }

        // AUTO
        Optional<NotionConnection> connection = findOAuthConnection(username);
        if (connection.isPresent()) {
            return new ImportContext(NotionAuthMode.OAUTH, connection.get().getAccessToken());
        }
        if (StringUtils.hasText(tokenOverride)) {
            return new ImportContext(NotionAuthMode.INTEGRATION, tokenOverride);
        }
        if (StringUtils.hasText(notionToken)) {
            return new ImportContext(NotionAuthMode.INTEGRATION, notionToken);
        }
        if (publicImportEnabled) {
            return new ImportContext(NotionAuthMode.PUBLIC, null);
        }
        throw new BusinessException("未配置 Notion Token，且未连接 OAuth，公开导入未启用");
    }

    private Optional<NotionConnection> findOAuthConnection(String username) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) {
            return Optional.empty();
        }
        return notionConnectionRepository.findByUserId(user.get().getId());
    }

    private NotionConnection requireOAuthConnection(String username) {
        Optional<NotionConnection> connection = findOAuthConnection(username);
        return connection.orElseThrow(() -> new BusinessException("未连接 Notion OAuth，请先授权"));
    }

    private String resolveIntegrationToken(String tokenOverride) {
        if (StringUtils.hasText(tokenOverride)) {
            return tokenOverride.trim();
        }
        if (StringUtils.hasText(notionToken)) {
            return notionToken.trim();
        }
        throw new BusinessException("Notion Token 未配置，请设置 NOTION_TOKEN 或在请求中传入 tokenOverride");
    }

    private void ensurePublicEnabled() {
        if (!publicImportEnabled) {
            throw new BusinessException("公开页面导入未启用，请在服务端开启 NOTION_PUBLIC_IMPORT_ENABLED");
        }
    }

    private JsonNode fetchPage(String pageId, String token) {
        ResponseEntity<JsonNode> response = exchangeNotion(
                NOTION_API_BASE + "/pages/" + pageId, HttpMethod.GET, null, token);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new BusinessException("Notion 页面获取失败");
        }
        return response.getBody();
    }

    private List<JsonNode> fetchBlocks(String blockId, String token) {
        List<JsonNode> blocks = new ArrayList<>();
        String cursor = null;

        do {
            String url = NOTION_API_BASE + "/blocks/" + blockId + "/children?page_size=100";
            if (cursor != null) {
                url += "&start_cursor=" + URLEncoder.encode(cursor, StandardCharsets.UTF_8);
            }

            ResponseEntity<JsonNode> response = exchangeNotion(url, HttpMethod.GET, null, token);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                break;
            }

            JsonNode body = response.getBody();
            JsonNode results = body.path("results");
            if (results.isArray()) {
                results.forEach(blocks::add);
            }

            boolean hasMore = body.path("has_more").asBoolean(false);
            cursor = hasMore ? body.path("next_cursor").asText(null) : null;
        } while (cursor != null);

        return blocks;
    }

    private ResponseEntity<JsonNode> exchangeNotion(String url, HttpMethod method, Object body, String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessException("Notion Token 未配置");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.add("Notion-Version", notionVersion);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Object> entity = new HttpEntity<>(body, headers);
            RestTemplate restTemplate = new RestTemplate();
            return restTemplate.exchange(url, method, entity, JsonNode.class);
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new BusinessException("Notion Token 无效或未配置，请检查 NOTION_TOKEN 或 OAuth 授权");
        } catch (HttpClientErrorException.Forbidden e) {
            throw new BusinessException("没有权限访问该页面，请确认已分享给 Integration 或 OAuth 授权");
        } catch (HttpClientErrorException.NotFound e) {
            throw new BusinessException("Notion 页面未找到，请确认链接正确且已分享给 Integration");
        } catch (HttpClientErrorException e) {
            String msg = e.getResponseBodyAsString();
            log.error("Notion API error ({}): {}", e.getStatusCode(), msg);
            throw new BusinessException("Notion API 调用失败：" + e.getStatusCode());
        } catch (Exception e) {
            log.error("Notion API request failed", e);
            throw new BusinessException("Notion API 请求失败，请检查网络、代理或 TLS 配置");
        }
    }

    private JsonNode fetchPublicRecordMap(String rawPageId) {
        if (rawPageId == null || rawPageId.isBlank()) {
            throw new BusinessException("未识别到 Notion 页面 ID");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> payload = Map.of(
                    "pageId", rawPageId,
                    "chunkLimit", 100,
                    "verticalColumns", false
            );
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    NOTION_PUBLIC_API,
                    new HttpEntity<>(payload, headers),
                    JsonNode.class
            );
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new BusinessException("公开页面获取失败");
            }
            JsonNode recordMap = response.getBody().path("recordMap");
            if (recordMap.isMissingNode() || recordMap.isNull()) {
                throw new BusinessException("公开页面解析失败");
            }
            return recordMap;
        } catch (HttpClientErrorException e) {
            throw new BusinessException("公开页面导入失败：" + e.getStatusCode());
        }
    }

    private String extractTitleFromPage(JsonNode page) {
        JsonNode properties = page.path("properties");
        if (properties.isMissingNode()) {
            return "未命名";
        }

        Iterator<Map.Entry<String, JsonNode>> fields = properties.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            JsonNode prop = entry.getValue();
            if ("title".equals(prop.path("type").asText())) {
                String title = renderRichText(prop.path("title"));
                if (!title.isBlank()) {
                    return title;
                }
            }
        }
        return "未命名";
    }

    private String renderBlocks(List<JsonNode> blocks, int indentLevel, String token) {
        StringBuilder builder = new StringBuilder();
        for (JsonNode block : blocks) {
            String type = block.path("type").asText("");
            boolean hasChildren = block.path("has_children").asBoolean(false);
            String blockId = block.path("id").asText("");

            switch (type) {
                case "paragraph":
                    appendParagraph(builder, block, indentLevel);
                    break;
                case "heading_1":
                    appendHeading(builder, block, indentLevel, "#");
                    break;
                case "heading_2":
                    appendHeading(builder, block, indentLevel, "##");
                    break;
                case "heading_3":
                    appendHeading(builder, block, indentLevel, "###");
                    break;
                case "bulleted_list_item":
                    appendListItem(builder, block, indentLevel, "-");
                    break;
                case "numbered_list_item":
                    appendListItem(builder, block, indentLevel, "1.");
                    break;
                case "to_do":
                    appendTodo(builder, block, indentLevel);
                    break;
                case "quote":
                    appendQuote(builder, block, indentLevel);
                    break;
                case "code":
                    appendCode(builder, block, indentLevel);
                    break;
                case "divider":
                    builder.append("\n---\n\n");
                    break;
                case "image":
                    appendImage(builder, block, indentLevel);
                    break;
                case "callout":
                    appendCallout(builder, block, indentLevel);
                    break;
                default:
                    appendFallback(builder, block, indentLevel, type);
                    break;
            }

            if (hasChildren && !blockId.isBlank()) {
                List<JsonNode> children = fetchBlocks(blockId, token);
                String childContent = renderBlocks(children, isListType(type) ? indentLevel + 1 : indentLevel, token);
                if (!childContent.isBlank()) {
                    builder.append(childContent);
                    if (!childContent.endsWith("\n")) {
                        builder.append("\n");
                    }
                }
            }
        }
        return builder.toString();
    }

    private String renderPublicBlocks(JsonNode recordMap, PageIds pageIds) {
        JsonNode blockMap = recordMap.path("block");
        if (blockMap.isMissingNode()) {
            throw new BusinessException("公开页面结构缺失");
        }
        JsonNode root = blockMap.path(pageIds.raw).path("value");
        if (root.isMissingNode()) {
            root = blockMap.path(pageIds.uuid).path("value");
        }
        if (root.isMissingNode()) {
            throw new BusinessException("公开页面未找到主块");
        }

        StringBuilder builder = new StringBuilder();
        JsonNode content = root.path("content");
        if (content.isArray()) {
            for (JsonNode childIdNode : content) {
                String childId = childIdNode.asText();
                appendPublicBlock(builder, blockMap, childId, 0);
            }
        }
        return builder.toString().trim();
    }

    private String extractPublicTitle(JsonNode recordMap, PageIds pageIds) {
        JsonNode blockMap = recordMap.path("block");
        JsonNode root = blockMap.path(pageIds.raw).path("value");
        if (root.isMissingNode()) {
            root = blockMap.path(pageIds.uuid).path("value");
        }
        if (root.isMissingNode()) {
            return "未命名";
        }
        String title = renderPublicRichText(root.path("properties").path("title"));
        return title.isBlank() ? "未命名" : title;
    }

    private void appendPublicBlock(StringBuilder builder, JsonNode blockMap, String blockId, int indentLevel) {
        JsonNode block = blockMap.path(blockId).path("value");
        if (block.isMissingNode()) {
            return;
        }
        String type = block.path("type").asText("");
        JsonNode properties = block.path("properties");
        String text = renderPublicRichText(properties.path("title"));

        switch (type) {
            case "text":
                if (!text.isBlank()) {
                    builder.append(indent(indentLevel)).append(text).append("\n\n");
                }
                break;
            case "header":
                appendPublicHeading(builder, text, "#", indentLevel);
                break;
            case "sub_header":
                appendPublicHeading(builder, text, "##", indentLevel);
                break;
            case "sub_sub_header":
                appendPublicHeading(builder, text, "###", indentLevel);
                break;
            case "bulleted_list":
                appendPublicList(builder, blockMap, block, "-", indentLevel, text);
                return;
            case "numbered_list":
                appendPublicList(builder, blockMap, block, "1.", indentLevel, text);
                return;
            case "to_do":
                String checked = properties.path("checked").isArray() ? properties.path("checked").get(0).get(0).asText("") : "";
                boolean done = "Yes".equalsIgnoreCase(checked);
                builder.append(indent(indentLevel))
                        .append("- [").append(done ? "x" : " ").append("] ")
                        .append(text).append("\n");
                break;
            case "quote":
                if (!text.isBlank()) {
                    String prefix = indent(indentLevel) + "> ";
                    builder.append(prefix).append(text.replace("\n", "\n" + prefix)).append("\n\n");
                }
                break;
            case "code":
                String language = renderPublicRichText(properties.path("language"));
                builder.append(indent(indentLevel)).append("```").append(language).append("\n")
                        .append(text).append("\n")
                        .append(indent(indentLevel)).append("```").append("\n\n");
                break;
            case "divider":
                builder.append("\n---\n\n");
                break;
            case "image":
                String url = extractPublicImageUrl(block);
                if (!url.isBlank()) {
                    builder.append(indent(indentLevel)).append("![](").append(url).append(")\n\n");
                }
                break;
            case "callout":
                if (!text.isBlank()) {
                    builder.append(indent(indentLevel)).append("> ").append(text).append("\n\n");
                }
                break;
            default:
                if (!text.isBlank()) {
                    builder.append(indent(indentLevel)).append(text).append("\n\n");
                }
                break;
        }

        JsonNode children = block.path("content");
        if (children.isArray()) {
            for (JsonNode childIdNode : children) {
                appendPublicBlock(builder, blockMap, childIdNode.asText(), indentLevel + 1);
            }
        }
    }

    private void appendPublicHeading(StringBuilder builder, String text, String prefix, int indentLevel) {
        if (!text.isBlank()) {
            builder.append(indent(indentLevel)).append(prefix).append(' ').append(text).append("\n\n");
        }
    }

    private void appendPublicList(StringBuilder builder, JsonNode blockMap, JsonNode block, String marker, int indentLevel, String text) {
        if (!text.isBlank()) {
            builder.append(indent(indentLevel)).append(marker).append(' ').append(text).append("\n");
        }
        JsonNode children = block.path("content");
        if (children.isArray()) {
            for (JsonNode childIdNode : children) {
                appendPublicBlock(builder, blockMap, childIdNode.asText(), indentLevel + 1);
            }
        }
    }

    private String extractPublicImageUrl(JsonNode block) {
        JsonNode format = block.path("format");
        if (format.hasNonNull("display_source")) {
            return format.path("display_source").asText("");
        }
        JsonNode properties = block.path("properties");
        if (properties.has("source") && properties.path("source").isArray()) {
            JsonNode node = properties.path("source").get(0);
            if (node != null && node.isArray() && node.size() > 0) {
                return node.get(0).asText("");
            }
        }
        return "";
    }

    private String renderPublicRichText(JsonNode node) {
        if (node == null || !node.isArray()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (JsonNode part : node) {
            if (!part.isArray() || part.size() == 0) {
                continue;
            }
            String text = part.get(0).asText("");
            String formatted = text;

            if (part.size() > 1 && part.get(1).isArray()) {
                for (JsonNode deco : part.get(1)) {
                    if (!deco.isArray() || deco.size() == 0) {
                        continue;
                    }
                    String type = deco.get(0).asText("");
                    switch (type) {
                        case "b":
                            formatted = "**" + formatted + "**";
                            break;
                        case "i":
                            formatted = "*" + formatted + "*";
                            break;
                        case "s":
                            formatted = "~~" + formatted + "~~";
                            break;
                        case "u":
                            formatted = "<u>" + formatted + "</u>";
                            break;
                        case "c":
                            formatted = "`" + formatted.replace("`", "\\`") + "`";
                            break;
                        case "a":
                            if (deco.size() > 1) {
                                String href = deco.get(1).asText("");
                                formatted = "[" + formatted + "](" + href + ")";
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
            builder.append(formatted);
        }
        return builder.toString();
    }

    private void appendParagraph(StringBuilder builder, JsonNode block, int indentLevel) {
        String text = renderRichText(block.path("paragraph").path("rich_text"));
        if (!text.isBlank()) {
            builder.append(indent(indentLevel)).append(text).append("\n\n");
        } else {
            builder.append("\n");
        }
    }

    private void appendHeading(StringBuilder builder, JsonNode block, int indentLevel, String prefix) {
        String text = renderRichText(block.path(block.path("type").asText()).path("rich_text"));
        if (!text.isBlank()) {
            builder.append(indent(indentLevel)).append(prefix).append(' ').append(text).append("\n\n");
        }
    }

    private void appendListItem(StringBuilder builder, JsonNode block, int indentLevel, String marker) {
        JsonNode listNode = block.path(block.path("type").asText());
        String text = renderRichText(listNode.path("rich_text"));
        builder.append(indent(indentLevel)).append(marker).append(' ').append(text).append("\n");
    }

    private void appendTodo(StringBuilder builder, JsonNode block, int indentLevel) {
        JsonNode todo = block.path("to_do");
        String text = renderRichText(todo.path("rich_text"));
        boolean checked = todo.path("checked").asBoolean(false);
        builder.append(indent(indentLevel))
                .append("- [").append(checked ? "x" : " ").append("] ")
                .append(text)
                .append("\n");
    }

    private void appendQuote(StringBuilder builder, JsonNode block, int indentLevel) {
        String text = renderRichText(block.path("quote").path("rich_text"));
        if (!text.isBlank()) {
            String prefix = indent(indentLevel) + "> ";
            String quoted = text.replace("\n", "\n" + prefix);
            builder.append(prefix).append(quoted).append("\n\n");
        }
    }

    private void appendCode(StringBuilder builder, JsonNode block, int indentLevel) {
        JsonNode code = block.path("code");
        String text = renderPlainText(code.path("rich_text"));
        String language = code.path("language").asText("");
        builder.append(indent(indentLevel)).append("```").append(language).append("\n")
                .append(text).append("\n")
                .append(indent(indentLevel)).append("```").append("\n\n");
    }

    private void appendImage(StringBuilder builder, JsonNode block, int indentLevel) {
        JsonNode image = block.path("image");
        String type = image.path("type").asText("");
        String url = "";
        if ("external".equals(type)) {
            url = image.path("external").path("url").asText("");
        } else if ("file".equals(type)) {
            url = image.path("file").path("url").asText("");
        }
        if (!url.isBlank()) {
            builder.append(indent(indentLevel)).append("![](").append(url).append(")\n\n");
        }
    }

    private void appendCallout(StringBuilder builder, JsonNode block, int indentLevel) {
        String text = renderRichText(block.path("callout").path("rich_text"));
        if (!text.isBlank()) {
            builder.append(indent(indentLevel)).append("> ").append(text).append("\n\n");
        }
    }

    private void appendFallback(StringBuilder builder, JsonNode block, int indentLevel, String type) {
        JsonNode data = block.path(type);
        String text = renderRichText(data.path("rich_text"));
        if (!text.isBlank()) {
            builder.append(indent(indentLevel)).append(text).append("\n\n");
        }
    }

    private String renderRichText(JsonNode richText) {
        if (richText == null || !richText.isArray()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (JsonNode node : richText) {
            String text = node.path("plain_text").asText("");
            JsonNode annotations = node.path("annotations");

            boolean code = annotations.path("code").asBoolean(false);
            boolean bold = annotations.path("bold").asBoolean(false);
            boolean italic = annotations.path("italic").asBoolean(false);
            boolean underline = annotations.path("underline").asBoolean(false);
            boolean strike = annotations.path("strikethrough").asBoolean(false);

            String formatted = text;
            if (code) {
                formatted = "`" + formatted.replace("`", "\\`") + "`";
            }
            if (bold) {
                formatted = "**" + formatted + "**";
            }
            if (italic) {
                formatted = "*" + formatted + "*";
            }
            if (strike) {
                formatted = "~~" + formatted + "~~";
            }
            if (underline) {
                formatted = "<u>" + formatted + "</u>";
            }

            String href = node.path("href").asText("");
            if (!href.isBlank()) {
                formatted = "[" + formatted + "](" + href + ")";
            }

            builder.append(formatted);
        }
        return builder.toString();
    }

    private String renderPlainText(JsonNode richText) {
        if (richText == null || !richText.isArray()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (JsonNode node : richText) {
            builder.append(node.path("plain_text").asText(""));
        }
        return builder.toString();
    }

    private PageIds extractPageIds(String shareUrl) {
        if (shareUrl == null || shareUrl.isBlank()) {
            throw new BusinessException("Notion 分享链接不能为空");
        }
        Matcher matcher = UUID_PATTERN.matcher(shareUrl);
        if (!matcher.find()) {
            throw new BusinessException("未识别到 Notion 页面 ID，请检查分享链接");
        }
        String id = matcher.group();
        String raw;
        String uuid;
        if (id.length() == 32) {
            raw = id.toLowerCase(Locale.ROOT);
            uuid = raw.substring(0, 8) + "-" + raw.substring(8, 12) + "-" + raw.substring(12, 16) + "-"
                    + raw.substring(16, 20) + "-" + raw.substring(20);
        } else {
            uuid = id.toLowerCase(Locale.ROOT);
            raw = uuid.replace("-", "");
        }
        return new PageIds(uuid, raw);
    }

    private boolean isListType(String type) {
        return "bulleted_list_item".equals(type) || "numbered_list_item".equals(type) || "to_do".equals(type);
    }

    private String indent(int level) {
        if (level <= 0) {
            return "";
        }
        return "  ".repeat(level);
    }

    private String slugify(String input) {
        if (input == null) {
            return "untitled";
        }
        String cleaned = input.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return cleaned.isBlank() ? "untitled" : cleaned;
    }

    private String ensureUniqueSlug(String slug) {
        String candidate = slug;
        int index = 2;
        while (articleRepository.findBySlug(candidate).isPresent()) {
            candidate = slug + "-" + index;
            index++;
        }
        return candidate;
    }

    private String generateSummary(String markdown) {
        if (markdown == null) {
            return "";
        }
        String cleaned = markdown
                .replaceAll("[#>*`_\\-]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.length() <= 120) {
            return cleaned;
        }
        return cleaned.substring(0, 120);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static class ImportContext {
        private final NotionAuthMode mode;
        private final String token;

        private ImportContext(NotionAuthMode mode, String token) {
            this.mode = mode;
            this.token = token;
        }
    }

    private static class PageIds {
        private final String uuid;
        private final String raw;

        private PageIds(String uuid, String raw) {
            this.uuid = uuid;
            this.raw = raw;
        }
    }
}
