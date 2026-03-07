package com.blog.repository;

import com.blog.entity.GuestbookEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface GuestbookEntryRepository extends JpaRepository<GuestbookEntry, Long> {

    @Query("SELECT g FROM GuestbookEntry g WHERE g.status = 'APPROVED' ORDER BY g.createdAt DESC, g.id DESC")
    Page<GuestbookEntry> findApprovedEntries(Pageable pageable);
}