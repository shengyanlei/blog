package com.blog.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 业务异常类
 */
@Getter
public class BusinessException extends RuntimeException {
    private final HttpStatus status;

    public BusinessException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
