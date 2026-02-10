package com.blog.dto.article;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Notion OAuth connection status.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotionConnectionStatusResponse {

    private boolean connected;

    private String workspaceName;

    private String ownerType;

    private boolean oauthConfigured;

    private String oauthRedirectUri;

    private boolean integrationEnabled;

    private boolean publicImportEnabled;
}
