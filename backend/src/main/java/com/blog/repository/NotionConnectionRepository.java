package com.blog.repository;

import com.blog.entity.NotionConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotionConnectionRepository extends JpaRepository<NotionConnection, Long> {

    Optional<NotionConnection> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
