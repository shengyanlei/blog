package com.blog.service.impl;

import com.blog.dto.guestbook.GuestbookEntryCreateRequest;
import com.blog.dto.guestbook.GuestbookEntryDTO;
import com.blog.entity.GuestbookEntry;
import com.blog.repository.GuestbookEntryRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuestbookServiceImplTest {

    @Mock
    private GuestbookEntryRepository guestbookEntryRepository;

    @InjectMocks
    private GuestbookServiceImpl service;

    @Test
    void getPublicEntries_shouldUseFixedSort() {
        GuestbookEntry entry = buildEntry(1L, "Guest-123456", "Beijing", "hello");
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        when(guestbookEntryRepository.findApprovedEntries(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entry)));

        Page<GuestbookEntryDTO> result = service.getPublicEntries(PageRequest.of(2, 12));

        assertEquals(1, result.getContent().size());
        verify(guestbookEntryRepository).findApprovedEntries(pageableCaptor.capture());
        assertEquals(2, pageableCaptor.getValue().getPageNumber());
        assertEquals(12, pageableCaptor.getValue().getPageSize());
        assertNotNull(pageableCaptor.getValue().getSort().getOrderFor("createdAt"));
        assertNotNull(pageableCaptor.getValue().getSort().getOrderFor("id"));
    }

    @Test
    void createEntry_shouldGenerateAnonymousAuthorWhenNameIsBlank() {
        GuestbookEntryCreateRequest request = new GuestbookEntryCreateRequest();
        request.setAuthorName("   ");
        request.setLocation("   ");
        request.setContent(" hello world ");

        when(guestbookEntryRepository.save(any(GuestbookEntry.class))).thenAnswer(invocation -> {
            GuestbookEntry entry = invocation.getArgument(0);
            entry.setId(9L);
            entry.setCreatedAt(LocalDateTime.of(2026, 3, 7, 12, 0));
            return entry;
        });

        GuestbookEntryDTO result = service.createEntry(request);

        assertEquals(9L, result.getId());
        assertEquals("hello world", result.getContent());
        assertNull(result.getLocation());
        Assertions.assertTrue(result.getAuthorName().startsWith("Guest-"));
    }

    private static GuestbookEntry buildEntry(Long id, String authorName, String location, String content) {
        GuestbookEntry entry = new GuestbookEntry();
        entry.setId(id);
        entry.setAuthorName(authorName);
        entry.setLocation(location);
        entry.setContent(content);
        entry.setStatus(GuestbookEntry.STATUS_APPROVED);
        entry.setCreatedAt(LocalDateTime.of(2026, 3, 7, 8, 0));
        return entry;
    }
}