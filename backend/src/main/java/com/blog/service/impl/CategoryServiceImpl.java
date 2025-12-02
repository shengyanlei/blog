package com.blog.service.impl;

import com.blog.dto.category.CategoryDTO;
import com.blog.dto.category.CategoryRequest;
import com.blog.entity.Category;
import com.blog.exception.BusinessException;
import com.blog.repository.CategoryRepository;
import com.blog.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 分类服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    public List<CategoryDTO> getAllCategories() {
        log.info("获取所有分类");
        return categoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryDTO getCategoryById(Long id) {
        log.info("获取分类: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("分类不存在"));
        return convertToDTO(category);
    }

    @Override
    @Transactional
    public CategoryDTO createCategory(CategoryRequest request) {
        log.info("创建分类: {}", request.getName());

        // 检查名称是否已存在
        if (categoryRepository.findByName(request.getName()).isPresent()) {
            throw new BusinessException("分类名称已存在");
        }

        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());

        Category saved = categoryRepository.save(category);
        log.info("分类创建成功: {}", saved.getId());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryRequest request) {
        log.info("更新分类: {}", id);

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("分类不存在"));

        // 检查名称是否与其他分类冲突
        categoryRepository.findByName(request.getName())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new BusinessException("分类名称已存在");
                    }
                });

        category.setName(request.getName());
        category.setDescription(request.getDescription());

        Category updated = categoryRepository.save(category);
        return convertToDTO(updated);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        log.info("删除分类: {}", id);

        if (!categoryRepository.existsById(id)) {
            throw new EntityNotFoundException("分类不存在");
        }

        categoryRepository.deleteById(id);
    }

    /**
     * 将Entity转换为DTO
     */
    private CategoryDTO convertToDTO(Category category) {
        return new CategoryDTO(
                category.getId(),
                category.getName(),
                category.getDescription());
    }
}
