package com.blog.service;

import com.blog.dto.settings.ChangePasswordRequest;
import com.blog.dto.settings.AdminProfileResponse;
import com.blog.dto.settings.SiteConfigDTO;
import com.blog.dto.settings.SiteConfigResponse;

public interface SettingsService {

    void changePassword(String username, ChangePasswordRequest request);

    AdminProfileResponse getProfile(String username);

    SiteConfigResponse getSiteConfig();

    SiteConfigResponse updateSiteConfig(SiteConfigDTO request);
}
