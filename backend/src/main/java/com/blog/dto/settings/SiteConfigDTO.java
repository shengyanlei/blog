package com.blog.dto.settings;

import lombok.Data;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class SiteConfigDTO {

    @Valid
    @NotNull(message = "site is required")
    private Site site;

    @Valid
    @NotNull(message = "about is required")
    private About about;

    @Data
    public static class Site {

        @Valid
        @NotNull(message = "site.meta is required")
        private Meta meta;

        @Valid
        @NotNull(message = "site.brand is required")
        private Brand brand;

        @Valid
        @NotNull(message = "site.profile is required")
        private Profile profile;
    }

    @Data
    public static class Meta {
        @NotBlank(message = "site.meta.title is required")
        private String title;

        @NotBlank(message = "site.meta.subtitle is required")
        private String subtitle;
    }

    @Data
    public static class Brand {
        @NotBlank(message = "site.brand.navName is required")
        private String navName;

        @NotBlank(message = "site.brand.heroEyebrow is required")
        private String heroEyebrow;

        @NotBlank(message = "site.brand.heroTitle is required")
        private String heroTitle;

        @NotBlank(message = "site.brand.heroDescription is required")
        private String heroDescription;

        @NotBlank(message = "site.brand.footerText is required")
        private String footerText;

        @Valid
        @NotNull(message = "site.brand.navLabels is required")
        private NavLabels navLabels;
    }

    @Data
    public static class NavLabels {
        @NotBlank(message = "site.brand.navLabels.home is required")
        private String home;

        @NotBlank(message = "site.brand.navLabels.about is required")
        private String about;

        @NotBlank(message = "site.brand.navLabels.archive is required")
        private String archive;

        @NotBlank(message = "site.brand.navLabels.admin is required")
        private String admin;
    }

    @Data
    public static class Profile {
        @NotBlank(message = "site.profile.name is required")
        private String name;

        @NotBlank(message = "site.profile.initials is required")
        private String initials;

        @NotBlank(message = "site.profile.role is required")
        private String role;

        @NotBlank(message = "site.profile.bio is required")
        private String bio;

        @NotBlank(message = "site.profile.location is required")
        private String location;

        @NotBlank(message = "site.profile.expertise is required")
        private String expertise;

        @NotBlank(message = "site.profile.email is required")
        private String email;

        @NotEmpty(message = "site.profile.tags must not be empty")
        private List<@NotBlank(message = "site.profile.tags item must not be blank") String> tags;

        @NotBlank(message = "site.profile.avatarUrl is required")
        private String avatarUrl;
    }

    @Data
    public static class About {
        @NotBlank(message = "about.heading is required")
        private String heading;

        @NotBlank(message = "about.intro is required")
        private String intro;

        @NotBlank(message = "about.ctaArchive is required")
        private String ctaArchive;

        @NotBlank(message = "about.ctaContact is required")
        private String ctaContact;

        @NotBlank(message = "about.focusTitle is required")
        private String focusTitle;

        @Valid
        @NotEmpty(message = "about.focusAreas must not be empty")
        private List<FocusArea> focusAreas;

        @NotBlank(message = "about.principlesTitle is required")
        private String principlesTitle;

        @NotEmpty(message = "about.principles must not be empty")
        private List<@NotBlank(message = "about.principles item must not be blank") String> principles;

        @NotBlank(message = "about.nowTitle is required")
        private String nowTitle;

        @NotEmpty(message = "about.nowList must not be empty")
        private List<@NotBlank(message = "about.nowList item must not be blank") String> nowList;

        @NotBlank(message = "about.timelineTitle is required")
        private String timelineTitle;

        @Valid
        @NotEmpty(message = "about.timeline must not be empty")
        private List<TimelineItem> timeline;
    }

    @Data
    public static class FocusArea {
        @NotBlank(message = "about.focusAreas.title is required")
        private String title;

        @NotBlank(message = "about.focusAreas.description is required")
        private String description;
    }

    @Data
    public static class TimelineItem {
        @NotBlank(message = "about.timeline.year is required")
        private String year;

        @NotBlank(message = "about.timeline.title is required")
        private String title;

        @NotBlank(message = "about.timeline.note is required")
        private String note;
    }
}
