package com.blog.service.impl;

import com.blog.dto.travel.*;
import com.blog.entity.*;
import com.blog.repository.FootprintLocationRepository;
import com.blog.repository.TravelJourneyRepository;
import com.blog.repository.TravelPlanRepository;
import com.blog.service.TravelPlanService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TravelPlanServiceImpl implements TravelPlanService {

    private final TravelPlanRepository planRepository;
    private final TravelJourneyRepository journeyRepository;
    private final FootprintLocationRepository locationRepository;

    public TravelPlanServiceImpl(
            TravelPlanRepository planRepository,
            TravelJourneyRepository journeyRepository,
            FootprintLocationRepository locationRepository
    ) {
        this.planRepository = planRepository;
        this.journeyRepository = journeyRepository;
        this.locationRepository = locationRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TravelPlanDTO> getPlans(String status, String month) {
        TravelPlanStatus statusFilter = parseStatus(status);
        YearMonth monthFilter = parseMonth(month);
        return planRepository.findAll().stream()
                .filter(plan -> statusFilter == null || plan.getStatus() == statusFilter)
                .filter(plan -> monthFilter == null || matchMonth(plan, monthFilter))
                .sorted(byPlanOrder())
                .map(this::toPlanDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TravelPlanDTO createPlan(TravelPlanUpsertRequest request) {
        validatePlanRequest(request);
        TravelPlan plan = new TravelPlan();
        applyPlanFields(plan, request, true);
        return toPlanDTO(planRepository.save(plan));
    }

    @Override
    @Transactional
    public TravelPlanDTO updatePlan(Long id, TravelPlanUpsertRequest request) {
        validatePlanRequest(request);
        TravelPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Travel plan not found"));
        applyPlanFields(plan, request, false);
        return toPlanDTO(planRepository.save(plan));
    }

    @Override
    @Transactional
    public TravelPlanDTO updateStatus(Long id, TravelPlanStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("状态不能为空");
        }
        TravelPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Travel plan not found"));
        plan.setStatus(status);
        return toPlanDTO(planRepository.save(plan));
    }

    @Override
    @Transactional
    public void deletePlan(Long id) {
        TravelPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Travel plan not found"));
        planRepository.delete(plan);
    }

    @Override
    @Transactional
    public TravelPlanDTO completeAndArchive(Long id, CompleteAndArchiveRequest request) {
        TravelPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Travel plan not found"));
        if (!StringUtils.hasText(plan.getProvince()) || !StringUtils.hasText(plan.getCity())) {
            throw new IllegalArgumentException("计划的省份和城市不能为空");
        }

        TravelJourney journey = resolveJourneyForArchive(plan, request);
        LocalDate visitDate = resolveVisitDate(plan);

        FootprintLocation location = locationRepository.findByProvinceAndCity(plan.getProvince(), plan.getCity())
                .orElseGet(() -> {
                    FootprintLocation loc = new FootprintLocation();
                    loc.setCountry("\u4E2D\u56FD");
                    loc.setProvince(plan.getProvince());
                    loc.setCity(plan.getCity());
                    loc.setVisitCount(0);
                    loc.setPhotoCount(0);
                    return loc;
                });

        int currentVisitCount = Optional.ofNullable(location.getVisitCount()).orElse(0);
        location.setVisitCount(currentVisitCount + 1);
        if (location.getLastVisited() == null || visitDate.isAfter(location.getLastVisited())) {
            location.setLastVisited(visitDate);
        }
        location.setJourney(journey);
        locationRepository.save(location);

        plan.setStatus(TravelPlanStatus.DONE);
        plan.setLinkedJourney(journey);
        return toPlanDTO(planRepository.save(plan));
    }

    private Comparator<TravelPlan> byPlanOrder() {
        return Comparator
                .comparing((TravelPlan p) -> Optional.ofNullable(p.getStartDate()).orElse(LocalDate.MAX))
                .thenComparing(p -> Optional.ofNullable(p.getCreatedAt()).orElse(java.time.LocalDateTime.MIN), Comparator.reverseOrder());
    }

    private boolean matchMonth(TravelPlan plan, YearMonth monthFilter) {
        LocalDate reference = plan.getStartDate() != null ? plan.getStartDate() : plan.getEndDate();
        if (reference == null) {
            return false;
        }
        return YearMonth.from(reference).equals(monthFilter);
    }

    private TravelPlanStatus parseStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return null;
        }
        try {
            return TravelPlanStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("无效的计划状态: " + status);
        }
    }

    private YearMonth parseMonth(String month) {
        if (!StringUtils.hasText(month)) {
            return null;
        }
        try {
            return YearMonth.parse(month.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("month 格式错误，应为 yyyy-MM");
        }
    }

    private void validatePlanRequest(TravelPlanUpsertRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("请求体不能为空");
        }
        if (!StringUtils.hasText(request.getTitle())) {
            throw new IllegalArgumentException("计划标题不能为空");
        }
        if (!StringUtils.hasText(request.getProvince()) || !StringUtils.hasText(request.getCity())) {
            throw new IllegalArgumentException("省份和城市不能为空");
        }
        if (request.getStartDate() != null && request.getEndDate() != null && request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("开始日期不能晚于结束日期");
        }
    }

    private void applyPlanFields(TravelPlan plan, TravelPlanUpsertRequest request, boolean creating) {
        plan.setTitle(request.getTitle().trim());
        plan.setProvince(request.getProvince().trim());
        plan.setCity(request.getCity().trim());
        plan.setStartDate(request.getStartDate());
        plan.setEndDate(request.getEndDate());
        plan.setStatus(request.getStatus() != null ? request.getStatus() : (creating ? TravelPlanStatus.IDEA : plan.getStatus()));
        plan.setPriority(request.getPriority() != null ? request.getPriority() : TravelPlanPriority.MEDIUM);
        plan.setBudgetMin(request.getBudgetMin());
        plan.setBudgetMax(request.getBudgetMax());
        plan.setTags(request.getTags());
        plan.setNotes(request.getNotes());
        if (request.getLinkedJourneyId() != null) {
            TravelJourney linkedJourney = journeyRepository.findById(request.getLinkedJourneyId())
                    .orElseThrow(() -> new IllegalArgumentException("关联旅程不存在"));
            plan.setLinkedJourney(linkedJourney);
        } else {
            plan.setLinkedJourney(null);
        }
        syncTasks(plan, request.getTasks());
    }

    private void syncTasks(TravelPlan plan, List<TravelPlanTaskDTO> taskInputs) {
        plan.getTasks().clear();
        if (taskInputs == null) {
            return;
        }
        int index = 0;
        for (TravelPlanTaskDTO input : taskInputs) {
            if (input == null || !StringUtils.hasText(input.getTitle())) {
                continue;
            }
            TravelPlanTask task = new TravelPlanTask();
            task.setPlan(plan);
            task.setTitle(input.getTitle().trim());
            task.setDone(Boolean.TRUE.equals(input.getDone()));
            task.setSortOrder(input.getSortOrder() != null ? input.getSortOrder() : index);
            plan.getTasks().add(task);
            index++;
        }
    }

    private TravelJourney resolveJourneyForArchive(TravelPlan plan, CompleteAndArchiveRequest request) {
        if (request != null && request.getJourneyId() != null) {
            TravelJourney existing = journeyRepository.findById(request.getJourneyId())
                    .orElseThrow(() -> new IllegalArgumentException("关联旅程不存在"));
            if (StringUtils.hasText(request.getJourneyTitle())) {
                existing.setTitle(request.getJourneyTitle().trim());
            }
            if (StringUtils.hasText(request.getSummary())) {
                existing.setSummary(request.getSummary());
            }
            if (StringUtils.hasText(request.getContent())) {
                existing.setContent(request.getContent());
            }
            if (StringUtils.hasText(request.getCoverUrl())) {
                existing.setCoverUrl(request.getCoverUrl());
            }
            if (plan.getStartDate() != null && existing.getStartDate() == null) {
                existing.setStartDate(plan.getStartDate());
            }
            if (plan.getEndDate() != null && existing.getEndDate() == null) {
                existing.setEndDate(plan.getEndDate());
            }
            if (plan.getBudgetMin() != null && existing.getBudgetMin() == null) {
                existing.setBudgetMin(plan.getBudgetMin());
            }
            if (plan.getBudgetMax() != null && existing.getBudgetMax() == null) {
                existing.setBudgetMax(plan.getBudgetMax());
            }
            return journeyRepository.save(existing);
        }

        TravelJourney journey = new TravelJourney();
        String generatedTitle = request != null && StringUtils.hasText(request.getJourneyTitle())
                ? request.getJourneyTitle().trim()
                : plan.getTitle();
        journey.setTitle(generatedTitle);
        journey.setStartDate(plan.getStartDate());
        journey.setEndDate(plan.getEndDate());
        journey.setSummary(request != null && StringUtils.hasText(request.getSummary()) ? request.getSummary() : plan.getNotes());
        journey.setContent(request != null && StringUtils.hasText(request.getContent()) ? request.getContent() : plan.getNotes());
        journey.setCoverUrl(request != null ? request.getCoverUrl() : null);
        journey.setTags(plan.getTags());
        journey.setBudgetMin(plan.getBudgetMin());
        journey.setBudgetMax(plan.getBudgetMax());
        return journeyRepository.save(journey);
    }

    private LocalDate resolveVisitDate(TravelPlan plan) {
        if (plan.getEndDate() != null) {
            return plan.getEndDate();
        }
        if (plan.getStartDate() != null) {
            return plan.getStartDate();
        }
        return LocalDate.now();
    }

    private TravelPlanDTO toPlanDTO(TravelPlan plan) {
        TravelPlanDTO dto = new TravelPlanDTO();
        dto.setId(plan.getId());
        dto.setTitle(plan.getTitle());
        dto.setProvince(plan.getProvince());
        dto.setCity(plan.getCity());
        dto.setStartDate(plan.getStartDate());
        dto.setEndDate(plan.getEndDate());
        dto.setStatus(plan.getStatus());
        dto.setPriority(plan.getPriority());
        dto.setBudgetMin(plan.getBudgetMin());
        dto.setBudgetMax(plan.getBudgetMax());
        dto.setTags(plan.getTags());
        dto.setNotes(plan.getNotes());
        if (plan.getLinkedJourney() != null) {
            dto.setLinkedJourneyId(plan.getLinkedJourney().getId());
            dto.setLinkedJourneyTitle(plan.getLinkedJourney().getTitle());
        }
        dto.setTasks(plan.getTasks().stream()
                .sorted(Comparator.comparing(task -> Optional.ofNullable(task.getSortOrder()).orElse(0)))
                .map(task -> {
                    TravelPlanTaskDTO item = new TravelPlanTaskDTO();
                    item.setId(task.getId());
                    item.setTitle(task.getTitle());
                    item.setDone(task.getDone());
                    item.setSortOrder(task.getSortOrder());
                    return item;
                })
                .collect(Collectors.toList()));
        dto.setCreatedAt(plan.getCreatedAt());
        dto.setUpdatedAt(plan.getUpdatedAt());
        return dto;
    }
}
