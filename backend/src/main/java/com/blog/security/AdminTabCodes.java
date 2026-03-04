package com.blog.security;

import java.util.List;
import java.util.Set;

/**
 * Admin sidebar tab codes.
 */
public final class AdminTabCodes {

    public static final String DASHBOARD = "DASHBOARD";
    public static final String ARTICLES = "ARTICLES";
    public static final String WRITE = "WRITE";
    public static final String UPLOAD = "UPLOAD";
    public static final String COMMENTS = "COMMENTS";
    public static final String TAGS = "TAGS";
    public static final String CATEGORIES = "CATEGORIES";
    public static final String FOOTPRINTS = "FOOTPRINTS";
    public static final String MATERIALS = "MATERIALS";
    public static final String COVER_MATERIALS = "COVER_MATERIALS";
    public static final String SETTINGS = "SETTINGS";
    public static final String ACCOUNTS = "ACCOUNTS";

    public static final List<String> OWNER_TABS = List.of(
            DASHBOARD,
            ARTICLES,
            WRITE,
            UPLOAD,
            COMMENTS,
            TAGS,
            CATEGORIES,
            FOOTPRINTS,
            MATERIALS,
            COVER_MATERIALS,
            SETTINGS,
            ACCOUNTS
    );

    public static final List<String> ASSIGNABLE_MEMBER_TABS = List.of(
            DASHBOARD,
            ARTICLES,
            WRITE,
            UPLOAD,
            COMMENTS,
            TAGS,
            CATEGORIES,
            FOOTPRINTS,
            MATERIALS,
            COVER_MATERIALS
    );

    public static final Set<String> ALL_TABS = Set.copyOf(OWNER_TABS);

    private AdminTabCodes() {
    }
}
