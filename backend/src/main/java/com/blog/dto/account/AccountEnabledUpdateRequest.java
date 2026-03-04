package com.blog.dto.account;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class AccountEnabledUpdateRequest {

    @NotNull
    private Boolean enabled;
}

