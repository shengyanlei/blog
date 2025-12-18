package com.blog.config;

import com.blog.entity.FootprintLocation;
import com.blog.entity.FootprintPhoto;
import com.blog.repository.FootprintLocationRepository;
import com.blog.repository.FootprintPhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class FootprintDataInitializer implements CommandLineRunner {

    private final FootprintLocationRepository locationRepository;
    private final FootprintPhotoRepository photoRepository;

    @Override
    public void run(String... args) {
        if (locationRepository.count() > 0) {
            return;
        }
        FootprintLocation sz = new FootprintLocation();
        sz.setProvince("广东");
        sz.setCity("深圳");
        sz.setVisitCount(5);
        sz.setLastVisited(LocalDate.now().minusDays(20));
        sz.setTags("海边,科技");
        sz = locationRepository.save(sz);

        FootprintPhoto photo = new FootprintPhoto();
        photo.setLocation(sz);
        photo.setUrl("https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=1200&auto=format&fit=crop&q=80");
        photo.setTrip("湾区夜跑");
        photo.setShotAt(LocalDate.now().minusDays(20));
        photoRepository.save(photo);

        sz.setPhotoCount(1);
        locationRepository.save(sz);

        FootprintLocation hz = new FootprintLocation();
        hz.setProvince("浙江");
        hz.setCity("杭州");
        hz.setVisitCount(3);
        hz.setLastVisited(LocalDate.now().minusMonths(2));
        hz.setTags("西湖,咖啡");
        locationRepository.save(hz);

        log.info("Seeded sample footprint data (深圳/杭州)");
    }
}
