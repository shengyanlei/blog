package com.blog.service.notion;

import java.util.Locale;

public enum NotionAuthMode {
    AUTO,
    INTEGRATION,
    OAUTH,
    PUBLIC;

    public static NotionAuthMode from(String raw) {
        if (raw == null || raw.isBlank()) {
            return AUTO;
        }
        try {
            return NotionAuthMode.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return AUTO;
        }
    }
}
