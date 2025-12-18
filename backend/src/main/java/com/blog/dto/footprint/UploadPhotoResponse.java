package com.blog.dto.footprint;

public class UploadPhotoResponse {
    private String url;
    private String province;
    private String city;
    private String shotAt;

    public UploadPhotoResponse() {}

    public UploadPhotoResponse(String url, String province, String city, String shotAt) {
        this.url = url;
        this.province = province;
        this.city = city;
        this.shotAt = shotAt;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
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

    public String getShotAt() {
        return shotAt;
    }

    public void setShotAt(String shotAt) {
        this.shotAt = shotAt;
    }
}
