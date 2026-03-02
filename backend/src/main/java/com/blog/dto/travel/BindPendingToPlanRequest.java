package com.blog.dto.travel;

import java.util.List;

public class BindPendingToPlanRequest {
    private Long planId;
    private List<Long> photoIds;

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }

    public List<Long> getPhotoIds() {
        return photoIds;
    }

    public void setPhotoIds(List<Long> photoIds) {
        this.photoIds = photoIds;
    }
}
