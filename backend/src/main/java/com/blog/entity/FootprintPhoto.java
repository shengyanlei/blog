package com.blog.entity;

import javax.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "footprint_photo", indexes = {
        @Index(name = "idx_fp_location", columnList = "location_id")
})
public class FootprintPhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private FootprintLocation location;

    @Column(nullable = false)
    private String url;

    private LocalDate shotAt;

    private String trip;

    @Column(length = 500)
    private String note;

    private String tags;

    private Boolean cover = false;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public FootprintLocation getLocation() {
        return location;
    }

    public void setLocation(FootprintLocation location) {
        this.location = location;
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
