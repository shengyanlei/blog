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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors().and()
                .csrf().disable()
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                .antMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .antMatchers("/api/auth/**").permitAll()
                .antMatchers(HttpMethod.GET, "/api/articles", "/api/articles/", "/api/articles/*",
                        "/api/articles/slug/*").permitAll()
                .antMatchers(HttpMethod.GET, "/api/categories/**", "/api/tags/**").permitAll()
                .antMatchers(HttpMethod.GET, "/api/articles/*/comments").permitAll()
                .antMatchers(HttpMethod.POST, "/api/articles/*/comments").permitAll()
                .antMatchers("/uploads/**").permitAll()
                // Footprints: GET public, other operations require login
                .antMatchers(HttpMethod.GET, "/api/footprints/**").permitAll()
                .antMatchers("/api/footprints/**").authenticated()
                .antMatchers("/api/comments/**").hasRole("ADMIN")
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.POST, "/api/categories/**", "/api/tags/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/categories/**", "/api/tags/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.POST, "/api/articles/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/api/articles/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/articles/**").hasRole("ADMIN")
                .anyRequest().authenticated()
                .and()
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Global CORS: allow dev front-end (5173) and localhost/127.*.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow common local network segments so the dev server on 0.0.0.0 (including WSL/VM bridges) won't hit CORS 403.
        configuration.setAllowedOriginPatterns(
                List.of("http://localhost:*", "http://127.0.0.1:*", "http://192.168.*:*", "http://172.*:*", "http://10.*:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
