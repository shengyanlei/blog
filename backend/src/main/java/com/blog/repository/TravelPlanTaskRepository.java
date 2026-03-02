package com.blog.repository;

import com.blog.entity.TravelPlanTask;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelPlanTaskRepository extends JpaRepository<TravelPlanTask, Long> {
}
