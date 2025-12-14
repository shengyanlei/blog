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
 * Tag service implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;

    @Override
    public List<TagDTO> getAllTags() {
        log.info("Fetching all tags");
        return tagRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public TagDTO getTagById(Long id) {
        log.info("Fetching tag {}", id);
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tag not found"));
        return convertToDTO(tag);
    }

    @Override
    @Transactional
    public TagDTO createTag(TagRequest request) {
        log.info("Creating tag: {}", request.getName());

        tagRepository.findByName(request.getName())
                .ifPresent(existing -> {
                    throw new BusinessException("Tag name already exists");
                });

        Tag tag = new Tag();
        tag.setName(request.getName());

        Tag saved = tagRepository.save(tag);
        log.info("Tag created with id {}", saved.getId());
        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteTag(Long id) {
        log.info("Deleting tag {}", id);

        if (!tagRepository.existsById(id)) {
            throw new EntityNotFoundException("Tag not found");
        }

        tagRepository.deleteById(id);
    }

    private TagDTO convertToDTO(Tag tag) {
        return new TagDTO(tag.getId(), tag.getName());
    }
}
