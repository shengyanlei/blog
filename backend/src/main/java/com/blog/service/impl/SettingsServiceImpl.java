package com.blog.service.impl;

import com.blog.dto.settings.ChangePasswordRequest;
import com.blog.dto.settings.AdminProfileResponse;
import com.blog.dto.settings.SiteConfigDTO;
import com.blog.dto.settings.SiteConfigResponse;
import com.blog.entity.User;
import com.blog.exception.BusinessException;
import com.blog.repository.UserRepository;
import com.blog.service.SettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

import javax.validation.ConstraintViolation;
import javax.validation.Validator;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileTime;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsServiceImpl implements SettingsService {

    private static final DateTimeFormatter BACKUP_TS_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;
    private final ObjectMapper objectMapper;

    @Value("${app.site-config.path:}")
    private String siteConfigPath;

    @Value("${app.site-config.backup-dir:}")
    private String backupDir;

    @Value("${app.site-config.max-backups:20}")
    private int maxBackups;

    @Override
    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect", HttpStatus.BAD_REQUEST);
        }
        if (!Objects.equals(request.getNewPassword(), request.getConfirmPassword())) {
            throw new BusinessException("Confirm password does not match", HttpStatus.BAD_REQUEST);
        }
        if (request.getNewPassword().length() < 8) {
            throw new BusinessException("New password must be at least 8 characters", HttpStatus.BAD_REQUEST);
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessException("New password must be different from current password", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password updated for user: {}", username);
    }

    @Override
    public AdminProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
        return new AdminProfileResponse(user.getUsername(), user.getRole(), user.getEmail());
    }

    @Override
    public SiteConfigResponse getSiteConfig() {
        try {
            Path path = resolveSiteConfigPath();
            SiteConfigDTO config = loadConfig(path);
            return buildResponse(path, config, null);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to load site config", ex);
            throw new BusinessException("Failed to load site config: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public SiteConfigResponse updateSiteConfig(SiteConfigDTO request) {
        try {
            validateSiteConfig(request);
            Path path = resolveSiteConfigPath();

            String yamlContent = toYaml(request);
            String backupPath = backupCurrentFile(path);
            writeAtomically(path, yamlContent);

            SiteConfigDTO reloaded = loadConfig(path);
            return buildResponse(path, reloaded, backupPath);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to save site config", ex);
            throw new BusinessException("Failed to save site config: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private SiteConfigResponse buildResponse(Path path, SiteConfigDTO config, String backupPath) {
        String lastModified = null;
        try {
            if (Files.exists(path)) {
                lastModified = Files.getLastModifiedTime(path).toInstant().toString();
            }
        } catch (IOException ex) {
            log.warn("Failed to read lastModified for {}", path, ex);
        }

        return new SiteConfigResponse(
                config,
                path.toAbsolutePath().normalize().toString(),
                lastModified,
                isWritable(path),
                backupPath
        );
    }

    private SiteConfigDTO loadConfig(Path path) {
        if (!Files.exists(path)) {
            throw new BusinessException("Site config file not found: " + path.toAbsolutePath(), HttpStatus.NOT_FOUND);
        }
        try {
            String content = Files.readString(path, StandardCharsets.UTF_8);
            Yaml yaml = new Yaml();
            Object loaded = yaml.load(content);
            if (!(loaded instanceof Map)) {
                throw new BusinessException("Site config YAML format is invalid", HttpStatus.BAD_REQUEST);
            }

            SiteConfigDTO config = objectMapper.convertValue(loaded, SiteConfigDTO.class);
            validateSiteConfig(config);
            return config;
        } catch (BusinessException ex) {
            throw ex;
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Site config format is invalid: " + ex.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (IOException ex) {
            throw new BusinessException("Failed to read site config file", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String toYaml(SiteConfigDTO config) {
        StringBuilder sb = new StringBuilder(4096);

        sb.append("site:\n");
        sb.append("  meta:\n");
        appendKv(sb, 4, "title", config.getSite().getMeta().getTitle());
        appendKv(sb, 4, "subtitle", config.getSite().getMeta().getSubtitle());

        sb.append("  brand:\n");
        appendKv(sb, 4, "navName", config.getSite().getBrand().getNavName());
        appendKv(sb, 4, "heroEyebrow", config.getSite().getBrand().getHeroEyebrow());
        appendKv(sb, 4, "heroTitle", config.getSite().getBrand().getHeroTitle());
        appendKv(sb, 4, "heroDescription", config.getSite().getBrand().getHeroDescription());
        appendKv(sb, 4, "footerText", config.getSite().getBrand().getFooterText());
        sb.append("    navLabels:\n");
        appendKv(sb, 6, "home", config.getSite().getBrand().getNavLabels().getHome());
        appendKv(sb, 6, "about", config.getSite().getBrand().getNavLabels().getAbout());
        appendKv(sb, 6, "archive", config.getSite().getBrand().getNavLabels().getArchive());
        appendKv(sb, 6, "admin", config.getSite().getBrand().getNavLabels().getAdmin());

        sb.append("  profile:\n");
        appendKv(sb, 4, "name", config.getSite().getProfile().getName());
        appendKv(sb, 4, "initials", config.getSite().getProfile().getInitials());
        appendKv(sb, 4, "role", config.getSite().getProfile().getRole());
        appendKv(sb, 4, "bio", config.getSite().getProfile().getBio());
        appendKv(sb, 4, "location", config.getSite().getProfile().getLocation());
        appendKv(sb, 4, "expertise", config.getSite().getProfile().getExpertise());
        appendKv(sb, 4, "email", config.getSite().getProfile().getEmail());
        appendStringList(sb, 4, "tags", config.getSite().getProfile().getTags());
        appendKv(sb, 4, "avatarUrl", config.getSite().getProfile().getAvatarUrl());

        sb.append("\n");
        sb.append("about:\n");
        appendKv(sb, 2, "heading", config.getAbout().getHeading());
        appendKv(sb, 2, "intro", config.getAbout().getIntro());
        appendKv(sb, 2, "ctaArchive", config.getAbout().getCtaArchive());
        appendKv(sb, 2, "ctaContact", config.getAbout().getCtaContact());
        appendKv(sb, 2, "focusTitle", config.getAbout().getFocusTitle());
        appendFocusAreas(sb, 2, "focusAreas", config.getAbout().getFocusAreas());
        appendKv(sb, 2, "principlesTitle", config.getAbout().getPrinciplesTitle());
        appendStringList(sb, 2, "principles", config.getAbout().getPrinciples());
        appendKv(sb, 2, "nowTitle", config.getAbout().getNowTitle());
        appendStringList(sb, 2, "nowList", config.getAbout().getNowList());
        appendKv(sb, 2, "timelineTitle", config.getAbout().getTimelineTitle());
        appendTimeline(sb, 2, "timeline", config.getAbout().getTimeline());

        return sb.toString();
    }

    private void appendKv(StringBuilder sb, int indent, String key, String value) {
        sb.append(" ".repeat(indent))
                .append(key)
                .append(": ")
                .append(quoteYaml(value))
                .append('\n');
    }

    private void appendStringList(StringBuilder sb, int indent, String key, List<String> values) {
        sb.append(" ".repeat(indent)).append(key).append(":\n");
        for (String value : values) {
            sb.append(" ".repeat(indent + 2))
                    .append("- ")
                    .append(quoteYaml(value))
                    .append('\n');
        }
    }

    private void appendFocusAreas(StringBuilder sb, int indent, String key, List<SiteConfigDTO.FocusArea> values) {
        sb.append(" ".repeat(indent)).append(key).append(":\n");
        for (SiteConfigDTO.FocusArea value : values) {
            sb.append(" ".repeat(indent + 2)).append("- title: ").append(quoteYaml(value.getTitle())).append('\n');
            sb.append(" ".repeat(indent + 4)).append("description: ").append(quoteYaml(value.getDescription())).append('\n');
        }
    }

    private void appendTimeline(StringBuilder sb, int indent, String key, List<SiteConfigDTO.TimelineItem> values) {
        sb.append(" ".repeat(indent)).append(key).append(":\n");
        for (SiteConfigDTO.TimelineItem value : values) {
            sb.append(" ".repeat(indent + 2)).append("- year: ").append(quoteYaml(value.getYear())).append('\n');
            sb.append(" ".repeat(indent + 4)).append("title: ").append(quoteYaml(value.getTitle())).append('\n');
            sb.append(" ".repeat(indent + 4)).append("note: ").append(quoteYaml(value.getNote())).append('\n');
        }
    }

    private String quoteYaml(String value) {
        String normalized = value == null ? "" : value;
        normalized = normalized.replace("\r\n", " ").replace('\n', ' ').replace('\r', ' ').trim();
        normalized = normalized.replace("\\", "\\\\").replace("\"", "\\\"");
        return "\"" + normalized + "\"";
    }

    private String backupCurrentFile(Path path) {
        if (!Files.exists(path)) {
            return null;
        }

        Path backupDirectory = resolveBackupDirectory(path);
        try {
            Files.createDirectories(backupDirectory);
            String fileName = "application-" + LocalDateTime.now(ZoneId.systemDefault()).format(BACKUP_TS_FORMAT) + ".yml.bak";
            Path backupPath = backupDirectory.resolve(fileName);
            Files.copy(path, backupPath, StandardCopyOption.REPLACE_EXISTING);
            pruneOldBackups(backupDirectory);
            return backupPath.toAbsolutePath().normalize().toString();
        } catch (IOException ex) {
            throw new BusinessException("Failed to create config backup: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void pruneOldBackups(Path backupDirectory) throws IOException {
        int keepCount = Math.max(1, maxBackups);

        List<Path> backupFiles;
        try (Stream<Path> stream = Files.list(backupDirectory)) {
            backupFiles = stream
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".bak"))
                    .sorted(Comparator.comparing(this::safeLastModified).reversed())
                    .collect(Collectors.toList());
        }

        if (backupFiles.size() <= keepCount) {
            return;
        }

        List<Path> toDelete = new ArrayList<>(backupFiles.subList(keepCount, backupFiles.size()));
        for (Path path : toDelete) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ex) {
                log.warn("Failed to delete old backup file: {}", path, ex);
            }
        }
    }

    private FileTime safeLastModified(Path path) {
        try {
            return Files.getLastModifiedTime(path);
        } catch (IOException ex) {
            return FileTime.fromMillis(0);
        }
    }

    private void writeAtomically(Path target, String content) {
        Path normalizedTarget = target.toAbsolutePath().normalize();
        Path parent = normalizedTarget.getParent();
        if (parent == null) {
            throw new BusinessException("Invalid site config path: " + normalizedTarget, HttpStatus.BAD_REQUEST);
        }

        try {
            Files.createDirectories(parent);
            Path tempFile = Files.createTempFile(parent, "application-", ".yml.tmp");
            try {
                Files.writeString(
                        tempFile,
                        content,
                        StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE,
                        StandardOpenOption.TRUNCATE_EXISTING,
                        StandardOpenOption.WRITE
                );

                try {
                    Files.move(tempFile, normalizedTarget, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
                } catch (AtomicMoveNotSupportedException ex) {
                    Files.move(tempFile, normalizedTarget, StandardCopyOption.REPLACE_EXISTING);
                }
            } finally {
                Files.deleteIfExists(tempFile);
            }
        } catch (IOException ex) {
            throw new BusinessException("Failed to write site config file: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Path resolveSiteConfigPath() {
        if (siteConfigPath != null && !siteConfigPath.isBlank()) {
            try {
                return Path.of(siteConfigPath.trim()).toAbsolutePath().normalize();
            } catch (InvalidPathException ex) {
                throw new BusinessException("Invalid app.site-config.path: " + siteConfigPath, HttpStatus.BAD_REQUEST);
            }
        }

        List<Path> candidates = List.of(
                Path.of("../apps/spa/public/application.yml"),
                Path.of("apps/spa/public/application.yml"),
                Path.of("../apps/spa/dist/application.yml"),
                Path.of("apps/spa/dist/application.yml"));

        for (Path candidate : candidates) {
            Path normalized = candidate.toAbsolutePath().normalize();
            if (Files.exists(normalized)) {
                log.info("Auto-detected site config path: {}", normalized);
                return normalized;
            }
        }

        throw new BusinessException(
                "app.site-config.path is not configured and no default application.yml was found",
                HttpStatus.BAD_REQUEST);
    }

    private Path resolveBackupDirectory(Path siteConfigFilePath) {
        if (backupDir != null && !backupDir.isBlank()) {
            try {
                return Path.of(backupDir.trim()).toAbsolutePath().normalize();
            } catch (InvalidPathException ex) {
                throw new BusinessException("Invalid app.site-config.backup-dir: " + backupDir, HttpStatus.BAD_REQUEST);
            }
        }
        Path parent = siteConfigFilePath.toAbsolutePath().normalize().getParent();
        return parent == null ? Path.of(".").toAbsolutePath().normalize() : parent;
    }

    private boolean isWritable(Path path) {
        if (Files.exists(path)) {
            return Files.isWritable(path);
        }
        Path parent = path.toAbsolutePath().normalize().getParent();
        return parent != null && Files.isWritable(parent);
    }

    private void validateSiteConfig(SiteConfigDTO config) {
        Set<ConstraintViolation<SiteConfigDTO>> violations = validator.validate(config);
        if (violations.isEmpty()) {
            return;
        }
        String message = violations.stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .sorted()
                .findFirst()
                .orElse("Site config validation failed");
        throw new BusinessException(message, HttpStatus.BAD_REQUEST);
    }
}
