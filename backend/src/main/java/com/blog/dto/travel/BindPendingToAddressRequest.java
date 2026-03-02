package com.blog.dto.travel;

import java.util.List;

public class BindPendingToAddressRequest {
    private List<Long> photoIds;
    private AddressPayload address;

    public List<Long> getPhotoIds() {
        return photoIds;
    }

    public void setPhotoIds(List<Long> photoIds) {
        this.photoIds = photoIds;
    }

    public AddressPayload getAddress() {
        return address;
    }

    public void setAddress(AddressPayload address) {
        this.address = address;
    }

    public static class AddressPayload {
        private String country;
        private String province;
        private String city;
        private String addressDetail;

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
    }
}

