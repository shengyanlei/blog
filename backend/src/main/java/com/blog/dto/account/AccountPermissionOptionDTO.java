package com.blog.dto.account;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AccountPermissionOptionDTO {
    private String code;
    private String label;
    private String description;
}
