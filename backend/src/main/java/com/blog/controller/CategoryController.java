package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.category.CategoryDTO;
import com.blog.dto.category.CategoryRequest;
import com.blog.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/**
 * 分类控制器
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Slf4j
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * 获取所有分类
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryDTO>>> getAllCategories() {
        try {
            List<CategoryDTO> categories = categoryService.getAllCategories();
            return ResponseEntity.ok(ApiResponse.success(categories));
        } catch (Exception e) {
            log.error("获取分类列表失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 根据ID获取分类
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryDTO>> getCategoryById(@PathVariable Long id) {
        try {
            CategoryDTO category = categoryService.getCategoryById(id);
            return ResponseEntity.ok(ApiResponse.success(category));
        } catch (Exception e) {
            log.error("获取分类失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 创建分类 (仅管理员)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDTO>> createCategory(@Valid @RequestBody CategoryRequest request) {
        try {
            CategoryDTO category = categoryService.createCategory(request);
            return ResponseEntity.ok(ApiResponse.success("创建成功", category));
        } catch (Exception e) {
            log.error("创建分类失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 更新分类 (仅管理员)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDTO>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        try {
            CategoryDTO category = categoryService.updateCategory(id, request);
            return ResponseEntity.ok(ApiResponse.success("更新成功", category));
        } catch (Exception e) {
            log.error("更新分类失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 删除分类 (仅管理员)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        try {
            categoryService.deleteCategory(id);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("删除分类失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
