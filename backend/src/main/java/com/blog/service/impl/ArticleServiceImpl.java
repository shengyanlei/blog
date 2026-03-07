package com.blog.service.impl;

import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.ArticleDetailDTO;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.ArticleUpdateRequest;
import com.blog.dto.article.CategoryArticleGroupDTO;
import com.blog.dto.category.CategoryDTO;
import com.blog.dto.tag.TagDTO;
import com.blog.entity.Article;
import com.blog.entity.Category;
import com.blog.entity.FootprintPhoto;
import com.blog.entity.Tag;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CategoryRepository;
import com.blog.repository.CommentRepository;
import com.blog.repository.FootprintPhotoRepository;
import com.blog.repository.TagRepository;
import com.blog.repository.UserRepository;
import com.blog.service.ArticleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.persistence.EntityNotFoundException;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Article service implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleServiceImpl implements ArticleService {

    private static final Sort PUBLIC_ARTICLE_SORT = Sort.by(
            Sort.Order.desc("publishedAt"),
            Sort.Order.desc("id")
    );

    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final CommentRepository commentRepository;
    private final FootprintPhotoRepository footprintPhotoRepository;

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticles(Pageable pageable) {
        return getPublishedArticles(null, null, null, false, pageable);
    }

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticles(
            String keyword,
            Long categoryId,
            Integer featuredLevel,
            Boolean excludeFeatured,
            Pageable pageable) {
        log.info(
                "Fetching published articles, page={}, keyword={}, categoryId={}, featuredLevel={}, excludeFeatured={}",
                pageable.getPageNumber(),
                keyword,
                categoryId,
                featuredLevel,
                excludeFeatured
        );
        validateFeaturedLevel(featuredLevel);
        Specification<Article> specification = buildPublishedArticleSpecification(
                keyword,
                categoryId,
                featuredLevel,
                excludeFeatured
        );
        return articleRepository.findAll(specification, buildPublicPageable(pageable))
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> getAllArticles(Pageable pageable) {
        log.info("Fetching all articles (admin), page {}", pageable.getPageNumber());
        Pageable orderedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return articleRepository.findAllOrderByVisibleDate(orderedPageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> getAllArticles(String keyword, Pageable pageable) {
        if (!StringUtils.hasText(keyword)) {
            return getAllArticles(pageable);
        }

        log.info("Fetching admin articles with keyword={}, page={}", keyword, pageable.getPageNumber());
        Specification<Article> specification = buildAdminArticleSpecification(keyword);
        Pageable adminPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return articleRepository.findAll(specification, adminPageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticlesByCategory(Long categoryId, Pageable pageable) {
        return getPublishedArticles(null, categoryId, null, false, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryArticleGroupDTO> getPublishedArticleGroups(int perCategoryLimit) {
        if (perCategoryLimit <= 0) {
            throw new BusinessException("perCategoryLimit 必须大于 0", HttpStatus.BAD_REQUEST);
        }
        log.info("Fetching published article groups, perCategoryLimit={}", perCategoryLimit);

        Pageable groupPageable = PageRequest.of(0, perCategoryLimit);
        return articleRepository.findPublishedCategoryGroupMetas().stream()
                .map(meta -> new CategoryArticleGroupDTO(
                        new CategoryDTO(
                                meta.getCategoryId(),
                                meta.getCategoryName(),
                                meta.getCategoryDescription(),
                                meta.getCategorySlugPath(),
                                meta.getParentId(),
                                null
                        ),
                        meta.getTotalCount(),
                        articleRepository.findPublishedArticlesByCategory(meta.getCategoryId(), groupPageable)
                                .getContent()
                                .stream()
                                .map(this::convertToSummaryDTO)
                                .collect(Collectors.toList())
                ))
                .collect(Collectors.toList());
    }

    @Override
    public Page<ArticleSummaryDTO> searchPublishedArticles(String keyword, Pageable pageable) {
        return getPublishedArticles(keyword, null, null, false, pageable);
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
    @Transactional(readOnly = true)
    public ArticleDetailDTO getArticleDetailForAdmin(Long id) {
        log.info("Fetching admin article detail by id: {}", id);

        Article article = articleRepository.findWithDetailsById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

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
        article.setCoverPhoto(resolveCoverPhoto(request.getCoverPhotoId()));

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

        if ("PUBLISHED".equalsIgnoreCase(article.getStatus())) {
            throw new BusinessException("已发布文章请先取消发布再编辑", HttpStatus.CONFLICT);
        }

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
        article.setCoverPhoto(resolveCoverPhoto(request.getCoverPhotoId()));

        articleRepository.save(article);
    }

    @Override
    @Transactional
    public ArticleSummaryDTO updateFeaturedLevel(Long id, int featuredLevel) {
        validateFeaturedLevel(featuredLevel);
        log.info("Updating article {} featured level to {}", id, featuredLevel);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));
        article.setFeaturedLevel(featuredLevel);

        return convertToSummaryDTO(articleRepository.save(article));
    }

    @Override
    @Transactional
    public void deleteArticle(Long id) {
        log.info("Deleting article {}", id);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        if ("PUBLISHED".equalsIgnoreCase(article.getStatus())) {
            throw new BusinessException("已发布文章不允许删除，请先取消发布", HttpStatus.CONFLICT);
        }

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

    private Pageable buildPublicPageable(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), PUBLIC_ARTICLE_SORT);
    }

    private Specification<Article> buildAdminArticleSpecification(String keyword) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                String likeKeyword = "%" + keyword.trim() + "%";
                predicates.add(cb.or(
                        cb.like(root.get("title"), likeKeyword),
                        cb.like(root.get("summary"), likeKeyword),
                        cb.like(root.get("content"), likeKeyword)
                ));
            }

            query.distinct(true);
            query.orderBy(
                    cb.desc(cb.coalesce(root.get("publishedAt"), root.get("createdAt"))),
                    cb.desc(root.get("id"))
            );
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<Article> buildPublishedArticleSpecification(
            String keyword,
            Long categoryId,
            Integer featuredLevel,
            Boolean excludeFeatured) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "PUBLISHED"));

            if (StringUtils.hasText(keyword)) {
                String likeKeyword = "%" + keyword.trim() + "%";
                predicates.add(cb.or(
                        cb.like(root.get("title"), likeKeyword),
                        cb.like(root.get("summary"), likeKeyword),
                        cb.like(root.get("content"), likeKeyword)
                ));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.join("category", JoinType.LEFT).get("id"), categoryId));
            }

            if (featuredLevel != null) {
                predicates.add(cb.equal(root.get("featuredLevel"), featuredLevel));
            }

            if (Boolean.TRUE.equals(excludeFeatured)) {
                predicates.add(cb.equal(root.get("featuredLevel"), 0));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void validateFeaturedLevel(Integer featuredLevel) {
        if (featuredLevel == null) {
            return;
        }
        if (featuredLevel < 0 || featuredLevel > 2) {
            throw new BusinessException("featuredLevel 只能是 0/1/2", HttpStatus.BAD_REQUEST);
        }
    }

    private ArticleSummaryDTO convertToSummaryDTO(Article article) {
        ArticleSummaryDTO dto = new ArticleSummaryDTO();
        dto.setId(article.getId());
        dto.setTitle(article.getTitle());
        dto.setSlug(article.getSlug());
        dto.setSummary(article.getSummary());
        dto.setCoverPhotoId(article.getCoverPhoto() == null ? null : article.getCoverPhoto().getId());
        dto.setCoverImage(article.getCoverPhoto() == null ? null : article.getCoverPhoto().getUrl());
        dto.setStatus(article.getStatus());
        dto.setFeaturedLevel(article.getFeaturedLevel());
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
        dto.setCoverPhotoId(article.getCoverPhoto() == null ? null : article.getCoverPhoto().getId());
        dto.setCoverImage(article.getCoverPhoto() == null ? null : article.getCoverPhoto().getUrl());
        dto.setStatus(article.getStatus());
        dto.setFeaturedLevel(article.getFeaturedLevel());
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

    private FootprintPhoto resolveCoverPhoto(Long coverPhotoId) {
        if (coverPhotoId == null) {
            return null;
        }
        FootprintPhoto photo = footprintPhotoRepository.findById(coverPhotoId)
                .orElseThrow(() -> new EntityNotFoundException("Cover photo not found"));
        if (!FootprintPhoto.SOURCE_TYPE_COVER_MATERIAL.equals(photo.getSourceType())) {
            throw new BusinessException("Cover photo must come from cover material pool", HttpStatus.BAD_REQUEST);
        }
        return photo;
    }
}
