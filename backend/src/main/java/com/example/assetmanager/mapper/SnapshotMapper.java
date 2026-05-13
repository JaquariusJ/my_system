package com.example.assetmanager.mapper;

import com.example.assetmanager.domain.MonthlySnapshot;
import com.example.assetmanager.dto.AccountSnapshotView;
import com.example.assetmanager.dto.ChartPoint;
import com.example.assetmanager.dto.DistributionPoint;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

public interface SnapshotMapper {
    List<MonthlySnapshot> findByMonth(@Param("snapshotMonth") LocalDate snapshotMonth);

    List<AccountSnapshotView> findAccountSnapshots(@Param("snapshotMonth") LocalDate snapshotMonth);

    void upsert(MonthlySnapshot snapshot);

    void delete(@Param("id") Long id);

    List<String> findSnapshotMonths();

    List<ChartPoint> findAssetLiabilityTrend(@Param("startMonth") LocalDate startMonth,
                                             @Param("endMonth") LocalDate endMonth);

    List<ChartPoint> findInvestmentTypeTrend(@Param("startMonth") LocalDate startMonth,
                                             @Param("endMonth") LocalDate endMonth,
                                             @Param("assetCategory") String assetCategory);

    List<ChartPoint> findRiskTrend(@Param("startMonth") LocalDate startMonth,
                                   @Param("endMonth") LocalDate endMonth,
                                   @Param("assetCategory") String assetCategory);

    List<DistributionPoint> findInvestmentTypeDistribution(@Param("snapshotMonth") LocalDate snapshotMonth,
                                                           @Param("assetCategory") String assetCategory);

    List<DistributionPoint> findRiskDistribution(@Param("snapshotMonth") LocalDate snapshotMonth,
                                                 @Param("assetCategory") String assetCategory);
}
