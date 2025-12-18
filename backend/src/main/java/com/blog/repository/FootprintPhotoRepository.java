package com.blog.repository;

import com.blog.entity.FootprintPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FootprintPhotoRepository extends JpaRepository<FootprintPhoto, Long> {
    List<FootprintPhoto> findByLocationId(Long locationId);
}
