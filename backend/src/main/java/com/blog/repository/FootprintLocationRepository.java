package com.blog.repository;

import com.blog.entity.FootprintLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FootprintLocationRepository extends JpaRepository<FootprintLocation, Long> {
    List<FootprintLocation> findByProvince(String province);

    Optional<FootprintLocation> findByProvinceAndCity(String province, String city);
}
