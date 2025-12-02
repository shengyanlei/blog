package com.blog.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 配置类
 */
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * 密码加密器
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * 认证管理器
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * Security 过滤链配置
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 禁用 CSRF（API 模式）
                .csrf().disable()

                // Session 管理：无状态
                .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()

                // 请求授权配置
                .authorizeRequests()
                // 认证相关接口：公开
                .antMatchers("/api/auth/**").permitAll()
                // 文章查询接口：公开
                .antMatchers(HttpMethod.GET, "/api/articles/**").permitAll()
                // 分类和标签查询：公开
                .antMatchers(HttpMethod.GET, "/api/categories/**", "/api/tags/**").permitAll()
                // 评论查询和发表：公开
                .antMatchers(HttpMethod.GET, "/api/articles/*/comments").permitAll()
                .antMatchers(HttpMethod.POST, "/api/articles/*/comments").permitAll()
                // 评论管理：需要 ADMIN 角色
                .antMatchers("/api/comments/**").hasRole("ADMIN")
                // 管理员接口：需要 ADMIN 角色
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                // 分类标签写操作：需要 ADMIN 角色
                .antMatchers(HttpMethod.POST, "/api/categories/**", "/api/tags/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/categories/**", "/api/tags/**").hasRole("ADMIN")
                // 文章写操作：需要 ADMIN 角色
                .antMatchers(HttpMethod.POST, "/api/articles/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/api/articles/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/articles/**").hasRole("ADMIN")
                // 其他请求：需要认证
                .anyRequest().authenticated()
                .and()

                // 添加 JWT 过滤器
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
