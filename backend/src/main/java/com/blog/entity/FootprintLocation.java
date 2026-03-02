package com.blog.entity;

import javax.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "footprint_location", indexes = {
        @Index(name = "idx_fp_country", columnList = "country"),
        @Index(name = "idx_fp_province", columnList = "province"),
        @Index(name = "idx_fp_city", columnList = "city"),
        @Index(name = "idx_fp_country_province_city", columnList = "country,province,city"),
        @Index(name = "idx_fp_journey", columnList = "journey_id")
})
public class FootprintLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String country = "\u4E2D\u56FD";

    @Column(nullable = false)
    private String province;

    @Column(nullable = false)
    private String city;

    private Integer visitCount = 0;

    private Integer photoCount = 0;

    private LocalDate lastVisited;

    private String tags;

    private String coverUrl;

    @Column(name = "address_detail")
    private String addressDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id")
    private TravelJourney journey;

    @OneToMany(mappedBy = "location", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FootprintPhoto> photos = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public Integer getVisitCount() {
        return visitCount;
    }

    public void setVisitCount(Integer visitCount) {
        this.visitCount = visitCount;
    }

    public Integer getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(Integer photoCount) {
        this.photoCount = photoCount;
    }

    public LocalDate getLastVisited() {
        return lastVisited;
    }

    public void setLastVisited(LocalDate lastVisited) {
        this.lastVisited = lastVisited;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getAddressDetail() {
        return addressDetail;
    }

    public void setAddressDetail(String addressDetail) {
        this.addressDetail = addressDetail;
    }

    public List<FootprintPhoto> getPhotos() {
        return photos;
    }

    public void setPhotos(List<FootprintPhoto> photos) {
        this.photos = photos;
    }

    public TravelJourney getJourney() {
        return journey;
    }

    public void setJourney(TravelJourney journey) {
        this.journey = journey;
    }
}

