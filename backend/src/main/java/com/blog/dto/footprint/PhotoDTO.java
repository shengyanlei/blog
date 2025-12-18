package com.blog.dto.footprint;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;

public class PhotoDTO {
    private Long id;
    private String url;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate shotAt;
    private String trip;
    private String note;
    private String tags;
    private Boolean cover;

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
}
