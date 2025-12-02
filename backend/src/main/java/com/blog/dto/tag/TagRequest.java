package com.blog.dto.tag;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 标签创建请求DTO
 */
@Data
public class TagRequest {

    @NotBlank(message = "标签名称不能为空")
    private String name;
}
