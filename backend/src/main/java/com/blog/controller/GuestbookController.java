package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.guestbook.GuestbookEntryCreateRequest;
import com.blog.dto.guestbook.GuestbookEntryDTO;
import com.blog.service.GuestbookService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/guestbook")
@RequiredArgsConstructor
public class GuestbookController {

    private final GuestbookService guestbookService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<GuestbookEntryDTO>>> getEntries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.success(guestbookService.getPublicEntries(pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GuestbookEntryDTO>> createEntry(
            @Valid @RequestBody GuestbookEntryCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Guestbook entry created", guestbookService.createEntry(request)));
    }
}