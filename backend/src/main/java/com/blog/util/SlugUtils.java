package com.blog.util;

import org.springframework.util.StringUtils;

import java.text.Normalizer;

public final class SlugUtils {

    private SlugUtils() {
    }

    public static String slugify(String input, String fallback) {
        if (!StringUtils.hasText(input)) {
            return fallback;
        }

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        String cleaned = normalized.trim().toLowerCase()
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");

        return StringUtils.hasText(cleaned) ? cleaned : fallback;
    }
}
