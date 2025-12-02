package com.blog.dto.category;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 分类创建/更新请求DTO
 */
@Data
public class CategoryRequest {

    @NotBlank(message = "分类名称不能为空")
    private String name;

    private String description;
}
