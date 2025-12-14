package com.blog.repository;

import com.blog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 分类Repository
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * 根据名称查找分类
     */
    Optional<Category> findByName(String name);

    /**
     * 根据 slugPath 查找分类
     */
    Optional<Category> findBySlugPath(String slugPath);

    /**
     * 查询某个父级下的全部子分类
     */
    List<Category> findByParentId(Long parentId);
}
