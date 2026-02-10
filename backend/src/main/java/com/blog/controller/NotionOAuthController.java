package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.article.NotionConnectionStatusResponse;
import com.blog.dto.article.NotionOAuthExchangeRequest;
import com.blog.dto.article.NotionOAuthExchangeResponse;
import com.blog.dto.article.NotionOAuthUrlResponse;
import com.blog.service.NotionOAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.security.Principal;

@RestController
@RequestMapping("/api/admin/notion")
@RequiredArgsConstructor
@Validated
@Slf4j
public class NotionOAuthController {

    private final NotionOAuthService notionOAuthService;

    @GetMapping("/oauth/url")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotionOAuthUrlResponse>> getAuthorizeUrl(
            @RequestParam(value = "owner", required = false) String owner) {
        NotionOAuthUrlResponse response = notionOAuthService.buildAuthorizeUrl(owner);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/oauth/exchange")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotionOAuthExchangeResponse>> exchange(
            @Valid @RequestBody NotionOAuthExchangeRequest request,
            Principal principal) {
        NotionOAuthExchangeResponse response = notionOAuthService.exchangeCode(
                request.getCode(), request.getState(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/connection")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotionConnectionStatusResponse>> status(Principal principal) {
        NotionConnectionStatusResponse response = notionOAuthService.getConnectionStatus(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/connection")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> disconnect(Principal principal) {
        notionOAuthService.disconnect(principal.getName());
        return ResponseEntity.ok(ApiResponse.success("ok"));
    }
}
