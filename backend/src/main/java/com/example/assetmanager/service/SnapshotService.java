package com.example.assetmanager.service;

import com.example.assetmanager.domain.AssetCategory;
import com.example.assetmanager.domain.MonthlySnapshot;
import com.example.assetmanager.dto.AccountSnapshotView;
import com.example.assetmanager.dto.ChartPoint;
import com.example.assetmanager.dto.DistributionPoint;
import com.example.assetmanager.dto.SnapshotRequest;
import com.example.assetmanager.dto.SummaryResponse;
import com.example.assetmanager.mapper.SnapshotMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class SnapshotService {
    private final SnapshotMapper snapshotMapper;

    public SnapshotService(SnapshotMapper snapshotMapper) {
        this.snapshotMapper = snapshotMapper;
    }

    public List<AccountSnapshotView> accountSnapshots(String month) {
        return snapshotMapper.findAccountSnapshots(MonthParser.parse(month));
    }

    public MonthlySnapshot save(SnapshotRequest request) {
        MonthlySnapshot snapshot = new MonthlySnapshot();
        snapshot.setAccountId(request.getAccountId());
        snapshot.setSnapshotMonth(MonthParser.parse(request.getMonth()));
        snapshot.setAmount(request.getAmount());
        snapshot.setNote(request.getNote());
        snapshotMapper.upsert(snapshot);
        return snapshot;
    }

    public void saveBatch(List<SnapshotRequest> requests) {
        for (SnapshotRequest request : requests) {
            save(request);
        }
    }

    public SummaryResponse summary(String month) {
        List<AccountSnapshotView> accounts = accountSnapshots(month);
        BigDecimal totalAssets = BigDecimal.ZERO;
        BigDecimal totalLiabilities = BigDecimal.ZERO;
        for (AccountSnapshotView item : accounts) {
            BigDecimal amount = item.getAmount() == null ? BigDecimal.ZERO : item.getAmount();
            if (item.getAssetCategory() == AssetCategory.ASSET) {
                totalAssets = totalAssets.add(amount);
            } else {
                totalLiabilities = totalLiabilities.add(amount);
            }
        }

        SummaryResponse response = new SummaryResponse();
        response.setMonth(month);
        response.setTotalAssets(totalAssets);
        response.setTotalLiabilities(totalLiabilities);
        response.setNetAssets(totalAssets.subtract(totalLiabilities));
        response.setAccounts(accounts);
        return response;
    }

    public List<String> months() {
        return snapshotMapper.findSnapshotMonths();
    }

    public List<ChartPoint> assetLiabilityTrend(String startMonth, String endMonth) {
        return snapshotMapper.findAssetLiabilityTrend(MonthParser.parse(startMonth), MonthParser.parse(endMonth));
    }

    public List<ChartPoint> investmentTypeTrend(String startMonth, String endMonth, String assetCategory) {
        return snapshotMapper.findInvestmentTypeTrend(
                MonthParser.parse(startMonth),
                MonthParser.parse(endMonth),
                normalizeCategory(assetCategory)
        );
    }

    public List<ChartPoint> riskTrend(String startMonth, String endMonth, String assetCategory) {
        return snapshotMapper.findRiskTrend(
                MonthParser.parse(startMonth),
                MonthParser.parse(endMonth),
                normalizeCategory(assetCategory)
        );
    }

    public List<DistributionPoint> investmentTypeDistribution(String month, String assetCategory) {
        return snapshotMapper.findInvestmentTypeDistribution(MonthParser.parse(month), normalizeCategory(assetCategory));
    }

    public List<DistributionPoint> riskDistribution(String month, String assetCategory) {
        return snapshotMapper.findRiskDistribution(MonthParser.parse(month), normalizeCategory(assetCategory));
    }

    private String normalizeCategory(String assetCategory) {
        return assetCategory == null || assetCategory.isBlank() || "ALL".equalsIgnoreCase(assetCategory)
                ? null
                : assetCategory;
    }
}
