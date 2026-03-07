package com.blog.repository;

import com.blog.dto.article.CategoryArticleGroupMetaDTO;
import com.blog.entity.Article;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 鏂囩珷Repository
 */
@Repository
public interface ArticleRepository extends JpaRepository<Article, Long>, JpaSpecificationExecutor<Article> {

    @Override
    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    Page<Article> findAll(Specification<Article> spec, Pageable pageable);

    /**
     * 鏍规嵁Slug鏌ユ壘鏂囩珷
     */
    Optional<Article> findBySlug(String slug);

    /**
     * 鏌ユ壘宸插彂甯冪殑鏂囩珷锛堝垎椤碉級
     * 浣跨敤@EntityGraph閬垮厤N+1闂
     */
    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' ORDER BY a.publishedAt DESC, a.id DESC")
    Page<Article> findPublishedArticles(Pageable pageable);

    /**
     * 鏍规嵁鍒嗙被ID鏌ユ壘宸插彂甯冪殑鏂囩珷锛堝垎椤碉級
     */
    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' AND a.category.id = :categoryId ORDER BY a.publishedAt DESC, a.id DESC")
    Page<Article> findPublishedArticlesByCategory(@Param("categoryId") Long categoryId, Pageable pageable);

    /**
     * 鎼滅储宸插彂甯冪殑鏂囩珷锛堟爣棰樻垨鍐呭鍖呭惈鍏抽敭璇嶏級
     */
    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' AND (a.title LIKE %:keyword% OR a.summary LIKE %:keyword% OR a.content LIKE %:keyword%) ORDER BY a.publishedAt DESC, a.id DESC")
    Page<Article> searchPublishedArticles(@Param("keyword") String keyword, Pageable pageable);

    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    @Query("SELECT a FROM Article a ORDER BY CASE WHEN a.publishedAt IS NULL THEN a.createdAt ELSE a.publishedAt END DESC, a.id DESC")
    Page<Article> findAllOrderByVisibleDate(Pageable pageable);

    @Query("SELECT new com.blog.dto.article.CategoryArticleGroupMetaDTO(" +
            "c.id, c.name, c.description, c.slugPath, c.parent.id, COUNT(a), MAX(a.publishedAt)) " +
            "FROM Article a JOIN a.category c " +
            "WHERE a.status = 'PUBLISHED' " +
            "GROUP BY c.id, c.name, c.description, c.slugPath, c.parent.id " +
            "ORDER BY MAX(a.publishedAt) DESC, c.id DESC")
    List<CategoryArticleGroupMetaDTO> findPublishedCategoryGroupMetas();

    /**
     * 鏍规嵁ID鏌ユ壘鏂囩珷骞跺姞杞藉叧鑱斿疄浣?     */
    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    Optional<Article> findWithDetailsById(Long id);

    /**
     * 鏍规嵁Slug鏌ユ壘鏂囩珷骞跺姞杞藉叧鑱斿疄浣?     */
    @EntityGraph(attributePaths = { "user", "category", "tags", "coverPhoto" })
    Optional<Article> findWithDetailsBySlug(String slug);

    /**
     * 妫€鏌ュ垎绫讳笅鏄惁瀛樺湪鏂囩珷
     */
    boolean existsByCategoryId(Long categoryId);

    /**
     * 缁熻鎸囧畾鐘舵€佺殑鏂囩珷鏁?     */
    long countByStatus(String status);

    /**
     * 璁＄畻鎬绘祻瑙堥噺
     */
    @Query("SELECT COALESCE(SUM(a.views), 0) FROM Article a")
    Long getTotalViews();

    /**
     * 鑾峰彇鐑棬鏂囩珷锛堟寜娴忚閲忔帓搴忥級
     */
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' ORDER BY a.views DESC")
    Page<Article> findTopArticlesByViews(Pageable pageable);

    /**
     * 鎸夊垎绫荤粺璁℃枃绔犳暟
     */
    @Query("SELECT c.name, COUNT(a) FROM Article a JOIN a.category c WHERE a.status = 'PUBLISHED' GROUP BY c.id, c.name")
    List<Object[]> countArticlesByCategory();

    @Query("SELECT DISTINCT a.coverPhoto.id FROM Article a WHERE a.coverPhoto IS NOT NULL")
    List<Long> findDistinctCoverPhotoIds();

    boolean existsByCoverPhotoId(Long coverPhotoId);
}
