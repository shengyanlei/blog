package com.blog.service.impl;

import com.blog.dto.guestbook.GuestbookEntryCreateRequest;
import com.blog.dto.guestbook.GuestbookEntryDTO;
import com.blog.entity.GuestbookEntry;
import com.blog.repository.GuestbookEntryRepository;
import com.blog.service.GuestbookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuestbookServiceImpl implements GuestbookService {

    private static final Sort PUBLIC_SORT = Sort.by(
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id")
    );

    private final GuestbookEntryRepository guestbookEntryRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<GuestbookEntryDTO> getPublicEntries(Pageable pageable) {
        Pageable resolvedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), PUBLIC_SORT);
        return guestbookEntryRepository.findApprovedEntries(resolvedPageable)
                .map(this::convertToDTO);
    }

    @Override
    @Transactional
    public GuestbookEntryDTO createEntry(GuestbookEntryCreateRequest request) {
        GuestbookEntry entry = new GuestbookEntry();
        entry.setAuthorName(resolveAuthorName(request.getAuthorName()));
        entry.setLocation(normalizeOptionalText(request.getLocation()));
        entry.setContent(request.getContent().trim());
        entry.setStatus(GuestbookEntry.STATUS_APPROVED);

        GuestbookEntry saved = guestbookEntryRepository.save(entry);
        log.info("Guestbook entry created: id={}", saved.getId());
        return convertToDTO(saved);
    }

    private GuestbookEntryDTO convertToDTO(GuestbookEntry entry) {
        return new GuestbookEntryDTO(
                entry.getId(),
                entry.getAuthorName(),
                entry.getLocation(),
                entry.getContent(),
                entry.getStatus(),
                entry.getCreatedAt()
        );
    }

    private String resolveAuthorName(String authorName) {
        String normalized = normalizeOptionalText(authorName);
        if (StringUtils.hasText(normalized)) {
            return normalized;
        }
        return "Guest-" + ThreadLocalRandom.current().nextInt(100000, 1000000);
    }

    private String normalizeOptionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}