package com.blog.service;

import com.blog.dto.article.NotionConnectionStatusResponse;
import com.blog.dto.article.NotionOAuthExchangeResponse;
import com.blog.dto.article.NotionOAuthUrlResponse;

public interface NotionOAuthService {

    NotionOAuthUrlResponse buildAuthorizeUrl(String ownerType);

    NotionOAuthExchangeResponse exchangeCode(String code, String state, String username);

    NotionConnectionStatusResponse getConnectionStatus(String username);

    void disconnect(String username);
}
