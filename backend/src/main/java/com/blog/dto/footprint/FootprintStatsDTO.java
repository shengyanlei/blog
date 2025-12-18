package com.blog.dto.footprint;

public class FootprintStatsDTO {
    private long provinceCount;
    private long cityCount;
    private long photoCount;
    private String topCity;

    public FootprintStatsDTO() {}

    public FootprintStatsDTO(long provinceCount, long cityCount, long photoCount, String topCity) {
        this.provinceCount = provinceCount;
        this.cityCount = cityCount;
        this.photoCount = photoCount;
        this.topCity = topCity;
    }

    public long getProvinceCount() {
        return provinceCount;
    }

    public void setProvinceCount(long provinceCount) {
        this.provinceCount = provinceCount;
    }

    public long getCityCount() {
        return cityCount;
    }

    public void setCityCount(long cityCount) {
        this.cityCount = cityCount;
    }

    public long getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(long photoCount) {
        this.photoCount = photoCount;
    }

    public String getTopCity() {
        return topCity;
    }

    public void setTopCity(String topCity) {
        this.topCity = topCity;
    }
}
