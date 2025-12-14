package com.blog.dto.auth;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * Login request DTO.
 */
@Data
public class LoginRequest {

    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}
