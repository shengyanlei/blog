package com.blog.service;

import com.blog.dto.account.*;

import java.util.List;

public interface AccountAdminService {

    List<AccountSummaryDTO> listAccounts(String operatorUsername);

    AccountSummaryDTO createAccount(String operatorUsername, AccountCreateRequest request);

    AccountSummaryDTO updateAccount(String operatorUsername, Long userId, AccountUpdateRequest request);

    AccountSummaryDTO updateAccountEnabled(String operatorUsername, Long userId, boolean enabled);

    void resetPassword(String operatorUsername, Long userId, AccountPasswordResetRequest request);

    void deleteAccount(String operatorUsername, Long userId);

    List<AccountPermissionOptionDTO> getPermissionOptions(String operatorUsername);
}
