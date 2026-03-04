package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.settings.AdminProfileResponse;
import com.blog.dto.settings.ChangePasswordRequest;
import com.blog.dto.settings.SiteConfigDTO;
import com.blog.dto.settings.SiteConfigResponse;
import com.blog.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.security.Principal;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@Validated
public class AdminSettingsController {

    private final SettingsService settingsService;

    @PutMapping("/password")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal) {
        settingsService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Password updated. Please log in again.", null));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<AdminProfileResponse>> getProfile(Principal principal) {
        AdminProfileResponse response = settingsService.getProfile(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/site-config")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<SiteConfigResponse>> getSiteConfig() {
        SiteConfigResponse response = settingsService.getSiteConfig();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/site-config")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<SiteConfigResponse>> updateSiteConfig(
            @Valid @RequestBody SiteConfigDTO request) {
        SiteConfigResponse response = settingsService.updateSiteConfig(request);
        return ResponseEntity.ok(ApiResponse.success("Site config saved", response));
    }
}
