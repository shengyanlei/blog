package com.blog.dto.tag;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 标签DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TagDTO {

    private Long id;
    private String name;
}
