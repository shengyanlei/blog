package com.blog.service;

import com.blog.dto.tag.TagDTO;
import com.blog.dto.tag.TagRequest;

import java.util.List;

/**
 * 标签服务接口
 */
public interface TagService {

    /**
     * 获取所有标签
     */
    List<TagDTO> getAllTags();

    /**
     * 根据ID获取标签
     */
    TagDTO getTagById(Long id);

    /**
     * 创建标签
     */
    TagDTO createTag(TagRequest request);

    /**
     * 删除标签
     */
    void deleteTag(Long id);
}
