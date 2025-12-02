package com.blog.service.impl;

import com.blog.dto.tag.TagDTO;
import com.blog.dto.tag.TagRequest;
import com.blog.entity.Tag;
import com.blog.exception.BusinessException;
import com.blog.repository.TagRepository;
import com.blog.service.TagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 标签服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;

    @Override
    public List<TagDTO> getAllTags() {
        log.info("获取所有标签");
        return tagRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public TagDTO getTagById(Long id) {
        log.info("获取标签: {}", id);
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("标签不存在"));
        return convertToDTO(tag);
    }

    @Override
    @Transactional
    public TagDTO createTag(TagRequest request) {
        log.info("创建标签: {}", request.getName());

        // 检查名称是否已存在
        if (tagRepository.findByName(request.getName()).isPresent()) {
            throw new BusinessException("标签名称已存在");
        }

        Tag tag = new Tag();
        tag.setName(request.getName());

        Tag saved = tagRepository.save(tag);
        log.info("标签创建成功: {}", saved.getId());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteTag(Long id) {
        log.info("删除标签: {}", id);

        if (!tagRepository.existsById(id)) {
            throw new EntityNotFoundException("标签不存在");
        }

        tagRepository.deleteById(id);
    }

    /**
     * 将Entity转换为DTO
     */
    private TagDTO convertToDTO(Tag tag) {
        return new TagDTO(tag.getId(), tag.getName());
    }
}
