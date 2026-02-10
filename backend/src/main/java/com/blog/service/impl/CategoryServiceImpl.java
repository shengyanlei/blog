package com.blog.service.impl;

import com.blog.dto.category.CategoryDTO;
import com.blog.dto.category.CategoryRequest;
import com.blog.entity.Category;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CategoryRepository;
import com.blog.service.CategoryService;
import com.blog.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ArticleRepository articleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryDTO> getAllCategories() {
        log.info("Fetching all categories");
        List<Category> all = categoryRepository.findAll();
        Map<Long, CategoryDTO> dtoMap = all.stream()
                .collect(Collectors.toMap(Category::getId, this::basicDTO));

        // 构建树
        List<CategoryDTO> roots = new ArrayList<>();
        for (Category cat : all) {
            CategoryDTO dto = dtoMap.get(cat.getId());
            if (cat.getParent() == null) {
                roots.add(dto);
            } else {
                CategoryDTO parentDto = dtoMap.get(cat.getParent().getId());
                if (parentDto != null) {
                    parentDto.getChildren().add(dto);
                }
            }
        }
        return roots;
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));
        return convertToDTO(category);
    }

    @Override
    @Transactional
    public CategoryDTO createCategory(CategoryRequest request) {
        Category parent = null;
        if (request.getParentId() != null) {
            parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent category not found"));
        }

        Category target = createByPath(request.getName(), request.getDescription(), parent);
        return convertToDTO(target);
    }

    @Override
    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));

        Category parent = null;
        if (request.getParentId() != null) {
            parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent category not found"));
            if (parent.getId().equals(id)) {
                throw new BusinessException("分类不能成为自己的父级");
            }
        }

        String newSlug = SlugUtils.slugify(request.getName(), "category");
        String newSlugPath = buildSlugPath(parent, newSlug);

        categoryRepository.findBySlugPath(newSlugPath)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new BusinessException("分类路径已存在");
                    }
                });

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setParent(parent);
        category.setSlug(newSlug);
        category.setSlugPath(newSlugPath);

        Category updated = categoryRepository.save(category);
        // 同步子节点路径
        updateChildPaths(updated);
        return convertToDTO(updated);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));

        List<Category> children = categoryRepository.findByParentId(id);
        if (!children.isEmpty()) {
            throw new BusinessException("请先删除该分类的子分类");
        }

        if (articleRepository.existsByCategoryId(id)) {
            throw new BusinessException("该分类已关联文章，请先调整文章分类后再删除");
        }

        categoryRepository.delete(category);
    }

    /**
     * 解析包含 / 的路径，递归创建层级分类。
     */
    private Category createByPath(String rawPath, String description, Category baseParent) {
        if (!StringUtils.hasText(rawPath)) {
            throw new BusinessException("分类名称不能为空");
        }

        String[] parts = rawPath.split("/");
        Category currentParent = baseParent;
        Category last = null;

        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            if (part.isEmpty()) {
                continue;
            }

            String slug = SlugUtils.slugify(part, "category");
            String slugPath = buildSlugPath(currentParent, slug);

            Category existing = categoryRepository.findBySlugPath(slugPath).orElse(null);
            if (existing != null) {
                currentParent = existing;
                last = existing;
                continue;
            }

            Category category = new Category();
            category.setName(part);
            category.setParent(currentParent);
            category.setSlug(slug);
            category.setSlugPath(slugPath);
            // 仅最后一级带描述
            if (i == parts.length - 1 && StringUtils.hasText(description)) {
                category.setDescription(description);
            }

            category = categoryRepository.save(category);
            currentParent = category;
            last = category;
        }

        if (last == null) {
            throw new BusinessException("分类名称不能为空");
        }
        return last;
    }

    private void updateChildPaths(Category parent) {
        List<Category> children = categoryRepository.findByParentId(parent.getId());
        for (Category child : children) {
            child.setSlugPath(buildSlugPath(parent, child.getSlug()));
            categoryRepository.save(child);
            updateChildPaths(child);
        }
    }

    private String buildSlugPath(Category parent, String slug) {
        return parent == null ? slug : parent.getSlugPath() + "/" + slug;
    }

    private CategoryDTO basicDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setSlugPath(category.getSlugPath());
        dto.setParentId(category.getParent() != null ? category.getParent().getId() : null);
        dto.setChildren(new ArrayList<>());
        return dto;
    }

    private CategoryDTO convertToDTO(Category category) {
        CategoryDTO dto = basicDTO(category);
        if (category.getChildren() != null) {
            dto.setChildren(category.getChildren().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList()));
        }
        return dto;
    }
}
