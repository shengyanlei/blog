package com.blog.dto.travel;

public class BindPendingResultDTO {
    private int boundCount;
    private int reboundCount;
    private int skippedCount;
    private Long locationId;
    private String country;
    private String province;
    private String city;
    private String addressDetail;
    private String fullAddress;

    public int getBoundCount() {
        return boundCount;
    }

    public void setBoundCount(int boundCount) {
        this.boundCount = boundCount;
    }

    public int getReboundCount() {
        return reboundCount;
    }

    public void setReboundCount(int reboundCount) {
        this.reboundCount = reboundCount;
    }

    public int getSkippedCount() {
        return skippedCount;
    }

    public void setSkippedCount(int skippedCount) {
        this.skippedCount = skippedCount;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

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

    public String getAddressDetail() {
        return addressDetail;
    }

    public void setAddressDetail(String addressDetail) {
        this.addressDetail = addressDetail;
    }

    public String getFullAddress() {
        return fullAddress;
    }

    public void setFullAddress(String fullAddress) {
        this.fullAddress = fullAddress;
    }
}
