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
 * 文章服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleServiceImpl implements ArticleService {

    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticles(Pageable pageable) {
        log.info("获取已发布文章列表");
        return articleRepository.findPublishedArticles(pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> getPublishedArticlesByCategory(Long categoryId, Pageable pageable) {
        log.info("获取分类{}的已发布文章", categoryId);
        return articleRepository.findPublishedArticlesByCategory(categoryId, pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    public Page<ArticleSummaryDTO> searchPublishedArticles(String keyword, Pageable pageable) {
        log.info("搜索已发布文章: {}", keyword);
        return articleRepository.searchPublishedArticles(keyword, pageable)
                .map(this::convertToSummaryDTO);
    }

    @Override
    @Transactional
    public ArticleDetailDTO getArticleById(Long id) {
        log.info("获取文章详情: {}", id);

        Article article = articleRepository.findWithDetailsById(id)
                .orElseThrow(() -> new EntityNotFoundException("文章不存在"));

        // 异步增加浏览量
        article.setViews(article.getViews() + 1);
        articleRepository.save(article);

        return convertToDetailDTO(article);
    }

    @Override
    @Transactional
    public Long createArticle(ArticleCreateRequest request, String username) {
        log.info("创建文章: {}", request.getTitle());

        // 检查Slug唯一性
        if (articleRepository.findBySlug(request.getSlug()).isPresent()) {
            throw new BusinessException("Slug已存在");
        }

        // 查找用户
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("用户不存在"));

        // 创建文章实体
        Article article = new Article();
        article.setTitle(request.getTitle());
        article.setSlug(request.getSlug());
        article.setContent(request.getContent());
        article.setSummary(request.getSummary());
        article.setUser(user);

        // 设置分类
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new EntityNotFoundException("分类不存在"));
            article.setCategory(category);
        }

        // 设置标签
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>();
            for (Long tagId : request.getTagIds()) {
                Tag tag = tagRepository.findById(tagId)
                        .orElseThrow(() -> new EntityNotFoundException("标签不存在: " + tagId));
                tags.add(tag);
            }
            article.setTags(tags);
        }

        Article saved = articleRepository.save(article);
        log.info("文章创建成功: {}", saved.getId());

        return saved.getId();
    }

    @Override
    @Transactional
    public void updateArticle(Long id, ArticleUpdateRequest request) {
        log.info("更新文章: {}", id);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("文章不存在"));

        // 更新基本信息
        if (request.getTitle() != null) {
            article.setTitle(request.getTitle());
        }
        if (request.getSlug() != null) {
            // 检查Slug冲突
            articleRepository.findBySlug(request.getSlug())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new BusinessException("Slug已存在");
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

        // 更新分类
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new EntityNotFoundException("分类不存在"));
            article.setCategory(category);
        }

        // 更新标签
        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>();
            for (Long tagId : request.getTagIds()) {
                Tag tag = tagRepository.findById(tagId)
                        .orElseThrow(() -> new EntityNotFoundException("标签不存在: " + tagId));
                tags.add(tag);
            }
            article.setTags(tags);
        }

        articleRepository.save(article);
    }

    @Override
    @Transactional
    public void deleteArticle(Long id) {
        log.info("删除文章: {}", id);

        if (!articleRepository.existsById(id)) {
            throw new EntityNotFoundException("文章不存在");
        }

        articleRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void publishArticle(Long id, boolean publish) {
        log.info("{}文章: {}", publish ? "发布" : "取消发布", id);

        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("文章不存在"));

        if (publish) {
            article.setStatus("PUBLISHED");
            article.setPublishedAt(LocalDateTime.now());
        } else {
            article.setStatus("DRAFT");
            article.setPublishedAt(null);
        }

        articleRepository.save(article);
    }

    /**
     * 转换为摘要DTO
     */
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
                    article.getCategory().getDescription()));
        }

        if (article.getTags() != null) {
            Set<TagDTO> tagDTOs = article.getTags().stream()
                    .map(tag -> new TagDTO(tag.getId(), tag.getName()))
                    .collect(Collectors.toSet());
            dto.setTags(tagDTOs);
        }

        return dto;
    }

    /**
     * 转换为详情DTO
     */
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
                    article.getCategory().getDescription()));
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
