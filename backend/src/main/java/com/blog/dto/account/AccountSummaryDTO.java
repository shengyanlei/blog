package com.blog.dto.account;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AccountSummaryDTO {
    private Long id;
    private String username;
    private String email;
    private String role;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private List<String> tabCodes;
}
