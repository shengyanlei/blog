package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.account.*;
import com.blog.service.AccountAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
@Validated
public class AccountAdminController {

    private final AccountAdminService accountAdminService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<List<AccountSummaryDTO>>> list(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(accountAdminService.listAccounts(principal.getName())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<AccountSummaryDTO>> create(
            @Valid @RequestBody AccountCreateRequest request,
            Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(accountAdminService.createAccount(principal.getName(), request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<AccountSummaryDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody AccountUpdateRequest request,
            Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(accountAdminService.updateAccount(principal.getName(), id, request)));
    }

    @PutMapping("/{id}/enabled")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<AccountSummaryDTO>> updateEnabled(
            @PathVariable Long id,
            @Valid @RequestBody AccountEnabledUpdateRequest request,
            Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                accountAdminService.updateAccountEnabled(principal.getName(), id, Boolean.TRUE.equals(request.getEnabled()))
        ));
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody AccountPasswordResetRequest request,
            Principal principal) {
        accountAdminService.resetPassword(principal.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Password updated", null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Principal principal) {
        accountAdminService.deleteAccount(principal.getName(), id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/permission-options")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<List<AccountPermissionOptionDTO>>> permissionOptions(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(accountAdminService.getPermissionOptions(principal.getName())));
    }
}
