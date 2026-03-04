package com.blog.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.ExpressionUrlAuthorizationConfigurer;
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

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.auth.public-register-enabled:true}")
    private boolean publicRegisterEnabled;

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
        ExpressionUrlAuthorizationConfigurer<HttpSecurity>.ExpressionInterceptUrlRegistry authorizeRequests = http
                .cors().and()
                .csrf().disable()
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                .antMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .antMatchers(HttpMethod.POST, "/api/auth/login").permitAll();

        if (publicRegisterEnabled) {
            authorizeRequests.antMatchers(HttpMethod.POST, "/api/auth/register").permitAll();
        } else {
            authorizeRequests.antMatchers(HttpMethod.POST, "/api/auth/register").denyAll();
        }

        authorizeRequests
                .antMatchers(HttpMethod.GET, "/api/articles", "/api/articles/", "/api/articles/*",
                        "/api/articles/slug/*").permitAll()
                .antMatchers(HttpMethod.GET, "/api/categories/**", "/api/tags/**").permitAll()
                .antMatchers(HttpMethod.GET, "/api/articles/*/comments").permitAll()
                .antMatchers(HttpMethod.POST, "/api/articles/*/comments").permitAll()
                .antMatchers("/uploads/**").permitAll()
                // Journeys: GET public, other operations require login
                .antMatchers(HttpMethod.GET, "/api/journeys/**").permitAll()
                .antMatchers("/api/journeys/**").authenticated()
                .antMatchers("/api/materials/**").authenticated()
                .antMatchers("/api/cover-materials/**").authenticated()
                // Travel plans are private
                .antMatchers("/api/travel-plans/**").authenticated()
                // Footprints: GET public, other operations require login
                .antMatchers(HttpMethod.GET, "/api/footprints/**").permitAll()
                .antMatchers("/api/footprints/**").authenticated()
                .antMatchers("/api/comments/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers("/api/admin/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers(HttpMethod.POST, "/api/categories/**", "/api/tags/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers(HttpMethod.PUT, "/api/categories/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers(HttpMethod.DELETE, "/api/categories/**", "/api/tags/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers(HttpMethod.POST, "/api/articles/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers(HttpMethod.PUT, "/api/articles/**").hasAnyRole("ADMIN", "OWNER")
                .antMatchers(HttpMethod.DELETE, "/api/articles/**").hasAnyRole("ADMIN", "OWNER")
                .anyRequest().authenticated();

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Global CORS: allow configured front-end origin and common local development networks.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOriginPatterns = new java.util.ArrayList<>(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://192.168.*:*",
                "http://172.*:*",
                "http://10.*:*"));
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            allowedOriginPatterns.add(frontendUrl.trim());
        }
        configuration.setAllowedOriginPatterns(allowedOriginPatterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
