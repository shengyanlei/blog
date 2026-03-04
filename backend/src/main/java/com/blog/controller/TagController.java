package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.tag.TagDTO;
import com.blog.dto.tag.TagRequest;
import com.blog.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagDTO>>> getAllTags() {
        List<TagDTO> tags = tagService.getAllTags();
        return ResponseEntity.ok(ApiResponse.success(tags));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TagDTO>> getTagById(@PathVariable Long id) {
        TagDTO tag = tagService.getTagById(id);
        return ResponseEntity.ok(ApiResponse.success(tag));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<TagDTO>> createTag(@Valid @RequestBody TagRequest request) {
        TagDTO tag = tagService.createTag(request);
        return ResponseEntity.ok(ApiResponse.success("Created", tag));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
