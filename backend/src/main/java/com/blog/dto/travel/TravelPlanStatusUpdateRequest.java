package com.blog.dto.travel;

import com.blog.entity.TravelPlanStatus;

public class TravelPlanStatusUpdateRequest {
    private TravelPlanStatus status;

    public TravelPlanStatus getStatus() {
        return status;
    }

    public void setStatus(TravelPlanStatus status) {
        this.status = status;
    }
}
