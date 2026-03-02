package com.blog.service;

import com.blog.dto.travel.JourneyDetailDTO;
import com.blog.dto.travel.JourneySummaryDTO;
import com.blog.dto.travel.JourneyUpsertRequest;
import com.blog.dto.travel.LinkLocationsRequest;
import com.blog.dto.travel.PendingAssetPhotoDTO;
import com.blog.dto.travel.UnassignedLocationAssetDTO;
import com.blog.dto.travel.BindPendingToPlanRequest;
import com.blog.dto.travel.BindPendingToJourneyRequest;
import com.blog.dto.travel.BindPendingResultDTO;
import com.blog.dto.travel.BindPendingToAddressRequest;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TravelJourneyService {
    List<JourneySummaryDTO> getJourneys(Integer year, String keyword, String tag);

    List<Integer> getJourneyYears();

    JourneyDetailDTO getJourneyDetail(Long id);

    JourneyDetailDTO createJourney(JourneyUpsertRequest request);

    JourneyDetailDTO updateJourney(Long id, JourneyUpsertRequest request);

    void deleteJourney(Long id);

    JourneyDetailDTO linkLocations(Long journeyId, LinkLocationsRequest request);

    JourneyDetailDTO unlinkLocation(Long journeyId, Long locationId);

    List<UnassignedLocationAssetDTO> getUnassignedAssets();

    List<PendingAssetPhotoDTO> uploadPendingAssets(MultipartFile[] files);

    Page<PendingAssetPhotoDTO> getPendingAssets(int page, int size, String scope, String keyword, String month, Boolean hasShotAt);

    BindPendingResultDTO bindPendingAssetsToPlan(BindPendingToPlanRequest request);

    BindPendingResultDTO bindPendingAssetsToJourney(BindPendingToJourneyRequest request);

    BindPendingResultDTO bindPendingAssetsToAddress(BindPendingToAddressRequest request);
}
