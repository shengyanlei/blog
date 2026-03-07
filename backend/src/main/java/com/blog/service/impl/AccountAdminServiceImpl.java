package com.blog.service.impl;

import com.blog.dto.account.*;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.UserRepository;
import com.blog.repository.UserTabPermissionRepository;
import com.blog.security.AdminTabCodes;
import com.blog.service.AccountAdminService;
import com.blog.service.UserPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountAdminServiceImpl implements AccountAdminService {

    private static final String OWNER_USERNAME = "shyl";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserPermissionService userPermissionService;
    private final UserTabPermissionRepository userTabPermissionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AccountSummaryDTO> listAccounts(String operatorUsername) {
        assertOwnerOperator(operatorUsername);
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AccountSummaryDTO createAccount(String operatorUsername, AccountCreateRequest request) {
        assertOwnerOperator(operatorUsername);

        String username = normalizeRequired(request.getUsername(), "username");
        String email = normalizeRequired(request.getEmail(), "email");

        if (OWNER_USERNAME.equalsIgnoreCase(username)) {
            throw new BusinessException("Reserved username is not allowed", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByUsername(username)) {
            throw new BusinessException("Username already exists", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException("Email already exists", HttpStatus.CONFLICT);
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setRole("MEMBER");
        user.setEnabled(request.getEnabled() == null || request.getEnabled());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        User saved = userRepository.save(user);
        userPermissionService.replaceMemberTabs(saved, request.getTabCodes());
        return toSummary(saved);
    }

    @Override
    @Transactional
    public AccountSummaryDTO updateAccount(String operatorUsername, Long userId, AccountUpdateRequest request) {
        assertOwnerOperator(operatorUsername);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
        assertNotOwnerTarget(target);

        String email = normalizeRequired(request.getEmail(), "email");
        if (userRepository.existsByEmailAndIdNot(email, target.getId())) {
            throw new BusinessException("Email already exists", HttpStatus.CONFLICT);
        }

        target.setEmail(email);
        target.setRole("MEMBER");
        if (request.getEnabled() != null) {
            target.setEnabled(request.getEnabled());
        }
        User saved = userRepository.save(target);
        userPermissionService.replaceMemberTabs(saved, request.getTabCodes());
        return toSummary(saved);
    }

    @Override
    @Transactional
    public AccountSummaryDTO updateAccountEnabled(String operatorUsername, Long userId, boolean enabled) {
        assertOwnerOperator(operatorUsername);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
        assertNotOwnerTarget(target);
        target.setEnabled(enabled);
        User saved = userRepository.save(target);
        return toSummary(saved);
    }

    @Override
    @Transactional
    public void resetPassword(String operatorUsername, Long userId, AccountPasswordResetRequest request) {
        assertOwnerOperator(operatorUsername);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
        assertNotOwnerTarget(target);
        if (!Objects.equals(request.getNewPassword(), request.getConfirmPassword())) {
            throw new BusinessException("Confirm password does not match", HttpStatus.BAD_REQUEST);
        }
        if (request.getNewPassword().length() < 8) {
            throw new BusinessException("Password must be at least 8 characters", HttpStatus.BAD_REQUEST);
        }
        target.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(target);
    }

    @Override
    @Transactional
    public void deleteAccount(String operatorUsername, Long userId) {
        assertOwnerOperator(operatorUsername);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
        assertNotOwnerTarget(target);
        userTabPermissionRepository.deleteByUserId(target.getId());
        userRepository.delete(target);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountPermissionOptionDTO> getPermissionOptions(String operatorUsername) {
        assertOwnerOperator(operatorUsername);
        return AdminTabCodes.ASSIGNABLE_MEMBER_TABS.stream()
                .map(this::toPermissionOption)
                .collect(Collectors.toList());
    }

    private AccountSummaryDTO toSummary(User user) {
        AccountSummaryDTO dto = new AccountSummaryDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setEnabled(user.getEnabled());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setTabCodes(userPermissionService.resolveVisibleTabs(user));
        return dto;
    }

    private AccountPermissionOptionDTO toPermissionOption(String code) {
        String label;
        String description;
        switch (code) {
            case AdminTabCodes.DASHBOARD:
                label = "仪表盘";
                description = "后台概览统计";
                break;
            case AdminTabCodes.ARTICLES:
                label = "文章管理";
                description = "文章列表与发布状态管理";
                break;
            case AdminTabCodes.WRITE:
                label = "写文章";
                description = "创建和编辑文章";
                break;
            case AdminTabCodes.UPLOAD:
                label = "上传文章";
                description = "Notion/内容导入";
                break;
            case AdminTabCodes.COMMENTS:
                label = "评论管理";
                description = "评论审核与处理";
                break;
            case AdminTabCodes.TAGS:
                label = "标签管理";
                description = "标签维护";
                break;
            case AdminTabCodes.CATEGORIES:
                label = "分类管理";
                description = "分类维护";
                break;
            case AdminTabCodes.COVER_MATERIALS:
                label = "素材池";
                description = "仅用于文章封面的素材管理";
                break;
            default:
                label = code;
                description = "自定义权限";
                break;
        }
        return new AccountPermissionOptionDTO(code, label, description);
    }

    private void assertOwnerOperator(String operatorUsername) {
        User operator = userRepository.findByUsername(operatorUsername)
                .orElseThrow(() -> new BusinessException("Operator not found", HttpStatus.FORBIDDEN));
        String role = operator.getRole() == null ? "" : operator.getRole().trim().toUpperCase(Locale.ROOT);
        boolean isOwnerRole = "OWNER".equals(role) || "ADMIN".equals(role);
        if (!isOwnerRole || !OWNER_USERNAME.equalsIgnoreCase(operator.getUsername())) {
            throw new BusinessException("Forbidden", HttpStatus.FORBIDDEN);
        }
    }

    private void assertNotOwnerTarget(User target) {
        if (OWNER_USERNAME.equalsIgnoreCase(target.getUsername())) {
            throw new BusinessException("Owner account cannot be modified", HttpStatus.CONFLICT);
        }
    }

    private String normalizeRequired(String value, String field) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException(field + " is required", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }
}
