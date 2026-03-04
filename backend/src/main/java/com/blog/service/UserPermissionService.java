package com.blog.service;

import com.blog.entity.User;

import java.util.Collection;
import java.util.List;

public interface UserPermissionService {

    List<String> resolveVisibleTabs(User user);

    List<String> replaceMemberTabs(User user, Collection<String> requestedTabs);

    List<String> normalizeMemberTabs(Collection<String> requestedTabs);
}
