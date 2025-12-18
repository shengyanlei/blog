package com.blog.service;

import com.blog.dto.footprint.*;

import java.util.List;

public interface FootprintService {
    List<ProvinceSummaryDTO> getProvinceSummaries();

    List<CitySummaryDTO> getCitiesByProvince(String province);

    CityDetailDTO getCityDetail(Long id);

    CityDetailDTO createFootprint(CreateFootprintRequest request);

    CityDetailDTO addPhotos(Long id, AddPhotosRequest request);

    void deletePhoto(Long photoId);

    PhotoDTO reassignPhoto(Long photoId, ReassignPhotoRequest request);

    PhotoDTO updatePhotoNote(Long photoId, UpdatePhotoNoteRequest request);

    FootprintStatsDTO getStats();

    UploadPhotoResponse uploadAndParseLocation(org.springframework.web.multipart.MultipartFile file);
}
