package com.blog.service.impl;

import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.ArticleDetailDTO;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.ArticleUpdateRequest;
import com.blog.dto.category.CategoryDTO;
import com.blog.dto.tag.TagDTO;
import com.blog.entity.Article;
import com.blog.entity.Category;
import com.blog.entity.Tag;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CategoryRepository;
import com.blog.repository.CommentRepository;
import com.blog.repository.TagRepository;
import com.blog.repository.UserRepository;
import com.blog.service.ArticleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Article service implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleServiceImpl implements ArticleService {

    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final CommentRepository commentRepository;

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticles(Pageable pageable) {
        log.info("Fetching published articles, page {}", pageable.getPageNumber());
        return articleRepository.findPublishedArticles(pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> getAllArticles(Pageable pageable) {
        log.info("Fetching all articles (admin), page {}", pageable.getPageNumber());
        return articleRepository.findAll(pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticlesByCategory(Long categoryId, Pageable pageable) {
        log.info("Fetching published articles for category {}", categoryId);
        return articleRepository.findPublishedArticlesByCategory(categoryId, pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> searchPublishedArticles(String keyword, Pageable pageable) {
        log.info("Searching published articles by keyword '{}'", keyword);
        return articleRepository.searchPublishedArticles(keyword, pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    @Transactional
    public ArticleDetailDTO getArticleById(Long id) {
        log.info("Fetching article detail by id: {}", id);

        Article article = articleRepository.findWithDetailsById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        increaseViewCount(article);
        return convertToDetailDTO(article);
    }

    @Override
    @Transactional
    public ArticleDetailDTO getArticleBySlug(String slug) {
        log.info("Fetching article detail by slug: {}", slug);

        Article article = articleRepository.findWithDetailsBySlug(slug)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        increaseViewCount(article);
        return convertToDetailDTO(article);
    }

    @Override
    @Transactional
    public Long createArticle(ArticleCreateRequest request, String username) {
        log.info("Creating article: {}", request.getTitle());

        articleRepository.findBySlug(request.getSlug())
                .ifPresent(existing -> {
                    throw new BusinessException("Slug already exists");
                });

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Article article = new Article();
        article.setTitle(request.getTitle());
        article.setSlug(request.getSlug());
        article.setContent(request.getContent());
        article.setSummary(request.getSummary());
        article.setUser(user);

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new EntityNotFoundException("Category not found"));
            article.setCategory(category);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            article.setTags(loadTags(request.getTagIds()));
        }

        Article saved = articleRepository.save(article);
        log.info("Article created with id {}", saved.getId());
        return saved.getId();
    }

    @Override
    @Transactional
    public void updateArticle(Long id, ArticleUpdateRequest request) {
        log.info("Updating article {}", id);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        if (request.getTitle() != null) {
            article.setTitle(request.getTitle());
        }
        if (request.getSlug() != null) {
            articleRepository.findBySlug(request.getSlug())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new BusinessException("Slug already exists");
                        }
                    });
            article.setSlug(request.getSlug());
        }
        if (request.getContent() != null) {
            article.setContent(request.getContent());
        }
        if (request.getSummary() != null) {
            article.setSummary(request.getSummary());
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new EntityNotFoundException("Category not found"));
            article.setCategory(category);
        }

        if (request.getTagIds() != null) {
            article.setTags(request.getTagIds().isEmpty() ? new HashSet<>() : loadTags(request.getTagIds()));
        }

        articleRepository.save(article);
    }

    @Override
    @Transactional
    public void deleteArticle(Long id) {
        log.info("Deleting article {}", id);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        // 清理评论
        commentRepository.deleteByArticleId(id);
        // 清理标签关联
        if (article.getTags() != null) {
            article.getTags().clear();
        }

        articleRepository.delete(article);
    }

    @Override
    @Transactional
    public void publishArticle(Long id, boolean publish) {
        log.info("{} article {}", publish ? "Publishing" : "Unpublishing", id);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        if (publish) {
            article.setStatus("PUBLISHED");
            if (article.getPublishedAt() == null) {
                article.setPublishedAt(LocalDateTime.now());
            }
        } else {
            article.setStatus("DRAFT");
            article.setPublishedAt(null);
        }

        articleRepository.save(article);
    }

    private Set<Tag> loadTags(Set<Long> tagIds) {
        Set<Tag> tags = new HashSet<>();
        for (Long tagId : tagIds) {
            Tag tag = tagRepository.findById(tagId)
                    .orElseThrow(() -> new EntityNotFoundException("Tag not found: " + tagId));
            tags.add(tag);
        }
        return tags;
    }

    private void increaseViewCount(Article article) {
        article.setViews(article.getViews() + 1);
        articleRepository.save(article);
    }

    private ArticleSummaryDTO convertToSummaryDTO(Article article) {
        ArticleSummaryDTO dto = new ArticleSummaryDTO();
        dto.setId(article.getId());
        dto.setTitle(article.getTitle());
        dto.setSlug(article.getSlug());
        dto.setSummary(article.getSummary());
        dto.setStatus(article.getStatus());
        dto.setViews(article.getViews());
        dto.setPublishedAt(article.getPublishedAt());
        dto.setCreatedAt(article.getCreatedAt());

        if (article.getUser() != null) {
            dto.setAuthorName(article.getUser().getUsername());
        }

        if (article.getCategory() != null) {
            dto.setCategory(new CategoryDTO(
                    article.getCategory().getId(),
                    article.getCategory().getName(),
                    article.getCategory().getDescription(),
                    article.getCategory().getSlugPath(),
                    article.getCategory().getParent() != null ? article.getCategory().getParent().getId() : null,
                    null));
        }

        if (article.getTags() != null) {
            Set<TagDTO> tagDTOs = article.getTags().stream()
                    .map(tag -> new TagDTO(tag.getId(), tag.getName()))
                    .collect(Collectors.toSet());
            dto.setTags(tagDTOs);
        }

        return dto;
    }

    private ArticleDetailDTO convertToDetailDTO(Article article) {
        ArticleDetailDTO dto = new ArticleDetailDTO();
        dto.setId(article.getId());
        dto.setTitle(article.getTitle());
        dto.setSlug(article.getSlug());
        dto.setContent(article.getContent());
        dto.setSummary(article.getSummary());
        dto.setStatus(article.getStatus());
        dto.setViews(article.getViews());
        dto.setPublishedAt(article.getPublishedAt());
        dto.setCreatedAt(article.getCreatedAt());
        dto.setUpdatedAt(article.getUpdatedAt());

        if (article.getUser() != null) {
            dto.setAuthorName(article.getUser().getUsername());
        }

        if (article.getCategory() != null) {
            dto.setCategory(new CategoryDTO(
                    article.getCategory().getId(),
                    article.getCategory().getName(),
                    article.getCategory().getDescription(),
                    article.getCategory().getSlugPath(),
                    article.getCategory().getParent() != null ? article.getCategory().getParent().getId() : null,
                    null));
        }

        if (article.getTags() != null) {
            Set<TagDTO> tagDTOs = article.getTags().stream()
                    .map(tag -> new TagDTO(tag.getId(), tag.getName()))
                    .collect(Collectors.toSet());
            dto.setTags(tagDTOs);
        }

        return dto;
    }
}
