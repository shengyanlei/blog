package com.blog.dto.travel;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class JourneyDetailDTO extends JourneySummaryDTO {
    private String content;
    private String companions;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private List<JourneyLocationDTO> locations = new ArrayList<>();
    private List<JourneyPhotoDTO> photos = new ArrayList<>();

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCompanions() {
        return companions;
    }

    public void setCompanions(String companions) {
        this.companions = companions;
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

    public List<JourneyLocationDTO> getLocations() {
        return locations;
    }

    public void setLocations(List<JourneyLocationDTO> locations) {
        this.locations = locations;
    }

    public List<JourneyPhotoDTO> getPhotos() {
        return photos;
    }

    public void setPhotos(List<JourneyPhotoDTO> photos) {
        this.photos = photos;
    }
}
