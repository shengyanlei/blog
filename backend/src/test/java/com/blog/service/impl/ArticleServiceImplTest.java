package com.blog.service.impl;

import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.CategoryArticleGroupDTO;
import com.blog.dto.article.CategoryArticleGroupMetaDTO;
import com.blog.entity.Article;
import com.blog.entity.Category;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CategoryRepository;
import com.blog.repository.CommentRepository;
import com.blog.repository.FootprintPhotoRepository;
import com.blog.repository.TagRepository;
import com.blog.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private FootprintPhotoRepository footprintPhotoRepository;

    @InjectMocks
    private ArticleServiceImpl service;

    @Test
    void updateFeaturedLevel_shouldPersistRequestedLevel() {
        Article article = buildArticle(7L, "featured-article", 0, buildCategory(3L, "weekly"));
        when(articleRepository.findById(7L)).thenReturn(Optional.of(article));
        when(articleRepository.save(any(Article.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ArticleSummaryDTO result = service.updateFeaturedLevel(7L, 2);

        assertEquals(2, article.getFeaturedLevel());
        assertEquals(2, result.getFeaturedLevel());
        verify(articleRepository).save(article);
    }

    @Test
    void updateFeaturedLevel_shouldRejectOutOfRange() {
        assertThrows(BusinessException.class, () -> service.updateFeaturedLevel(7L, 3));

        verify(articleRepository, never()).findById(any());
    }

    @Test
    void getPublishedArticles_shouldUseFixedSortAndCombinedFilters() {
        Article article = buildArticle(11L, "filtered-article", 2, buildCategory(9L, "architecture"));
        Page<Article> page = new PageImpl<>(List.of(article));
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        ArgumentCaptor<Specification<Article>> specificationCaptor = ArgumentCaptor.forClass(Specification.class);

        when(articleRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        Page<ArticleSummaryDTO> result = service.getPublishedArticles(
                "group",
                9L,
                2,
                false,
                PageRequest.of(3, 12, Sort.by(Sort.Order.asc("createdAt")))
        );

        assertEquals(1, result.getContent().size());
        assertEquals(11L, result.getContent().get(0).getId());

        verify(articleRepository).findAll(specificationCaptor.capture(), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertEquals(3, pageable.getPageNumber());
        assertEquals(12, pageable.getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("publishedAt").getDirection());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("id").getDirection());
        assertNotNull(specificationCaptor.getValue());
    }

    @Test
    void getPublishedArticleGroups_shouldBuildCategoryGroupsWithRequestedLimit() {
        Category category = buildCategory(21L, "engineering");
        Article first = buildArticle(101L, "first", 2, category);
        Article second = buildArticle(102L, "second", 1, category);
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);

        when(articleRepository.findPublishedCategoryGroupMetas()).thenReturn(List.of(
                new CategoryArticleGroupMetaDTO(
                        21L,
                        "engineering",
                        "Reusable methods for long-term maintenance.",
                        "engineering",
                        null,
                        9L,
                        LocalDateTime.of(2026, 3, 7, 9, 0)
                )
        ));
        when(articleRepository.findPublishedArticlesByCategory(eq(21L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first, second)));

        List<CategoryArticleGroupDTO> result = service.getPublishedArticleGroups(6);

        assertEquals(1, result.size());
        assertEquals("engineering", result.get(0).getCategory().getName());
        assertEquals(9L, result.get(0).getTotalCount());
        assertEquals(2, result.get(0).getArticles().size());
        assertEquals(2, result.get(0).getArticles().get(0).getFeaturedLevel());
        assertEquals(1, result.get(0).getArticles().get(1).getFeaturedLevel());

        verify(articleRepository).findPublishedArticlesByCategory(eq(21L), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(6, pageable.getPageSize());
    }

    @Test
    void getAllArticles_withKeyword_shouldUseAdminSearchSpecification() {
        Article article = buildArticle(31L, "admin-search-article", 0, buildCategory(5L, "weekly"));
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        ArgumentCaptor<Specification<Article>> specificationCaptor = ArgumentCaptor.forClass(Specification.class);

        when(articleRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(article)));

        Page<ArticleSummaryDTO> result = service.getAllArticles("admin", PageRequest.of(1, 24));

        assertEquals(1, result.getContent().size());
        assertEquals(31L, result.getContent().get(0).getId());
        verify(articleRepository).findAll(specificationCaptor.capture(), pageableCaptor.capture());
        assertNotNull(specificationCaptor.getValue());
        assertEquals(1, pageableCaptor.getValue().getPageNumber());
        assertEquals(24, pageableCaptor.getValue().getPageSize());
    }

    private static Article buildArticle(Long id, String title, int featuredLevel, Category category) {
        Article article = new Article();
        article.setId(id);
        article.setTitle(title);
        article.setSlug("article-" + id);
        article.setContent("content-" + id);
        article.setSummary("summary-" + id);
        article.setStatus("PUBLISHED");
        article.setFeaturedLevel(featuredLevel);
        article.setViews(0L);
        article.setPublishedAt(LocalDateTime.of(2026, 3, 7, 8, 0));
        article.setCreatedAt(LocalDateTime.of(2026, 3, 6, 8, 0));
        article.setCategory(category);
        return article;
    }

    private static Category buildCategory(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setSlug("category-" + id);
        category.setSlugPath("category-" + id);
        return category;
    }
}
