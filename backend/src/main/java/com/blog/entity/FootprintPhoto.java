package com.blog.entity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import javax.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "footprint_photo")
public class FootprintPhoto {
    public static final String SOURCE_TYPE_COVER_MATERIAL = "COVER_MATERIAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String url;

    private LocalDate shotAt;

    private String trip;

    @Column(length = 500)
    private String note;

    private String tags;

    private Boolean cover = false;

    @Column(name = "source_type", nullable = false, length = 30)
    private String sourceType = SOURCE_TYPE_COVER_MATERIAL;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (sourceType == null || sourceType.trim().isEmpty()) {
            sourceType = SOURCE_TYPE_COVER_MATERIAL;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public LocalDate getShotAt() {
        return shotAt;
    }

    public void setShotAt(LocalDate shotAt) {
        this.shotAt = shotAt;
    }

    public String getTrip() {
        return trip;
    }

    public void setTrip(String trip) {
        this.trip = trip;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public Boolean getCover() {
        return cover;
    }

    public void setCover(Boolean cover) {
        this.cover = cover;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
