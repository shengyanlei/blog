package com.blog.service.impl;

import com.blog.entity.User;
import com.blog.entity.UserTabPermission;
import com.blog.repository.UserTabPermissionRepository;
import com.blog.security.AdminTabCodes;
import com.blog.service.UserPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPermissionServiceImpl implements UserPermissionService {

    private final UserTabPermissionRepository userTabPermissionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<String> resolveVisibleTabs(User user) {
        if (user == null) {
            return List.of();
        }
        String role = normalizeRole(user.getRole());
        if ("OWNER".equals(role) || "ADMIN".equals(role)) {
            return AdminTabCodes.OWNER_TABS;
        }
        return userTabPermissionRepository.findByUserIdOrderByTabCodeAsc(user.getId()).stream()
                .map(UserTabPermission::getTabCode)
                .filter(AdminTabCodes.ASSIGNABLE_MEMBER_TABS::contains)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<String> replaceMemberTabs(User user, Collection<String> requestedTabs) {
        List<String> normalized = normalizeMemberTabs(requestedTabs);
        userTabPermissionRepository.deleteByUserId(user.getId());
        // Ensure delete SQL is executed before re-insert to avoid unique key conflicts.
        userTabPermissionRepository.flush();
        if (normalized.isEmpty()) {
            return normalized;
        }
        List<UserTabPermission> entities = new ArrayList<>();
        for (String code : normalized) {
            UserTabPermission entity = new UserTabPermission();
            entity.setUser(user);
            entity.setTabCode(code);
            entities.add(entity);
        }
        userTabPermissionRepository.saveAll(entities);
        userTabPermissionRepository.flush();
        return normalized;
    }

    @Override
    public List<String> normalizeMemberTabs(Collection<String> requestedTabs) {
        if (requestedTabs == null || requestedTabs.isEmpty()) {
            return List.of();
        }
        Set<String> deduplicated = new LinkedHashSet<>();
        for (String item : requestedTabs) {
            if (item == null) {
                continue;
            }
            String code = item.trim().toUpperCase(Locale.ROOT);
            if (AdminTabCodes.ASSIGNABLE_MEMBER_TABS.contains(code)) {
                deduplicated.add(code);
            }
        }
        return List.copyOf(deduplicated);
    }

    private String normalizeRole(String role) {
        return role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    }
}
