package com.blog.service;

import com.blog.dto.guestbook.GuestbookEntryCreateRequest;
import com.blog.dto.guestbook.GuestbookEntryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GuestbookService {

    Page<GuestbookEntryDTO> getPublicEntries(Pageable pageable);

    GuestbookEntryDTO createEntry(GuestbookEntryCreateRequest request);
}