package com.blog.dto.settings;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SiteConfigResponse {
    private SiteConfigDTO config;
    private String sourcePath;
    private String lastModified;
    private boolean writable;
    private String backupPath;
}
