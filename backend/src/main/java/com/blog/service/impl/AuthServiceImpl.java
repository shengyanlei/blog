package com.blog.service.impl;

import com.blog.dto.auth.AuthResponse;
import com.blog.dto.auth.LoginRequest;
import com.blog.dto.auth.RegisterRequest;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.UserRepository;
import com.blog.service.AuthService;
import com.blog.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 认证服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public AuthResponse login(LoginRequest request) {
        log.info("用户登录: {}", request.getUsername());

        // 查找用户
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException("用户名或密码错误"));

        // 校验密码
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("用户名或密码错误");
        }

        // 生成JWT token
        String token = jwtUtil.generateToken(user.getUsername());

        // 构建响应
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                user.getId(),
                user.getUsername(),
                user.getRole());

        return new AuthResponse(token, userInfo);
    }

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        log.info("用户注册: {}", request.getUsername());

        // 检查用户名是否已存在
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new BusinessException("用户名已存在");
        }

        // 检查邮箱是否已存在
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("邮箱已被使用");
        }

        // 创建新用户
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");

        userRepository.save(user);

        log.info("用户注册成功: {}", user.getId());
    }
}
