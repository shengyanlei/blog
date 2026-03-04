package com.blog.dto.travel;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public class CoverMaterialDTO {
    private Long photoId;
    private String url;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime uploadedAt;
    private boolean usedAsCover;

    public Long getPhotoId() {
        return photoId;
    }

    public void setPhotoId(Long photoId) {
        this.photoId = photoId;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public boolean isUsedAsCover() {
        return usedAsCover;
    }

    public void setUsedAsCover(boolean usedAsCover) {
        this.usedAsCover = usedAsCover;
    }
}
