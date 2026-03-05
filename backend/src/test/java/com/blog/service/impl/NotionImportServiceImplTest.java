package com.blog.service.impl;

import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.NotionImportPreviewResponse;
import com.blog.dto.article.NotionImportRequest;
import com.blog.repository.ArticleRepository;
import com.blog.repository.NotionConnectionRepository;
import com.blog.repository.UserRepository;
import com.blog.service.ArticleService;
import com.blog.service.notion.NotionHttpClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class NotionImportServiceImplTest {

    private static final String SHARE_URL = "https://www.notion.so/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    @Mock
    private ArticleService articleService;

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotionConnectionRepository notionConnectionRepository;

    @Mock
    private NotionHttpClient notionHttpClient;

    @InjectMocks
    private NotionImportServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        ReflectionTestUtils.setField(service, "notionVersion", "2025-09-03");
        ReflectionTestUtils.setField(service, "publicImportEnabled", false);
        ReflectionTestUtils.setField(service, "notionPreviewCacheTtlSeconds", 600L);
        ReflectionTestUtils.setField(service, "notionPreviewCacheMaxEntries", 200);

        JsonNode pageResponse = new ObjectMapper().readTree("{\"properties\":{\"title\":{\"type\":\"title\",\"title\":[{\"plain_text\":\"Cached Title\"}]}}}");
        JsonNode blocksResponse = new ObjectMapper().readTree("{\"results\":[{\"id\":\"child-1\",\"type\":\"paragraph\",\"paragraph\":{\"rich_text\":[{\"plain_text\":\"Hello cache\"}]},\"has_children\":false}],\"has_more\":false}");

        when(notionHttpClient.exchange(anyString(), contains("/pages/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(pageResponse));
        lenient().when(notionHttpClient.exchange(anyString(), contains("/blocks/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(blocksResponse));
    }

    @Test
    void importFromShareUrl_shouldReusePreviewCache() {
        NotionImportRequest request = buildIntegrationRequest("token-a");
        when(articleRepository.findBySlug(anyString())).thenReturn(Optional.empty());
        when(articleService.createArticle(any(ArticleCreateRequest.class), anyString())).thenReturn(123L);

        NotionImportPreviewResponse preview = service.preview(request, "alice");
        Long articleId = service.importFromShareUrl(request, "alice");

        assertNotNull(preview);
        assertEquals("Cached Title", preview.getTitle());
        assertEquals(123L, articleId);
        verify(notionHttpClient, times(1))
                .exchange(anyString(), contains("/pages/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
        verify(notionHttpClient, times(1))
                .exchange(anyString(), contains("/blocks/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
    }

    @Test
    void previewCache_shouldIsolateByTokenFingerprint() {
        service.preview(buildIntegrationRequest("token-a"), "alice");
        service.preview(buildIntegrationRequest("token-b"), "alice");

        verify(notionHttpClient, times(2))
                .exchange(anyString(), contains("/pages/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
        verify(notionHttpClient, times(2))
                .exchange(anyString(), contains("/blocks/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
    }

    @Test
    void previewCache_shouldExpireAfterTtl() throws Exception {
        ReflectionTestUtils.setField(service, "notionPreviewCacheTtlSeconds", 1L);
        NotionImportRequest request = buildIntegrationRequest("token-a");

        service.preview(request, "alice");
        Thread.sleep(1200L);
        service.preview(request, "alice");

        verify(notionHttpClient, times(2))
                .exchange(anyString(), contains("/pages/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
        verify(notionHttpClient, times(2))
                .exchange(anyString(), contains("/blocks/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
    }

    @Test
    void preview_shouldInsertBlankLineWhenListEndsBeforeNumberedSectionText() throws Exception {
        JsonNode blocksResponse = new ObjectMapper().readTree(
                "{\"results\":[" +
                        "{\"id\":\"li-1\",\"type\":\"bulleted_list_item\",\"bulleted_list_item\":{\"rich_text\":[{\"plain_text\":\"上一行中文结尾\"}]},\"has_children\":false}," +
                        "{\"id\":\"p-2\",\"type\":\"paragraph\",\"paragraph\":{\"rich_text\":[{\"plain_text\":\"4.3 验证2：这是下一段\"}]},\"has_children\":false}" +
                        "],\"has_more\":false}"
        );
        when(notionHttpClient.exchange(anyString(), contains("/blocks/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(blocksResponse));

        NotionImportPreviewResponse preview = service.preview(buildIntegrationRequest("token-a"), "alice");

        assertNotNull(preview);
        assertTrue(preview.getContent().contains("- 上一行中文结尾\n\n4.3 验证2：这是下一段"));
    }

    @Test
    void preview_shouldPreserveSoftLineBreakInParagraph() throws Exception {
        JsonNode blocksResponse = new ObjectMapper().readTree(
                "{\"results\":[" +
                        "{\"id\":\"p-1\",\"type\":\"paragraph\",\"paragraph\":{\"rich_text\":[{\"plain_text\":\"上一行中文结尾\\n4.3 验证2：这是同段换行\"}]},\"has_children\":false}" +
                        "],\"has_more\":false}"
        );
        when(notionHttpClient.exchange(anyString(), contains("/blocks/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(blocksResponse));

        NotionImportPreviewResponse preview = service.preview(buildIntegrationRequest("token-a"), "alice");

        assertNotNull(preview);
        assertTrue(preview.getContent().contains("上一行中文结尾  \n4.3 验证2：这是同段换行"));
    }

    private NotionImportRequest buildIntegrationRequest(String token) {
        NotionImportRequest request = new NotionImportRequest();
        request.setShareUrl(SHARE_URL);
        request.setAuthMode("INTEGRATION");
        request.setTokenOverride(token);
        request.setPublish(false);
        return request;
    }
}
