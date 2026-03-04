package com.blog.repository;

import com.blog.entity.UserTabPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserTabPermissionRepository extends JpaRepository<UserTabPermission, Long> {

    List<UserTabPermission> findByUserIdOrderByTabCodeAsc(Long userId);

    void deleteByUserId(Long userId);
}
