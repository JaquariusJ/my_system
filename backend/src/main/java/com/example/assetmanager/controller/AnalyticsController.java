package com.example.assetmanager.controller;

import com.example.assetmanager.dto.ChartPoint;
import com.example.assetmanager.dto.DistributionPoint;
import com.example.assetmanager.service.SnapshotService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final SnapshotService snapshotService;

    public AnalyticsController(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @GetMapping("/trend/category")
    public List<ChartPoint> assetLiabilityTrend(@RequestParam String startMonth,
                                                @RequestParam String endMonth) {
        return snapshotService.assetLiabilityTrend(startMonth, endMonth);
    }

    @GetMapping("/trend/investment-type")
    public List<ChartPoint> investmentTypeTrend(@RequestParam String startMonth,
                                                @RequestParam String endMonth,
                                                @RequestParam(required = false) String assetCategory) {
        return snapshotService.investmentTypeTrend(startMonth, endMonth, assetCategory);
    }

    @GetMapping("/trend/risk")
    public List<ChartPoint> riskTrend(@RequestParam String startMonth,
                                      @RequestParam String endMonth,
                                      @RequestParam(required = false) String assetCategory) {
        return snapshotService.riskTrend(startMonth, endMonth, assetCategory);
    }

    @GetMapping("/distribution/investment-type")
    public List<DistributionPoint> investmentTypeDistribution(@RequestParam String month,
                                                              @RequestParam(required = false) String assetCategory) {
        return snapshotService.investmentTypeDistribution(month, assetCategory);
    }

    @GetMapping("/distribution/risk")
    public List<DistributionPoint> riskDistribution(@RequestParam String month,
                                                    @RequestParam(required = false) String assetCategory) {
        return snapshotService.riskDistribution(month, assetCategory);
    }
}
