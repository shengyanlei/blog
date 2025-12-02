package com.blog.service;

import com.blog.dto.auth.AuthResponse;
import com.blog.dto.auth.LoginRequest;
import com.blog.dto.auth.RegisterRequest;

/**
 * 认证服务接口
 */
public interface AuthService {

    /**
     * 用户登录
     * 
     * @param request 登录请求
     * @return 认证响应（包含token和用户信息）
     */
    AuthResponse login(LoginRequest request);

    /**
     * 用户注册
     * 
     * @param request 注册请求
     */
    void register(RegisterRequest request);
}
