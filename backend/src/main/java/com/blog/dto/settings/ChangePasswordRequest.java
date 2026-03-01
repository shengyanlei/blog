package com.blog.dto.settings;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Size(min = 8, max = 128, message = "New password length must be between 8 and 128")
    private String newPassword;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
}
