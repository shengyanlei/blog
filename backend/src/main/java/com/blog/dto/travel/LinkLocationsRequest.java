package com.blog.dto.travel;

import java.util.ArrayList;
import java.util.List;

public class LinkLocationsRequest {
    private List<Long> locationIds = new ArrayList<>();

    public List<Long> getLocationIds() {
        return locationIds;
    }

    public void setLocationIds(List<Long> locationIds) {
        this.locationIds = locationIds;
    }
}
