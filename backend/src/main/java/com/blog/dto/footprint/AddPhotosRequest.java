package com.blog.dto.footprint;

import java.util.List;

public class AddPhotosRequest {
    private List<PhotoDTO> photos;

    public List<PhotoDTO> getPhotos() {
        return photos;
    }

    public void setPhotos(List<PhotoDTO> photos) {
        this.photos = photos;
    }
}
