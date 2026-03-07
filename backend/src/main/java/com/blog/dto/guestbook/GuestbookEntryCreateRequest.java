package com.blog.dto.guestbook;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class GuestbookEntryCreateRequest {

    @Size(max = 40, message = "authorName must be 40 characters or fewer")
    private String authorName;

    @Size(max = 80, message = "location must be 80 characters or fewer")
    private String location;

    @NotBlank(message = "content is required")
    @Size(max = 320, message = "content must be 320 characters or fewer")
    private String content;
}