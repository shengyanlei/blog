package com.blog.service.impl;

import com.blog.dto.auth.AuthResponse;
import com.blog.dto.auth.LoginRequest;
import com.blog.dto.auth.RegisterRequest;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.UserRepository;
import com.blog.service.AuthService;
import com.blog.service.UserPermissionService;
import com.blog.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserPermissionService userPermissionService;

    @Override
    public AuthResponse login(LoginRequest request) {
        log.info("User login attempt: {}", request.getUsername());

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException("Invalid username or password", HttpStatus.UNAUTHORIZED));

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new BusinessException("Account is disabled", HttpStatus.FORBIDDEN);
        }

        boolean passwordMatched;
        try {
            passwordMatched = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        } catch (Exception ex) {
            passwordMatched = false;
        }

        if (!passwordMatched) {
            throw new BusinessException("Invalid username or password", HttpStatus.UNAUTHORIZED);
        }

        String token = jwtUtil.generateToken(user.getUsername());
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getEnabled(),
                userPermissionService.resolveVisibleTabs(user));

        return new AuthResponse(token, userInfo);
    }

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        log.info("User register attempt: {}", request.getUsername());

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new BusinessException("Username already exists");
        }

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("MEMBER");
        user.setEnabled(true);

        userRepository.save(user);
        log.info("User registered: {}", user.getId());
    }
}
