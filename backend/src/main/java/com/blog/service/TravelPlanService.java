package com.blog.service;

import com.blog.dto.travel.CompleteAndArchiveRequest;
import com.blog.dto.travel.TravelPlanDTO;
import com.blog.dto.travel.TravelPlanUpsertRequest;
import com.blog.entity.TravelPlanStatus;

import java.util.List;

public interface TravelPlanService {
    List<TravelPlanDTO> getPlans(String status, String month);

    TravelPlanDTO createPlan(TravelPlanUpsertRequest request);

    TravelPlanDTO updatePlan(Long id, TravelPlanUpsertRequest request);

    TravelPlanDTO updateStatus(Long id, TravelPlanStatus status);

    void deletePlan(Long id);

    TravelPlanDTO completeAndArchive(Long id, CompleteAndArchiveRequest request);
}
