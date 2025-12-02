package com.blog.service.impl;

import com.blog.dto.comment.CommentCreateRequest;
import com.blog.dto.comment.CommentDTO;
import com.blog.entity.Article;
import com.blog.entity.Comment;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CommentRepository;
import com.blog.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 评论服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;

    @Override
    public List<CommentDTO> getApprovedCommentsByArticleId(Long articleId) {
        log.info("获取文章{}的评论", articleId);
        return commentRepository.findApprovedCommentsByArticleId(articleId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CommentDTO createComment(Long articleId, CommentCreateRequest request) {
        log.info("创建评论: 文章ID={}", articleId);

        // 检查文章是否存在
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new EntityNotFoundException("文章不存在"));

        Comment comment = new Comment();
        comment.setContent(request.getContent());
        comment.setAuthorName(request.getAuthorName());
        comment.setArticle(article);
        comment.setStatus("PENDING"); // 默认待审核

        // 设置父评论（如果有）
        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("父评论不存在"));
            comment.setParent(parent);
        }

        Comment saved = commentRepository.save(comment);
        log.info("评论创建成功: {}", saved.getId());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId) {
        log.info("删除评论: {}", commentId);

        if (!commentRepository.existsById(commentId)) {
            throw new EntityNotFoundException("评论不存在");
        }

        commentRepository.deleteById(commentId);
    }

    @Override
    @Transactional
    public void approveComment(Long commentId) {
        log.info("批准评论: {}", commentId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("评论不存在"));

        comment.setStatus("APPROVED");
        commentRepository.save(comment);
    }

    /**
     * 转换为DTO
     */
    private CommentDTO convertToDTO(Comment comment) {
        return new CommentDTO(
                comment.getId(),
                comment.getContent(),
                comment.getAuthorName(),
                comment.getStatus(),
                comment.getCreatedAt(),
                comment.getParent() != null ? comment.getParent().getId() : null);
    }
}
