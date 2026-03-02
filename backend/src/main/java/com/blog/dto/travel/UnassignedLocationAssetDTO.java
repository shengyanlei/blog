package com.blog.dto.travel;

import java.util.ArrayList;
import java.util.List;

public class UnassignedLocationAssetDTO {
    private Long locationId;
    private String country;
    private String province;
    private String city;
    private String addressDetail;
    private String fullAddress;
    private Integer photoCount;
    private List<JourneyPhotoDTO> photos = new ArrayList<>();

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

    public Integer getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(Integer photoCount) {
        this.photoCount = photoCount;
    }

    public List<JourneyPhotoDTO> getPhotos() {
        return photos;
    }

    public void setPhotos(List<JourneyPhotoDTO> photos) {
        this.photos = photos;
    }
}
