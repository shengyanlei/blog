package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.tag.TagDTO;
import com.blog.dto.tag.TagRequest;
import com.blog.service.TagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/**
 * 标签控制器
 */
@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
@Slf4j
public class TagController {

    private final TagService tagService;

    /**
     * 获取所有标签
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<TagDTO>>> getAllTags() {
        try {
            List<TagDTO> tags = tagService.getAllTags();
            return ResponseEntity.ok(ApiResponse.success(tags));
        } catch (Exception e) {
            log.error("获取标签列表失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 根据ID获取标签
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TagDTO>> getTagById(@PathVariable Long id) {
        try {
            TagDTO tag = tagService.getTagById(id);
            return ResponseEntity.ok(ApiResponse.success(tag));
        } catch (Exception e) {
            log.error("获取标签失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 创建标签 (仅管理员)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TagDTO>> createTag(@Valid @RequestBody TagRequest request) {
        try {
            TagDTO tag = tagService.createTag(request);
            return ResponseEntity.ok(ApiResponse.success("创建成功", tag));
        } catch (Exception e) {
            log.error("创建标签失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 删除标签 (仅管理员)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteTag(@PathVariable Long id) {
        try {
            tagService.deleteTag(id);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("删除标签失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
