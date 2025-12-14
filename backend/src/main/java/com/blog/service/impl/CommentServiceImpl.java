package com.blog.service.impl;

import com.blog.dto.comment.CommentCreateRequest;
import com.blog.dto.comment.CommentDTO;
import com.blog.entity.Article;
import com.blog.entity.Comment;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CommentRepository;
import com.blog.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.persistence.EntityNotFoundException;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Comment service implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CommentDTO> getCommentsByArticleId(Long articleId) {
        log.info("Fetching comments for article {}", articleId);
        return commentRepository.findByArticleIdOrderByCreatedAtDesc(articleId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommentDTO> getComments(String status, Pageable pageable) {
        log.info("Fetching comments for admin, status: {}, page: {}", status, pageable.getPageNumber());
        Page<Comment> page = StringUtils.hasText(status)
                ? commentRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : commentRepository.findAllByOrderByCreatedAtDesc(pageable);
        return page.map(this::convertToDTO);
    }

    @Override
    @Transactional
    public CommentDTO createComment(Long articleId, CommentCreateRequest request) {
        log.info("Creating comment for article {}", articleId);

        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new EntityNotFoundException("Article not found"));

        Comment comment = new Comment();
        String authorName = StringUtils.hasText(request.getAuthorName())
                ? request.getAuthorName().trim()
                : generateAnonymousName();

        comment.setContent(request.getContent());
        comment.setAuthorName(authorName);
        comment.setArticle(article);
        comment.setStatus("APPROVED");

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent comment not found"));
            comment.setParent(parent);
        }

        Comment saved = commentRepository.save(comment);
        log.info("Comment created with id {}", saved.getId());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId) {
        log.info("Deleting comment {}", commentId);

        if (!commentRepository.existsById(commentId)) {
            throw new EntityNotFoundException("Comment not found");
        }

        commentRepository.deleteById(commentId);
    }

    @Override
    @Transactional
    public void approveComment(Long commentId) {
        log.info("Approving comment {}", commentId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found"));

        comment.setStatus("APPROVED");
        commentRepository.save(comment);
    }

    private String generateAnonymousName() {
        int number = ThreadLocalRandom.current().nextInt(1000, 10000);
        return "Visitor-" + number;
    }

    private CommentDTO convertToDTO(Comment comment) {
        return new CommentDTO(
                comment.getId(),
                comment.getContent(),
                comment.getAuthorName(),
                comment.getStatus(),
                comment.getCreatedAt(),
                comment.getParent() != null ? comment.getParent().getId() : null,
                comment.getArticle() != null ? comment.getArticle().getId() : null,
                comment.getArticle() != null ? comment.getArticle().getTitle() : null,
                comment.getArticle() != null ? comment.getArticle().getSlug() : null);
    }
}
