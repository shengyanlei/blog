package com.blog.repository;

import com.blog.entity.FootprintPhoto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface FootprintPhotoRepository extends JpaRepository<FootprintPhoto, Long> {
    List<FootprintPhoto> findByLocationId(Long locationId);

    List<FootprintPhoto> findByIdIn(Collection<Long> ids);

    List<FootprintPhoto> findBySourceTypeOrderByCreatedAtDescIdDesc(String sourceType);

    Page<FootprintPhoto> findBySourceType(String sourceType, Pageable pageable);

    @Query("SELECT p FROM FootprintPhoto p " +
            "LEFT JOIN p.location l " +
            "WHERE p.sourceType = :sourceType AND (" +
            "(:scope = 'PENDING' AND p.location IS NULL) OR " +
            "(:scope = 'BOUND' AND p.location IS NOT NULL) OR " +
            "(:scope = 'ALL')" +
            ") " +
            "AND (:keyword IS NULL OR LOWER(CONCAT(" +
            "COALESCE(l.country, ''), ' ', " +
            "COALESCE(l.province, ''), ' ', " +
            "COALESCE(l.city, ''), ' ', " +
            "COALESCE(l.addressDetail, '')" +
            ")) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:monthStart IS NULL OR p.createdAt >= :monthStart) " +
            "AND (:monthEnd IS NULL OR p.createdAt < :monthEnd) " +
            "AND (:hasShotAt IS NULL OR (:hasShotAt = true AND p.shotAt IS NOT NULL) OR (:hasShotAt = false AND p.shotAt IS NULL))")
    Page<FootprintPhoto> findPendingAssets(
            @Param("sourceType") String sourceType,
            @Param("scope") String scope,
            @Param("keyword") String keyword,
            @Param("monthStart") LocalDateTime monthStart,
            @Param("monthEnd") LocalDateTime monthEnd,
            @Param("hasShotAt") Boolean hasShotAt,
            Pageable pageable
    );
}
