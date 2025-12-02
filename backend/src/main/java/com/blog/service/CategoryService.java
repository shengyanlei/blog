package com.blog.service;

import com.blog.dto.category.CategoryDTO;
import com.blog.dto.category.CategoryRequest;

import java.util.List;

/**
 * 分类服务接口
 */
public interface CategoryService {

    /**
     * 获取所有分类
     */
    List<CategoryDTO> getAllCategories();

    /**
     * 根据ID获取分类
     */
    CategoryDTO getCategoryById(Long id);

    /**
     * 创建分类
     */
    CategoryDTO createCategory(CategoryRequest request);

    /**
     * 更新分类
     */
    CategoryDTO updateCategory(Long id, CategoryRequest request);

    /**
     * 删除分类
     */
    void deleteCategory(Long id);
}
