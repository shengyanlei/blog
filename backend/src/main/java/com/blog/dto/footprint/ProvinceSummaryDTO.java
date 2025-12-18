package com.blog.dto.footprint;

import java.time.LocalDate;

public class ProvinceSummaryDTO {
    private String province;
    private long visitedCities;
    private long visitedCitiesWithPhotos;
    private long visitCount;
    private long photoCount;
    private LocalDate lastVisited;

    public ProvinceSummaryDTO() {}

    public ProvinceSummaryDTO(String province, long visitedCities, long visitedCitiesWithPhotos, long visitCount, long photoCount, LocalDate lastVisited) {
        this.province = province;
        this.visitedCities = visitedCities;
        this.visitedCitiesWithPhotos = visitedCitiesWithPhotos;
        this.visitCount = visitCount;
        this.photoCount = photoCount;
        this.lastVisited = lastVisited;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public long getVisitedCities() {
        return visitedCities;
    }

    public void setVisitedCities(long visitedCities) {
        this.visitedCities = visitedCities;
    }

    public long getVisitedCitiesWithPhotos() {
        return visitedCitiesWithPhotos;
    }

    public void setVisitedCitiesWithPhotos(long visitedCitiesWithPhotos) {
        this.visitedCitiesWithPhotos = visitedCitiesWithPhotos;
    }

    public long getVisitCount() {
        return visitCount;
    }

    public void setVisitCount(long visitCount) {
        this.visitCount = visitCount;
    }

    public long getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(long photoCount) {
        this.photoCount = photoCount;
    }

    public LocalDate getLastVisited() {
        return lastVisited;
    }

    public void setLastVisited(LocalDate lastVisited) {
        this.lastVisited = lastVisited;
    }
}
