package com.blog.repository;

import com.blog.entity.TravelJourney;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface TravelJourneyRepository extends JpaRepository<TravelJourney, Long> {
    Optional<TravelJourney> findTopByTitleAndStartDateAndEndDateOrderByCreatedAtDescIdDesc(
            String title,
            LocalDate startDate,
            LocalDate endDate
    );
}
