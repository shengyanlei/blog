package com.blog.dto.travel;

import com.blog.entity.TravelPlanPriority;
import com.blog.entity.TravelPlanStatus;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class TravelPlanUpsertRequest {
    private String title;
    private String province;
    private String city;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;
    private TravelPlanStatus status;
    private TravelPlanPriority priority;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private String tags;
    private String notes;
    private Long linkedJourneyId;
    private List<TravelPlanTaskDTO> tasks = new ArrayList<>();

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public TravelPlanStatus getStatus() {
        return status;
    }

    public void setStatus(TravelPlanStatus status) {
        this.status = status;
    }

    public TravelPlanPriority getPriority() {
        return priority;
    }

    public void setPriority(TravelPlanPriority priority) {
        this.priority = priority;
    }

    public BigDecimal getBudgetMin() {
        return budgetMin;
    }

    public void setBudgetMin(BigDecimal budgetMin) {
        this.budgetMin = budgetMin;
    }

    public BigDecimal getBudgetMax() {
        return budgetMax;
    }

    public void setBudgetMax(BigDecimal budgetMax) {
        this.budgetMax = budgetMax;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getLinkedJourneyId() {
        return linkedJourneyId;
    }

    public void setLinkedJourneyId(Long linkedJourneyId) {
        this.linkedJourneyId = linkedJourneyId;
    }

    public List<TravelPlanTaskDTO> getTasks() {
        return tasks;
    }

    public void setTasks(List<TravelPlanTaskDTO> tasks) {
        this.tasks = tasks;
    }
}
