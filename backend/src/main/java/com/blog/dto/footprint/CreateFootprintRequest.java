package com.blog.dto.footprint;

import java.time.LocalDate;
import java.util.List;

public class CreateFootprintRequest {
    private String province;
    private String city;
    private Integer visitCount;
    private LocalDate lastVisited;
    private String tags;
    private List<PhotoDTO> photos;

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
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

    public List<PhotoDTO> getPhotos() {
        return photos;
    }

    public void setPhotos(List<PhotoDTO> photos) {
        this.photos = photos;
    }
}
