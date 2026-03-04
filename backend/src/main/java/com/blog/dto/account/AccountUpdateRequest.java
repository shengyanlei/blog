package com.blog.dto.account;

import lombok.Data;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import java.util.List;

@Data
public class AccountUpdateRequest {
    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    private Boolean enabled;

    private List<String> tabCodes;
}
