package com.blog.dto.guestbook;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuestbookEntryDTO {

    private Long id;
    private String authorName;
    private String location;
    private String content;
    private String status;
    private LocalDateTime createdAt;
}